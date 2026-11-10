package bo.asistentelex.juridico.application.ports.out;

import java.util.List;
import bo.asistentelex.juridico.domain.CaseRecords.*;

public interface CaseRecordStore {
	record Position(String date, String id) {}
	boolean ownsCase(String account, String caseId);
	Actuation actuation(String account, String caseId, String id);
	PrivateNote note(String account, String caseId, String id);
	List<Actuation> actuations(String account, String caseId, ActuationFilter filter, int limit, Position after);
	List<PrivateNote> notes(String account, String caseId, String search, int limit, Position after);
	Actuation createActuation(String account, String caseId, String id, ActuationInput input, String author);
	Actuation updateActuation(String account, String caseId, String id, ActuationInput input, int version, String author);
	PrivateNote createNote(String account, String caseId, String id, NoteInput input);
	PrivateNote updateNote(String account, String caseId, String id, NoteInput input, int version);
}