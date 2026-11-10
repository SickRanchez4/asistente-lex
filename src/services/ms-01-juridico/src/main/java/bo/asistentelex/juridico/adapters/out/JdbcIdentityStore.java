package bo.asistentelex.juridico.adapters.out;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.Accounts;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.Sessions;
import bo.asistentelex.juridico.domain.Identity.*;

@Repository
public class JdbcIdentityStore implements Accounts, Sessions {
	private final JdbcTemplate jdbc;

	public JdbcIdentityStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	public Optional<Account> byEmail(String email) { return account("email = ?", email); }

	public Optional<Account> byId(String id) { return account("id = ?", UUID.fromString(id)); }

	private Optional<Account> account(String predicate, Object value) {
		return jdbc.query("SELECT id, name, email, password_hash, role, enabled FROM juridico.accounts WHERE " + predicate,
				(result, row) -> new Account(result.getString("id"), result.getString("name"), result.getString("email"),
						result.getString("password_hash"), Role.valueOf(result.getString("role")), result.getBoolean("enabled")), value)
				.stream().findFirst();
	}

	public boolean updatePassword(String id, String previousHash, String hash) {
		return jdbc.update("UPDATE juridico.accounts SET password_hash = ? WHERE id = ? AND password_hash = ? AND enabled",
				hash, UUID.fromString(id), previousHash) == 1;
	}

	public void insertDemo(Account account) {
		jdbc.update("INSERT INTO juridico.accounts(id, name, email, password_hash, role, enabled) VALUES (?, ?, ?, ?, ?, true) ON CONFLICT (email) DO NOTHING",
				UUID.fromString(account.id()), account.name(), account.email(), account.passwordHash(), account.role().name());
	}

	public void create(Session session) {
		jdbc.update("INSERT INTO juridico.sessions(token_hash, account_id, created_at, last_activity_at, expires_at) VALUES (?, ?, ?, ?, ?)",
				session.tokenHash(), UUID.fromString(session.accountId()), Timestamp.from(session.createdAt()),
				Timestamp.from(session.lastActivityAt()), Timestamp.from(session.expiresAt()));
	}

	public Optional<Session> find(String tokenHash) {
		return jdbc.query("SELECT * FROM juridico.sessions WHERE token_hash = ?", (result, row) ->
				new Session(result.getString("token_hash"), result.getString("account_id"),
						result.getTimestamp("created_at").toInstant(), result.getTimestamp("last_activity_at").toInstant(),
						result.getTimestamp("expires_at").toInstant()), tokenHash).stream().findFirst();
	}

	public boolean touch(String tokenHash, Instant now) {
		return jdbc.update("UPDATE juridico.sessions SET last_activity_at = GREATEST(last_activity_at, ?) WHERE token_hash = ? AND expires_at > ? AND last_activity_at > ? AND EXISTS (SELECT 1 FROM juridico.accounts WHERE accounts.id = sessions.account_id AND enabled)",
				Timestamp.from(now), tokenHash, Timestamp.from(now), Timestamp.from(now.minusSeconds(1800))) == 1;
	}

	public void delete(String tokenHash) { jdbc.update("DELETE FROM juridico.sessions WHERE token_hash = ?", tokenHash); }

	public void invalidateAccount(String accountId) { jdbc.update("DELETE FROM juridico.sessions WHERE account_id = ?", UUID.fromString(accountId)); }
}