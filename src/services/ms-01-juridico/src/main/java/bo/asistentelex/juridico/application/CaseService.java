package bo.asistentelex.juridico.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import bo.asistentelex.juridico.application.ports.out.CasePorts.*;
import bo.asistentelex.juridico.domain.Administration.PageInfo;
import bo.asistentelex.juridico.domain.Cases;
import bo.asistentelex.juridico.domain.Cases.*;
import bo.asistentelex.juridico.domain.Identity.*;

public final class CaseService {
	private final Store store;
	private final Intelligence intelligence;
	private final AuthService auth;
	public CaseService(Store store, Intelligence intelligence, AuthService auth) { this.store = store; this.intelligence = intelligence; this.auth = auth; }
	public CaseFile create(User actor, Input input, RemoteContext remote) {
		String account = account(actor);
		var data = Cases.validate(input);
		intelligence.requireEnabled(actor, data.initialAgentId(), remote);
		return store.create(account, UUID.randomUUID().toString(), data);
	}
	public CaseFile get(User actor, String id) { return own(account(actor), validId(id)); }
	public CaseFile update(User actor, String id, Input input, int expectedVersion, RemoteContext remote) {
		String account = account(actor), identifier = validId(id);
		var before = own(account, identifier);
		version(before, expectedVersion);
		if (!"OPEN".equals(before.state()) || before.archiving()) throw conflict();
		var data = Cases.validate(input);
		if (!data.initialAgentId().equals(before.initialAgentId())) intelligence.requireEnabled(actor, data.initialAgentId(), remote);
		return store.update(account, identifier, data, expectedVersion);
	}
	public CaseFile transition(User actor, String id, String action, int expectedVersion, boolean confirmed, RemoteContext remote) {
		String account = account(actor), identifier = validId(id);
		var before = own(account, identifier);
		version(before, expectedVersion);
		if (action == null || !Set.of("CLOSE", "REOPEN", "ARCHIVE", "UNARCHIVE").contains(action)) throw invalid("Selecciona una transicion valida.");
		String next = Cases.next(before.state(), action);
		if (!"ARCHIVE".equals(action)) {
			if (before.archiving()) throw conflict();
			return store.transition(account, identifier, before.state(), next, expectedVersion, actor.userId());
		}
		if (!confirmed) throw new Failure("VALIDATION", "Debes confirmar la eliminacion irreversible de conversaciones.",
				java.util.Map.of("confirmConversationDeletion", "La confirmacion es obligatoria."));
		var attempt = store.beginArchive(account, identifier, expectedVersion);
		try { intelligence.deleteConversations(actor, identifier, attempt.id(), remote); }
		catch (RuntimeException failure) {
			archiveFailure("eliminacion-no-confirmada", remote);
			throw new Failure("SERVICE_UNAVAILABLE", "Archivo no confirmado. El expediente sigue Cerrado y bloquea nuevas preguntas hasta reintentar el archivo; las conversaciones pueden haberse eliminado.");
		}
		try { return store.finishArchive(account, identifier, attempt.id(), expectedVersion, actor.userId()); }
		catch (RuntimeException failure) {
			archiveFailure("persistencia-no-confirmada-tras-eliminacion", remote);
			throw new Failure("PARTIAL_FAILURE", "Conversaciones eliminadas de forma irreversible; el archivo no se pudo confirmar. Consulta el estado y reintenta el archivo si sigue Cerrado.");
		}
	}
	public Page<CaseFile> list(User actor, Filter input, int first, String after) {
		String account = account(actor); pageSize(first);
		var filter = input == null ? new Filter(null, null, null, null) : new Filter(text(input.state(), 20), text(input.area(), 20), text(input.code(), 100), text(input.title(), 300));
		if (filter.state() != null && !Set.of("OPEN", "CLOSED", "ARCHIVED").contains(filter.state())) throw invalid("El estado no es valido.");
		if (filter.area() != null && !Set.of("CIVIL", "PENAL").contains(filter.area())) throw invalid("El area no es valida.");
		String scope = digest(account + "\n" + empty(filter.state()) + "\n" + empty(filter.area()) + "\n" + empty(filter.code()) + "\n" + empty(filter.title()));
		String position = after == null ? "00000000-0000-0000-0000-000000000000" : validId(decode(after, scope));
		var rows = store.list(account, filter, first + 1, position);
		boolean more = rows.size() > first; var items = rows.stream().limit(first).toList();
		return new Page<>(items, new PageInfo(more ? encode(scope, items.getLast().id()) : null, more));
	}
	public Page<Transition> history(User actor, String id, int first, String after) {
		String account = account(actor), identifier = validId(id); own(account, identifier); pageSize(first);
		String scope = digest("history\n" + account + "\n" + identifier); int position = 0;
		if (after != null) {
			try { position = Integer.parseInt(decode(after, scope)); if (position < 1) throw new IllegalArgumentException(); }
			catch (IllegalArgumentException ex) { throw invalid("La pagina no es valida."); }
		}
		var rows = store.history(account, identifier, first + 1, position);
		boolean more = rows.size() > first; var items = rows.stream().limit(first).toList();
		return new Page<>(items, new PageInfo(more ? encode(scope, Integer.toString(items.getLast().version())) : null, more));
	}
	private String account(User actor) {
		if (actor == null) throw new Failure("UNAUTHENTICATED", "Debes iniciar sesion.");
		var result = auth.authorize(actor.userId(), actor.accountId(), actor.role().name(), Role.ABOGADO, null);
		if (!result.success()) throw new Failure(result.category(), result.message());
		return result.user().accountId();
	}
	private CaseFile own(String account, String id) { return store.find(account, id).orElseThrow(() -> new Failure("NOT_FOUND", "El expediente no esta disponible.")); }
	private static void version(CaseFile before, int expected) { if (expected < 1) throw invalid("La version no es valida."); if (before.version() != expected) throw conflict(); }
	private static void pageSize(int first) { if (first < 1 || first > 100) throw invalid("El tamano de pagina debe estar entre 1 y 100."); }
	private static String validId(String value) {
		try { if (value != null && UUID.fromString(value).toString().equalsIgnoreCase(value)) return UUID.fromString(value).toString(); }
		catch (IllegalArgumentException ignored) {}
		throw invalid("El identificador no es valido.");
	}
	private static String text(String value, int maximum) {
		if (value == null || value.isBlank()) return null;
		String result = value.strip();
		if (result.length() > maximum || result.chars().anyMatch(Character::isISOControl)) throw invalid("El filtro no es valido.");
		return result;
	}
	private static String empty(String value) { return value == null ? "" : value; }
	private static void archiveFailure(String phase, RemoteContext remote) {
		String correlation = remote.correlationId();
		if (correlation == null || !correlation.matches("[a-zA-Z0-9-]{1,100}")) correlation = "no-disponible";
		System.err.println("[ms-01] Archivo fase=" + phase + " correlacion=" + correlation);
	}
	private static String digest(String value) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
		catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
	}
	private static String encode(String scope, String position) { return Base64.getUrlEncoder().withoutPadding().encodeToString(("cases-v1:" + scope + ":" + position).getBytes(StandardCharsets.UTF_8)); }
	private static String decode(String value, String scope) {
		try {
			if (value.length() > 256) throw new IllegalArgumentException();
			String[] parts = new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8).split(":", -1);
			if (parts.length != 3 || !parts[0].equals("cases-v1") || !parts[1].equals(scope)) throw new IllegalArgumentException();
			return parts[2];
		} catch (IllegalArgumentException ex) { throw invalid("La pagina no corresponde a esta consulta."); }
	}
	public static Failure conflict() { return new Failure("CONFLICT", "El expediente cambio o la operacion no esta permitida. Actualiza la ficha antes de continuar."); }
	private static Failure invalid(String message) { return new Failure("VALIDATION", message); }
}