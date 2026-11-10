package bo.asistentelex.juridico.application;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import bo.asistentelex.juridico.application.ports.out.AdministrationPorts.*;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.Passwords;
import bo.asistentelex.juridico.domain.Administration.*;
import bo.asistentelex.juridico.domain.Identity.*;

public final class AdministrationService {
	public static final Set<String> EVENT_TYPES = Set.of("LOGIN", "LOGIN_FAILED", "LOGOUT", "ACCESS_DENIED", "PASSWORD_CHANGED", "ADMIN_CHANGE", "AGENT_ACTION", "AI_ACTION");
	private final Store store;
	private final Events events;
	private final Passwords passwords;
	private final AuthService auth;
	private final Clock clock;

	public AdministrationService(Store store, Events events, Passwords passwords, AuthService auth, Clock clock) {
		this.store = store; this.events = events; this.passwords = passwords; this.auth = auth; this.clock = clock;
	}

	public Page<Lawyer> accounts(User actor, int first, String after) {
		requireAdmin(actor);
		pageSize(first);
		String email = "";
		if (after != null) {
			try {
				if (after.length() > 1024) throw new IllegalArgumentException();
				email = new String(Base64.getUrlDecoder().decode(after), StandardCharsets.UTF_8);
				if (!email.equals(validEmail(email))) throw new IllegalArgumentException();
			} catch (IllegalArgumentException ex) { throw invalid("La página no es válida."); }
		}
		var rows = store.list(first + 1, email);
		boolean more = rows.size() > first;
		var items = rows.stream().limit(first).toList();
		String cursor = more ? Base64.getUrlEncoder().withoutPadding().encodeToString(items.getLast().email().getBytes(StandardCharsets.UTF_8)) : null;
		return new Page<>(items, new PageInfo(cursor, more));
	}

	public Lawyer account(User actor, String id) {
		requireAdmin(actor);
		return store.lawyer(validId(id)).orElseThrow(AdministrationService::missing);
	}

	public Change create(User actor, String name, String email, String password) {
		requireAdmin(actor);
		if (name == null || name.isBlank() || name.strip().length() > 200 || name.chars().anyMatch(Character::isISOControl)) throw invalid("El nombre no es válido.");
		String normalizedEmail = validEmail(email);
		validPassword(password);
		var account = store.create(UUID.randomUUID().toString(), name.strip(), normalizedEmail, passwords.hash(password));
		return changed(actor, "ACCOUNT_CREATED", account, null);
	}

	public Change setEnabled(User actor, String id, boolean enabled) {
		requireAdmin(actor);
		var account = store.setEnabled(validId(id), enabled).orElseThrow(AdministrationService::missing);
		return changed(actor, enabled ? "ACCOUNT_REACTIVATED" : "ACCOUNT_SUSPENDED", account, null);
	}

	public Change resetPassword(User actor, String id, String password) {
		requireAdmin(actor);
		validId(id);
		validPassword(password);
		var account = store.resetPassword(id, passwords.hash(password)).orElseThrow(AdministrationService::missing);
		return changed(actor, "PASSWORD_RESET", account, null);
	}

	public Settings publicSettings() { return store.settings(); }

	public Change updateSetting(User actor, String key, String value) {
		requireAdmin(actor);
		if (key == null || !Set.of("GLOBAL_MESSAGE", "SUPPORT_EMAIL").contains(key) || value == null) throw invalid("Parámetro no permitido.");
		String normalized = value.strip();
		if (key.equals("GLOBAL_MESSAGE")) {
			if (normalized.length() > 1000 || normalized.contains("<") || normalized.contains(">")
					|| normalized.chars().anyMatch(code -> Character.isISOControl(code) && code != '\n' && code != '\t')) throw invalid("El mensaje debe ser texto plano de hasta 1000 caracteres.");
		} else if (!normalized.isEmpty()) normalized = validEmail(normalized);
		var change = store.updateSetting(key, normalized);
		return changed(actor, "PARAMETER_CHANGED", null, change);
	}

