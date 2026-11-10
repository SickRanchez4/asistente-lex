package bo.asistentelex.juridico.adapters.out;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import bo.asistentelex.juridico.application.ports.out.AdministrationPorts.Store;
import bo.asistentelex.juridico.domain.Administration.*;

@Repository
public class JdbcAdministrationStore implements Store {
	private final JdbcTemplate jdbc;
	private final TransactionTemplate transaction;
	public JdbcAdministrationStore(JdbcTemplate jdbc, PlatformTransactionManager manager) {
		this.jdbc = jdbc; this.transaction = new TransactionTemplate(manager);
	}
	private static Lawyer row(ResultSet row, int index) throws SQLException {
		return new Lawyer(row.getString("id"), row.getString("name"), row.getString("email"), row.getBoolean("enabled"));
	}
	public List<Lawyer> list(int limit, String afterEmail) {
		return jdbc.query("SELECT id, name, email, enabled FROM juridico.accounts WHERE role = 'ABOGADO' AND email > ? ORDER BY email LIMIT ?",
				JdbcAdministrationStore::row, afterEmail, limit);
	}
	public Optional<Lawyer> lawyer(String id) {
		return jdbc.query("SELECT id, name, email, enabled FROM juridico.accounts WHERE id = ? AND role = 'ABOGADO'",
				JdbcAdministrationStore::row, UUID.fromString(id)).stream().findFirst();
	}
	public Lawyer create(String id, String name, String email, String hash) {
		try {
			jdbc.update("INSERT INTO juridico.accounts(id, name, email, password_hash, role, enabled) VALUES (?, ?, ?, ?, 'ABOGADO', true)", UUID.fromString(id), name, email, hash);
			return new Lawyer(id, name, email, true);
		} catch (DuplicateKeyException duplicate) { throw new Failure("CONFLICT", "El correo ya está registrado."); }
	}
	public Optional<Lawyer> setEnabled(String id, boolean enabled) {
		return transaction.execute(status -> {
			var account = jdbc.query("UPDATE juridico.accounts SET enabled = ? WHERE id = ? AND role = 'ABOGADO' RETURNING id, name, email, enabled",
					JdbcAdministrationStore::row, enabled, UUID.fromString(id)).stream().findFirst();
			if (account.isPresent() && !enabled) jdbc.update("DELETE FROM juridico.sessions WHERE account_id = ?", UUID.fromString(id));
			return account;
		});
	}
	public Optional<Lawyer> resetPassword(String id, String hash) {
		return transaction.execute(status -> {
			var account = jdbc.query("UPDATE juridico.accounts SET password_hash = ? WHERE id = ? AND role = 'ABOGADO' RETURNING id, name, email, enabled",
					JdbcAdministrationStore::row, hash, UUID.fromString(id)).stream().findFirst();
			if (account.isPresent()) jdbc.update("DELETE FROM juridico.sessions WHERE account_id = ?", UUID.fromString(id));
			return account;
		});
	}
	public Settings settings() {
		return jdbc.queryForObject("SELECT global_message, support_email FROM juridico.application_settings WHERE id = true",
				(row, index) -> new Settings(row.getString(1), row.getString(2)));
	}
	public ParameterChange updateSetting(String key, String value) {
		return transaction.execute(status -> {
			var before = jdbc.queryForObject("SELECT global_message, support_email FROM juridico.application_settings WHERE id = true FOR UPDATE",
					(row, index) -> new Settings(row.getString(1), row.getString(2)));
			boolean message = "GLOBAL_MESSAGE".equals(key);
			jdbc.update(message ? "UPDATE juridico.application_settings SET global_message = ? WHERE id = true"
					: "UPDATE juridico.application_settings SET support_email = ? WHERE id = true", value);
			return new ParameterChange(key, message ? before.globalMessage() : before.supportEmail(), value,
					message ? new Settings(value, before.supportEmail()) : new Settings(before.globalMessage(), value));
		});
	}
}