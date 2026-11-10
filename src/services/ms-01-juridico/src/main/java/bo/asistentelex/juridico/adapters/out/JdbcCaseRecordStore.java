package bo.asistentelex.juridico.adapters.out;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import bo.asistentelex.juridico.application.ports.out.CaseRecordStore;
import bo.asistentelex.juridico.domain.CaseRecords;
import bo.asistentelex.juridico.domain.CaseRecords.*;

@Repository
public class JdbcCaseRecordStore implements CaseRecordStore {
	private final JdbcTemplate jdbc;
	private final TransactionTemplate transaction;
	private static final String ACTUATIONS = "SELECT id, type, act_date, description, version FROM juridico.actuations WHERE account_id = ? AND case_id = ?";
	private static final String NOTES = "SELECT id, text, created_at, version FROM juridico.private_notes WHERE account_id = ? AND case_id = ?";
	public JdbcCaseRecordStore(JdbcTemplate jdbc, PlatformTransactionManager manager) { this.jdbc = jdbc; this.transaction = new TransactionTemplate(manager); }
	private static Actuation actuationRow(ResultSet row, int index) throws SQLException { return new Actuation(row.getString("id"), row.getString("type"), row.getString("act_date"), row.getString("description"), row.getInt("version")); }
	private static PrivateNote noteRow(ResultSet row, int index) throws SQLException { return new PrivateNote(row.getString("id"), row.getString("text"), row.getTimestamp("created_at").toInstant().toString(), row.getInt("version"), "OWNER_ONLY"); }
	public boolean ownsCase(String account, String caseId) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM juridico.cases WHERE account_id = ? AND id = ?)", Boolean.class, uuid(account), uuid(caseId))); }
	public Actuation actuation(String account, String caseId, String id) { return jdbc.query(ACTUATIONS + " AND id = ?", JdbcCaseRecordStore::actuationRow, uuid(account), uuid(caseId), uuid(id)).stream().findFirst().orElseThrow(CaseRecords::missing); }
	public PrivateNote note(String account, String caseId, String id) { return jdbc.query(NOTES + " AND id = ?", JdbcCaseRecordStore::noteRow, uuid(account), uuid(caseId), uuid(id)).stream().findFirst().orElseThrow(CaseRecords::missing); }
	public List<Actuation> actuations(String account, String caseId, ActuationFilter filter, int limit, Position after) {
		var parameters = new ArrayList<Object>(List.of(uuid(account), uuid(caseId))); var sql = new StringBuilder(ACTUATIONS);
		if (filter.type() != null) { sql.append(" AND type = ?"); parameters.add(filter.type()); }
		if (filter.fromDate() != null) { sql.append(" AND act_date >= ?::date"); parameters.add(filter.fromDate()); }
		if (filter.toDate() != null) { sql.append(" AND act_date <= ?::date"); parameters.add(filter.toDate()); }
		if (after != null) { sql.append(" AND (act_date, id) > (?::date, ?)"); parameters.add(after.date()); parameters.add(uuid(after.id())); }
		sql.append(" ORDER BY act_date, id LIMIT ?"); parameters.add(limit);
		return jdbc.query(sql.toString(), JdbcCaseRecordStore::actuationRow, parameters.toArray());
	}
	public List<PrivateNote> notes(String account, String caseId, String search, int limit, Position after) {
		var parameters = new ArrayList<Object>(List.of(uuid(account), uuid(caseId))); var sql = new StringBuilder(NOTES);
		if (search != null) { sql.append(" AND strpos(lower(text), lower(?)) > 0"); parameters.add(search); }
		if (after != null) { sql.append(" AND (created_at, id) < (?, ?)"); parameters.add(Timestamp.from(Instant.parse(after.date()))); parameters.add(uuid(after.id())); }
		sql.append(" ORDER BY created_at DESC, id DESC LIMIT ?"); parameters.add(limit);
		return jdbc.query(sql.toString(), JdbcCaseRecordStore::noteRow, parameters.toArray());
	}
	public Actuation createActuation(String account, String caseId, String id, ActuationInput input, String author) {
		return transaction.execute(status -> {
			lockOpen(account, caseId);
			jdbc.update("INSERT INTO juridico.actuations(id, account_id, case_id, type, act_date, description, author_id) VALUES (?, ?, ?, ?, ?::date, ?, ?)", uuid(id), uuid(account), uuid(caseId), input.type(), input.date(), input.description(), uuid(author));
			return actuation(account, caseId, id);
		});
	}
	public Actuation updateActuation(String account, String caseId, String id, ActuationInput input, int version, String author) {
		return transaction.execute(status -> {
			lockOpen(account, caseId); var before = actuation(account, caseId, id);
			if (before.version() != version) throw CaseRecords.conflict();
			if (before.type().equals(input.type()) && before.date().equals(input.date()) && before.description().equals(input.description())) return before;
			if (jdbc.update("UPDATE juridico.actuations SET type = ?, act_date = ?::date, description = ?, version = version + 1 WHERE account_id = ? AND case_id = ? AND id = ? AND version = ?", input.type(), input.date(), input.description(), uuid(account), uuid(caseId), uuid(id), version) != 1) throw CaseRecords.conflict();
			var changed = actuation(account, caseId, id);
			jdbc.update("INSERT INTO juridico.actuation_corrections(id, actuation_id, account_id, case_id, previous_type, previous_date, previous_description, new_type, new_date, new_description, author_id, version) VALUES (?, ?, ?, ?, ?, ?::date, ?, ?, ?::date, ?, ?, ?)", UUID.randomUUID(), uuid(id), uuid(account), uuid(caseId), before.type(), before.date(), before.description(), changed.type(), changed.date(), changed.description(), uuid(author), changed.version());
			return changed;
		});
	}
	public PrivateNote createNote(String account, String caseId, String id, NoteInput input) {
		return transaction.execute(status -> {
			lockOpen(account, caseId);
			jdbc.update("INSERT INTO juridico.private_notes(id, account_id, case_id, text) VALUES (?, ?, ?, ?)", uuid(id), uuid(account), uuid(caseId), input.text());
			return note(account, caseId, id);
		});
	}
	public PrivateNote updateNote(String account, String caseId, String id, NoteInput input, int version) {
		return transaction.execute(status -> {
			lockOpen(account, caseId); var before = note(account, caseId, id);
			if (before.version() != version) throw CaseRecords.conflict();
			if (before.text().equals(input.text())) return before;
			if (jdbc.update("UPDATE juridico.private_notes SET text = ?, version = version + 1 WHERE account_id = ? AND case_id = ? AND id = ? AND version = ?", input.text(), uuid(account), uuid(caseId), uuid(id), version) != 1) throw CaseRecords.conflict();
			return note(account, caseId, id);
		});
	}
	private void lockOpen(String account, String caseId) {
		String state = jdbc.query("SELECT state FROM juridico.cases WHERE account_id = ? AND id = ? FOR UPDATE", (row, index) -> row.getString("state"), uuid(account), uuid(caseId)).stream().findFirst().orElseThrow(CaseRecords::missing);
		if (!"OPEN".equals(state)) throw CaseRecords.conflict();
	}
	private static UUID uuid(String value) { return UUID.fromString(value); }
}