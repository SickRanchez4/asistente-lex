package bo.asistentelex.juridico.domain;

import java.time.Instant;

public final class Identity {

	private Identity() {}

	public enum Role { ABOGADO, ADMINISTRADOR }

	public record Account(String id, String name, String email, String passwordHash, Role role, boolean enabled) {}

	public record User(String userId, String accountId, Role role, String name) {
		public static User from(Account account) {
			return new User(account.id(), account.id(), account.role(), account.name());
		}
	}

	public record Session(String tokenHash, String accountId, Instant createdAt, Instant lastActivityAt, Instant expiresAt) {}

	public record Result(boolean success, User user, String token, String category, String message, boolean auditRecorded) {}
}