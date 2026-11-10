package bo.asistentelex.juridico.adapters.out;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import bo.asistentelex.juridico.application.PeopleService;
import bo.asistentelex.juridico.application.ports.out.PeopleStore;
import bo.asistentelex.juridico.domain.People.*;

@Repository
public class JdbcPeopleStore implements PeopleStore {
	private final JdbcTemplate jdbc;
	public JdbcPeopleStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
	private static Person row(ResultSet row, int index) throws SQLException {
		return new Person(row.getString("id"), row.getString("type"), row.getString("first_names"), row.getString("last_names"),
				row.getString("business_name"), row.getString("document_type"), row.getString("document_number"), row.getString("issuing_country"),
				row.getString("phone"), row.getString("email"), row.getString("address"));
	}
	public List<Person> list(String account, Filter filter, int limit, String afterId) {
		StringBuilder sql = new StringBuilder("SELECT * FROM juridico.people WHERE account_id = ? AND id > ?");
		var parameters = new ArrayList<Object>(List.of(UUID.fromString(account), UUID.fromString(afterId)));
		if (filter.type() != null) { sql.append(" AND type = ?"); parameters.add(filter.type()); }
		if (filter.name() != null) {
			sql.append(" AND position(lower(?) in lower(CASE WHEN type = 'NATURAL' THEN first_names || ' ' || last_names ELSE business_name END)) > 0");
			parameters.add(filter.name());
		}
		if (filter.document() != null) { sql.append(" AND position(lower(?) in lower(document_number)) > 0"); parameters.add(filter.document()); }
		sql.append(" ORDER BY id LIMIT ?"); parameters.add(limit);
		return jdbc.query(sql.toString(), JdbcPeopleStore::row, parameters.toArray());
	}
	public Optional<Person> find(String account, String id) {
		return jdbc.query("SELECT * FROM juridico.people WHERE account_id = ? AND id = ?", JdbcPeopleStore::row,
				UUID.fromString(account), UUID.fromString(id)).stream().findFirst();
	}
	public boolean documentExists(String account, Input input, String excludedId) {
		return Boolean.TRUE.equals(jdbc.queryForObject("""
			SELECT EXISTS(SELECT 1 FROM juridico.people WHERE account_id = ? AND id <> ?
			AND document_type IS NOT NULL AND lower(btrim(document_type)) = lower(btrim(?))
			AND lower(btrim(document_number)) = lower(btrim(?)) AND lower(btrim(issuing_country)) = lower(btrim(?)))
			""", Boolean.class, UUID.fromString(account), UUID.fromString(excludedId), input.documentType(), input.documentNumber(), input.issuingCountry()));
	}
	public Person create(String account, String id, Input input) {
		try {
			return jdbc.queryForObject("""
				INSERT INTO juridico.people(type, first_names, last_names, business_name, document_type,
				document_number, issuing_country, phone, email, address, account_id, id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
				""", JdbcPeopleStore::row, parameters(account, id, input));
		} catch (DuplicateKeyException duplicate) { throw PeopleService.duplicate(); }
	}
	public Optional<Person> update(String account, String id, Input input) {
		try {
			return jdbc.query("""
				UPDATE juridico.people SET type = ?, first_names = ?, last_names = ?, business_name = ?, document_type = ?,
				document_number = ?, issuing_country = ?, phone = ?, email = ?, address = ?
				WHERE account_id = ? AND id = ? RETURNING *
				""", JdbcPeopleStore::row, parameters(account, id, input)).stream().findFirst();
		} catch (DuplicateKeyException duplicate) { throw PeopleService.duplicate(); }
	}
	private static Object[] parameters(String account, String id, Input data) {
		return new Object[]{data.type(), data.firstNames(), data.lastNames(), data.businessName(), data.documentType(), data.documentNumber(),
				data.issuingCountry(), data.phone(), data.email(), data.address(), UUID.fromString(account), UUID.fromString(id)};
	}
}