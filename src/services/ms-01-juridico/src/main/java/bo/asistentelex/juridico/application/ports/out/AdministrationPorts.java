package bo.asistentelex.juridico.application.ports.out;

import java.util.List;
import java.util.Optional;
import bo.asistentelex.juridico.domain.Administration.*;

public final class AdministrationPorts {
	private AdministrationPorts() {}
	public interface Store {
		List<Lawyer> list(int limit, String afterEmail);
		Optional<Lawyer> lawyer(String id);
		Lawyer create(String id, String name, String email, String hash);
		Optional<Lawyer> setEnabled(String id, boolean enabled);
		Optional<Lawyer> resetPassword(String id, String hash);
		Settings settings();
		ParameterChange updateSetting(String key, String value);
	}
	public interface Events {
		boolean write(Event event);
		Page<Event> query(Filter filter, int first, String after);
	}
}