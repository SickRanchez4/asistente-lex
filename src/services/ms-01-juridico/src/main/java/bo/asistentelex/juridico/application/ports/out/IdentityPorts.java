package bo.asistentelex.juridico.application.ports.out;

import java.time.Instant;
import java.util.Optional;
import bo.asistentelex.juridico.domain.Identity.Account;
import bo.asistentelex.juridico.domain.Identity.Session;

public final class IdentityPorts {
	private IdentityPorts() {}

	public interface Accounts {
		Optional<Account> byEmail(String email);
		Optional<Account> byId(String id);
		boolean updatePassword(String id, String previousHash, String hash);
		void insertDemo(Account account);
	}

	public interface Sessions {
		void create(Session session);
		Optional<Session> find(String tokenHash);
		boolean touch(String tokenHash, Instant now);
		void delete(String tokenHash);
		void invalidateAccount(String accountId);
	}

	public interface Passwords {
		String hash(String password);
		boolean matches(String password, String hash);
	}

	public interface Tokens {
		String generate();
		String digest(String token);
	}

	public interface Audit {
		boolean record(String type, String userId, String result);
		boolean recordEvent(String eventId, String type, String userId, String result);
	}
}