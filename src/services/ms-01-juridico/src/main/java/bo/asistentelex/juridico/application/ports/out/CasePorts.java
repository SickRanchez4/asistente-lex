package bo.asistentelex.juridico.application.ports.out;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import bo.asistentelex.juridico.domain.Cases.*;
import bo.asistentelex.juridico.domain.Identity.User;

public final class CasePorts {
	private CasePorts() {}
	public record RemoteContext(String correlationId, long deadlineNanos) {
		public static RemoteContext local() { return new RemoteContext(UUID.randomUUID().toString(), System.nanoTime() + 60_000_000_000L); }
	}
	public interface Store {
		CaseFile create(String account, String id, Input input);
		Optional<CaseFile> find(String account, String id);
		List<CaseFile> list(String account, Filter filter, int limit, String afterId);
		CaseFile update(String account, String id, Input input, int version);
		CaseFile transition(String account, String id, String previous, String next, int version, String author);
		ArchiveAttempt beginArchive(String account, String id, int version);
		CaseFile finishArchive(String account, String id, String attemptId, int version, String author);
		List<Transition> history(String account, String id, int limit, int afterVersion);
	}
	public interface Intelligence {
		void requireEnabled(User actor, String agentId, RemoteContext context);
		void deleteConversations(User actor, String caseId, String attemptId, RemoteContext context);
	}
}