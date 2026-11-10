package bo.asistentelex.juridico.adapters.out;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import bo.asistentelex.juridico.application.CaseService;
import bo.asistentelex.juridico.application.ports.out.CasePorts.Store;
import bo.asistentelex.juridico.domain.Cases.*;

@Repository
public class JdbcCaseStore implements Store {
	private final JdbcTemplate jdbc;
	private final TransactionTemplate transaction;
	public JdbcCaseStore(JdbcTemplate jdbc, PlatformTransactionManager manager) { this.jdbc = jdbc; this.transaction = new TransactionTemplate(manager); }
	private static CaseFile row(ResultSet row, int index) throws SQLException {
		return new CaseFile(row.getString("id"), row.getString("code"), row.getString("title"), row.getString("description"),
				row.getString("area"), row.getString("initial_agent_id"), row.getString("state"), row.getInt("version"), row.getObject("archive_attempt_id") != null);
	}
	public CaseFile create(String account, String id, Input data) {
		try {
			return jdbc.queryForObject("""
				INSERT INTO juridico.cases(code, title, description, area, initial_agent_id, account_id, id)
				VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
				""", JdbcCaseStore::row, data.code(), data.title(), data.description(), data.area(), data.initialAgentId(), UUID.fromString(account), UUID.fromString(id));
		} catch (DuplicateKeyException duplicate) { throw duplicate(); }
	}
	public Optional<CaseFile> find(String account, String id) {
		return jdbc.query("SELECT * FROM juridico.cases WHERE account_id = ? AND id = ?", JdbcCaseStore::row, UUID.fromString(account), UUID.fromString(id)).stream().findFirst();
	}
	public List<CaseFile> list(String account, Filter filter, int limit, String afterId) {
		var sql = new StringBuilder("SELECT * FROM juridico.cases WHERE account_id = ? AND id > ?");
		var values = new ArrayList<Object>(List.of(UUID.fromString(account), UUID.fromString(afterId)));
		if (filter.state() != null) { sql.append(" AND state = ?"); values.add(filter.state()); }
		if (filter.area() != null) { sql.append(" AND area = ?"); values.add(filter.area()); }
		if (filter.code() != null) { sql.append(" AND position(lower(?) in lower(code)) > 0"); values.add(filter.code()); }
		if (filter.title() != null) { sql.append(" AND position(lower(?) in lower(title)) > 0"); values.add(filter.title()); }
		sql.append(" ORDER BY id LIMIT ?"); values.add(limit);
		return jdbc.query(sql.toString(), JdbcCaseStore::row, values.toArray());
	}
	public CaseFile update(String account, String id, Input data, int version) {
		try {
			return jdbc.query("""
				UPDATE juridico.cases SET code = ?, title = ?, description = ?, area = ?, initial_agent_id = ?, version = version + 1
				WHERE account_id = ? AND id = ? AND state = 'OPEN' AND version = ? AND archive_attempt_id IS NULL RETURNING *
				""", JdbcCaseStore::row, data.code(), data.title(), data.description(), data.area(), data.initialAgentId(), UUID.fromString(account), UUID.fromString(id), version)
				.stream().findFirst().orElseThrow(CaseService::conflict);
		} catch (DuplicateKeyException duplicate) { throw duplicate(); }
	}
	public CaseFile transition(String account, String id, String previous, String next, int version, String author) {
		return transaction.execute(status -> {
			var changed = jdbc.query("""
				UPDATE juridico.cases SET state = ?, version = version + 1 WHERE account_id = ? AND id = ?
				AND state = ? AND version = ? AND archive_attempt_id IS NULL RETURNING *
				""", JdbcCaseStore::row, next, UUID.fromString(account), UUID.fromString(id), previous, version).stream().findFirst().orElseThrow(CaseService::conflict);
			writeHistory(changed, previous, author);
			return changed;
		});
	}
	public ArchiveAttempt beginArchive(String account, String id, int version) {
		return jdbc.query("""
			UPDATE juridico.cases SET archive_attempt_id = coalesce(archive_attempt_id, ?)
			WHERE account_id = ? AND id = ? AND state = 'CLOSED' AND version = ? RETURNING *
			""", (row, index) -> new ArchiveAttempt(row.getString("archive_attempt_id"), row(row, index)),
			UUID.randomUUID(), UUID.fromString(account), UUID.fromString(id), version).stream().findFirst().orElseThrow(CaseService::conflict);
	}
	public CaseFile finishArchive(String account, String id, String attempt, int version, String author) {
		return transaction.execute(status -> {
			var changed = jdbc.query("""
				UPDATE juridico.cases SET state = 'ARCHIVED', version = version + 1, archive_attempt_id = NULL
				WHERE account_id = ? AND id = ? AND state = 'CLOSED' AND version = ? AND archive_attempt_id = ? RETURNING *
				""", JdbcCaseStore::row, UUID.fromString(account), UUID.fromString(id), version, UUID.fromString(attempt)).stream().findFirst().orElseThrow(CaseService::conflict);
			writeHistory(changed, "CLOSED", author);
			return changed;
		});
	}
	private void writeHistory(CaseFile changed, String previous, String author) {
		jdbc.update("INSERT INTO juridico.case_transitions(id, case_id, previous_state, new_state, author_id, version) VALUES (?, ?, ?, ?, ?, ?)",
				UUID.randomUUID(), UUID.fromString(changed.id()), previous, changed.state(), UUID.fromString(author), changed.version());
	}
	public List<Transition> history(String account, String id, int limit, int afterVersion) {
		return jdbc.query("""
			SELECT history.* FROM juridico.case_transitions history JOIN juridico.cases parent ON parent.id = history.case_id
			WHERE parent.account_id = ? AND parent.id = ? AND history.version > ? ORDER BY history.version LIMIT ?
			""", (row, index) -> new Transition(row.getString("id"), row.getString("previous_state"), row.getString("new_state"),
				row.getTimestamp("occurred_at").toInstant().toString(), row.getString("author_id"), row.getInt("version")),
			UUID.fromString(account), UUID.fromString(id), afterVersion, limit);
	}
	private static Failure duplicate() { return new Failure("CONFLICT", "El codigo ya esta registrado en tu cuenta.", Map.of("code", "Elige otro codigo interno.")); }
}