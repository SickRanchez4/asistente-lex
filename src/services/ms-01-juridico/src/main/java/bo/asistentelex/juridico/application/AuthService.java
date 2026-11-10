package bo.asistentelex.juridico.application;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.*;
import bo.asistentelex.juridico.domain.Identity.*;

public final class AuthService {
	private final Accounts accounts;
	private final Sessions sessions;
	private final Passwords passwords;
	private final Tokens tokens;
	private final Audit audit;
	private final Clock clock;
	private final String dummyHash;

	public AuthService(Accounts accounts, Sessions sessions, Passwords passwords, Tokens tokens, Audit audit, Clock clock) {
		this.accounts = accounts;
		this.sessions = sessions;
		this.passwords = passwords;
		this.tokens = tokens;
		this.audit = audit;
		this.clock = clock;
		this.dummyHash = passwords.hash(tokens.generate());
	}

	public Result login(String email, String password) {
		if (email == null || email.length() > 254 || !validPassword(password)) {
			return reject("VALIDATION", "Correo o contraseña no válidos.", "LOGIN_FAILED", null);
		}
		Account account = accounts.byEmail(email.strip().toLowerCase(Locale.ROOT)).orElse(null);
		boolean matches = passwords.matches(password, account == null ? dummyHash : account.passwordHash());
		if (account == null || !matches) {
			return reject("UNAUTHENTICATED", "Correo o contraseña incorrectos.", "LOGIN_FAILED", account == null ? null : account.id());
		}
		if (!account.enabled()) {
			sessions.invalidateAccount(account.id());
			return reject("FORBIDDEN", "La cuenta está suspendida.", "LOGIN_FAILED", account.id());
		}
		String token = tokens.generate();
		Instant now = clock.instant();
		sessions.create(new Session(tokens.digest(token), account.id(), now, now, now.plus(Duration.ofHours(8))));
		boolean recorded = audit.record("LOGIN", account.id(), "SUCCESS");
		return success(User.from(account), token, recorded);
	}

	public Result verify(String token, boolean active) {
		if (token == null || token.length() > 256 || token.isEmpty()) return absent();
		String digest = tokens.digest(token);
		Session session = sessions.find(digest).orElse(null);
		if (session == null) return absent();
		Account account = accounts.byId(session.accountId()).orElse(null);
		Instant now = clock.instant();
		if (account == null || !account.enabled()) {
			sessions.invalidateAccount(session.accountId());
			return new Result(false, null, null, "UNAUTHENTICATED", "La sesión ya no está disponible.", true);
		}
		if (!now.isBefore(session.expiresAt()) || !now.isBefore(session.lastActivityAt().plus(Duration.ofMinutes(30)))) {
			sessions.delete(digest);
			return absent();
		}
		if (active && !sessions.touch(digest, now)) return absent();
		return success(User.from(account), null, true);
	}

	public Result logout(String token) {
		Result verified = verify(token, false);
		if (!verified.success()) return verified;
		sessions.delete(tokens.digest(token));
		return success(null, null, audit.record("LOGOUT", verified.user().userId(), "SUCCESS"));
	}

	public Result changePassword(String token, String currentPassword, String newPassword) {
		Result verified = verify(token, true);
		if (!verified.success()) return verified;
		if (!validPassword(currentPassword) || !validPassword(newPassword)) {
			return new Result(false, verified.user(), null, "VALIDATION", "La contraseña debe ocupar entre 1 y 72 bytes UTF-8.", true);
		}
		Account account = accounts.byId(verified.user().accountId()).orElseThrow();
		if (!passwords.matches(currentPassword, account.passwordHash())) {
			return reject("FORBIDDEN", "La contraseña actual no es correcta.", "ACCESS_DENIED", account.id());
		}
		if (!accounts.updatePassword(account.id(), account.passwordHash(), passwords.hash(newPassword))) {
			return new Result(false, null, null, "CONFLICT", "La cuenta cambió. Vuelve a iniciar sesión.", true);
		}
		return success(verified.user(), null, audit.record("PASSWORD_CHANGED", account.id(), "SUCCESS"));
	}

	public Result denial(String token) {
		Result verified = verify(token, false);
		return reject("FORBIDDEN", "No tienes permiso para realizar esta operación.", "ACCESS_DENIED", verified.user() == null ? null : verified.user().userId());
	}

	public Result authorize(String userId, String accountId, String role, Role requiredRole, String resourceAccountId) {
		Account account = accounts.byId(accountId).orElse(null);
		if (account == null || !account.enabled() || !account.id().equals(userId) || !account.role().name().equals(role)
				|| (requiredRole != null && account.role() != requiredRole)
				|| (resourceAccountId != null && !account.id().equals(resourceAccountId))) {
			return reject("FORBIDDEN", "No tienes permiso para realizar esta operación.", "ACCESS_DENIED", userId);
		}
		return success(User.from(account), null, true);
	}

	public Result receiveEvent(String userId, String accountId, String role, String eventId, String type, String result) {
		if (eventId == null || !eventId.matches("[a-zA-Z0-9-]{1,100}") || type == null || result == null
				|| !Set.of("ACCESS_DENIED", "ADMIN_CHANGE", "AI_ACTION").contains(type)
				|| !Set.of("SUCCESS", "REJECTED", "PARTIAL_FAILURE").contains(result)) {
			return new Result(false, null, null, "VALIDATION", "Evento no válido.", true);
		}
		Role required = type.equals("ADMIN_CHANGE") ? Role.ADMINISTRADOR : type.equals("AI_ACTION") ? Role.ABOGADO : null;
		Result authorized = authorize(userId, accountId, role, required, null);
		if (!authorized.success()) return authorized;
		boolean recorded = audit.recordEvent(eventId, type, authorized.user().userId(), result);
		return new Result(recorded, null, null, recorded ? null : "PARTIAL_FAILURE",
				recorded ? null : "No se pudo registrar la auditoría.", recorded);
	}

	private boolean validPassword(String value) {
		return value != null && !value.isEmpty() && value.getBytes(StandardCharsets.UTF_8).length <= 72;
	}

	private Result absent() {
		return new Result(false, null, null, "UNAUTHENTICATED", "Debes iniciar sesión.", true);
	}

	private Result success(User user, String token, boolean recorded) {
		return new Result(true, user, token, recorded ? null : "PARTIAL_FAILURE",
				recorded ? null : "El acceso se actualizó, pero no se pudo registrar la auditoría.", recorded);
	}

	private Result reject(String category, String message, String type, String userId) {
		boolean recorded = audit.record(type, userId, "REJECTED");
		return new Result(false, null, null, category,
				message + (recorded ? "" : " No se pudo registrar la auditoría."), recorded);
	}
}