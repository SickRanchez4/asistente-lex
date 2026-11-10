package bo.asistentelex.juridico.application.ports.out;

import java.util.List;
import java.util.Optional;
import bo.asistentelex.juridico.domain.People.*;

public interface PeopleStore {
	List<Person> list(String accountId, Filter filter, int limit, String afterId);
	Optional<Person> find(String accountId, String id);
	boolean documentExists(String accountId, Input input, String excludedId);
	Person create(String accountId, String id, Input input);
	Optional<Person> update(String accountId, String id, Input input);
}