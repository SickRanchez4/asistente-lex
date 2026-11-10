package bo.asistentelex.juridico.application.ports.out;

import java.util.List;
import bo.asistentelex.juridico.domain.Participants.*;

public interface ParticipantStore {
	boolean ownsCase(String account, String caseId);
	List<Participant> list(String account, String caseId, int limit, String afterId);
	Participant link(String account, String caseId, String id, String personId, Input input, String author);
	Participant update(String account, String caseId, String id, Input input, int version, String author);
	Removal unlink(String account, String caseId, String id, int version, String author);
}