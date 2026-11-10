package bo.asistentelex.juridico.adapters.out;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import bo.asistentelex.juridico.application.ports.out.ParticipantStore;
import bo.asistentelex.juridico.domain.Participants;
import bo.asistentelex.juridico.domain.Participants.*;
import bo.asistentelex.juridico.domain.People.Selection;

@Repository
public class JdbcParticipantStore implements ParticipantStore {
	private final JdbcTemplate jdbc;
	private final TransactionTemplate transaction;
	private static final String SELECT = """
		SELECT link.id, link.role, link.detail, link.version, person.id AS person_id, person.type,
		CASE WHEN person.type = 'NATURAL' THEN person.first_names || ' ' || person.last_names ELSE person.business_name END AS display_name
		FROM juridico.participants link JOIN juridico.people person ON person.id = link.person_id AND person.account_id = link.account_id
		WHERE link.account_id = ? AND link.case_id = ?
		""";
	public JdbcParticipantStore(JdbcTemplate jdbc, PlatformTransactionManager manager) { this.jdbc = jdbc; this.transaction = new TransactionTemplate(manager); }
	private static Participant row(ResultSet row, int index) throws SQLException {
		return new Participant(row.getString("id"), new Selection(row.getString("person_id"), row.getString("type"), row.getString("display_name")), row.getString("role"), row.getString("detail"), row.getInt("version"));
	}
	public boolean ownsCase(String account, String caseId) {
		return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM juridico.cases WHERE account_id = ? AND id = ?)", Boolean.class, uuid(account), uuid(caseId)));
	}
	public List<Participant> list(String account, String caseId, int limit, String afterId) {
		return jdbc.query(SELECT + " AND link.id > ? ORDER BY link.id LIMIT ?", JdbcParticipantStore::row, uuid(account), uuid(caseId), uuid(afterId), limit);
	}
	public Participant link(String account, String caseId, String id, String personId, Input input, String author) {
		try {
			return transaction.execute(status -> {
				lockOpen(account, caseId);
				if (jdbc.query("SELECT id FROM juridico.people WHERE account_id = ? AND id = ? FOR KEY SHARE", (row, index) -> row.getString("id"), uuid(account), uuid(personId)).isEmpty()) throw Participants.missing();
				jdbc.update("INSERT INTO juridico.participants(id, account_id, case_id, person_id, role, detail) VALUES (?, ?, ?, ?, ?, ?)", uuid(id), uuid(account), uuid(caseId), uuid(personId), input.role(), input.detail());
				var created = find(account, caseId, id);
				history(account, caseId, "LINK", null, created, author);
				return created;
			});
		} catch (DuplicateKeyException duplicate) {
			throw new Failure("CONFLICT", "La persona ya participa en este expediente.", Map.of("personId", "Consulta la participacion existente."));
		}
	}
	public Participant update(String account, String caseId, String id, Input input, int version, String author) {
		return transaction.execute(status -> {
			lockOpen(account, caseId);
			var before = find(account, caseId, id);
			if (before.version() != version) throw Participants.conflict();
			if (before.role().equals(input.role()) && Objects.equals(before.detail(), input.detail())) return before;
			if (jdbc.update("UPDATE juridico.participants SET role = ?, detail = ?, version = version + 1 WHERE account_id = ? AND case_id = ? AND id = ? AND version = ?",
					input.role(), input.detail(), uuid(account), uuid(caseId), uuid(id), version) != 1) throw Participants.conflict();
			var changed = find(account, caseId, id);
			history(account, caseId, "CHANGE_ROLE", before, changed, author);
			return changed;
		});
	}
	public Removal unlink(String account, String caseId, String id, int version, String author) {
		return transaction.execute(status -> {
			lockOpen(account, caseId);
			var before = find(account, caseId, id);
			if (before.version() != version) throw Participants.conflict();
			if (jdbc.update("DELETE FROM juridico.participants WHERE account_id = ? AND case_id = ? AND id = ? AND version = ?", uuid(account), uuid(caseId), uuid(id), version) != 1) throw Participants.conflict();
			history(account, caseId, "UNLINK", before, null, author);
			return new Removal(id, true);
		});
	}
	private void lockOpen(String account, String caseId) {
		String state = jdbc.query("SELECT state FROM juridico.cases WHERE account_id = ? AND id = ? FOR UPDATE", (row, index) -> row.getString("state"), uuid(account), uuid(caseId))
				.stream().findFirst().orElseThrow(Participants::missing);
		if (!"OPEN".equals(state)) throw Participants.conflict();
	}
	private Participant find(String account, String caseId, String id) {
		return jdbc.query(SELECT + " AND link.id = ?", JdbcParticipantStore::row, uuid(account), uuid(caseId), uuid(id)).stream().findFirst().orElseThrow(Participants::missing);
	}
	private void history(String account, String caseId, String action, Participant before, Participant after, String author) {
		var current = after == null ? before : after;
		jdbc.update("""
			INSERT INTO juridico.participant_changes(id, participant_id, account_id, case_id, person_id, action,
			previous_role, previous_detail, new_role, new_detail, author_id, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			""", UUID.randomUUID(), uuid(current.id()), uuid(account), uuid(caseId), uuid(current.person().id()), action,
			before == null ? null : before.role(), before == null ? null : before.detail(), after == null ? null : after.role(), after == null ? null : after.detail(),
			uuid(author), after == null ? before.version() + 1 : after.version());
	}
	private static UUID uuid(String value) { return UUID.fromString(value); }
}