	public Page<Event> auditEvents(User actor, Filter filter, int first, String after) {
		requireAdmin(actor);
		pageSize(first);
		Filter input = filter == null ? new Filter(null, null, null, null) : filter;
		if (input.type() != null && !EVENT_TYPES.contains(input.type())) throw invalid("Tipo de evento no permitido.");
		String user = input.userId() == null ? null : validId(input.userId());
		String from = date(input.from()), until = date(input.until());
		if (from != null && until != null && !Instant.parse(from).isBefore(Instant.parse(until))) throw invalid("El final del período debe ser posterior al inicio.");
		if (after != null && after.length() > 4096) throw invalid("La página no es válida.");
		return events.query(new Filter(input.type(), from, until, user), first, after);
	}

	public Change receiveAgentEvent(User actor, String eventId, String operation, String agentId, String occurredAt) {
		requireAdmin(actor);
		if (eventId == null || !eventId.matches("[a-zA-Z0-9-]{1,100}") || operation == null
				|| !Set.of("AGENT_CONFIGURATION_CHANGED", "AGENT_ENABLED", "AGENT_DISABLED").contains(operation)
				|| agentId == null || !Set.of("penalista", "civilista").contains(agentId)) throw invalid("Evento de agente no válido.");
		String when = date(occurredAt);
		if (when == null || Instant.parse(when).isAfter(clock.instant().plusSeconds(120))) throw invalid("Fecha de evento no válida.");
		boolean recorded = events.write(new Event(eventId, "AGENT_ACTION", when, actor.userId(), "SUCCESS", operation, null, null, null, null, agentId));
		return new Change(true, recorded, recorded ? null : "PARTIAL_FAILURE", recorded ? null : "Cambio aplicado; auditoría no registrada.", null, null);
	}

	private Change changed(User actor, String operation, Lawyer account, ParameterChange parameter) {
		boolean recorded = events.write(new Event(UUID.randomUUID().toString(), "ADMIN_CHANGE", clock.instant().toString(), actor.userId(), "SUCCESS",
				operation, account == null ? null : account.id(), parameter == null ? null : parameter.key(),
				parameter == null ? null : parameter.previousValue(), parameter == null ? null : parameter.newValue(), null));
		return new Change(true, recorded, recorded ? null : "PARTIAL_FAILURE", recorded ? null : "Cambio aplicado; auditoría no registrada. No repitas el cambio.", account, parameter == null ? null : parameter.settings());
	}

	private void requireAdmin(User actor) {
		if (actor == null) throw new Failure("UNAUTHENTICATED", "Debes iniciar sesión.");
		var result = auth.authorize(actor.userId(), actor.accountId(), actor.role().name(), Role.ADMINISTRADOR, null);
		if (!result.success()) throw new Failure(result.category(), result.message());
	}

	public static String validId(String value) {
		try { if (value != null && UUID.fromString(value).toString().equalsIgnoreCase(value)) return value.toLowerCase(Locale.ROOT); }
		catch (IllegalArgumentException ignored) {}
		throw invalid("El identificador no es válido.");
	}
	private static String validEmail(String value) {
		if (value == null) throw invalid("El correo no es válido.");
		String email = value.strip().toLowerCase(Locale.ROOT);
		if (email.length() > 254 || email.chars().anyMatch(Character::isISOControl)
				|| !email.matches("[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+")) throw invalid("El correo no es válido.");
		return email;
	}
	private static void validPassword(String value) {
		if (value == null || value.isEmpty() || value.getBytes(StandardCharsets.UTF_8).length > 72) throw invalid("La contraseña debe ocupar entre 1 y 72 bytes UTF-8.");
	}
	private static String date(String value) {
		if (value == null) return null;
		try { return OffsetDateTime.parse(value).toInstant().toString(); }
		catch (RuntimeException ex) { throw invalid("La fecha debe incluir hora y zona."); }
	}
	private static void pageSize(int first) { if (first < 1 || first > 100) throw invalid("El tamaño de página debe estar entre 1 y 100."); }
	private static Failure invalid(String message) { return new Failure("VALIDATION", message); }
	private static Failure missing() { return new Failure("NOT_FOUND", "La cuenta no existe."); }
}