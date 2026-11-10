package bo.asistentelex.juridico.adapters.in;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.CaseRecordService;
import bo.asistentelex.juridico.domain.CaseRecords.*;

@RestController
@RequestMapping("/cases/{caseId}")
public class CaseRecordController {
	private final CaseRecordService service;
	public CaseRecordController(CaseRecordService service) { this.service = service; }
	@ModelAttribute
	void noStore(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }
	@GetMapping("/actuations")
	ActuationPage actuations(@PathVariable String caseId, @RequestParam(defaultValue = "25") int first, @RequestParam(required = false) String after, @RequestParam(required = false) String type, @RequestParam(required = false) String fromDate, @RequestParam(required = false) String toDate, HttpServletRequest request) {
		return service.actuations(AdministrationController.actor(request), caseId, new ActuationFilter(type, fromDate, toDate), first, after);
	}
	@GetMapping("/actuations/{id}")
	Actuation actuation(@PathVariable String caseId, @PathVariable String id, HttpServletRequest request) { return service.actuation(AdministrationController.actor(request), caseId, id); }
	@PostMapping("/actuations")
	Actuation createActuation(@PathVariable String caseId, @RequestBody ActuationInput input, HttpServletRequest request) { return service.createActuation(AdministrationController.actor(request), caseId, input); }
	@PutMapping("/actuations/{id}")
	Actuation updateActuation(@PathVariable String caseId, @PathVariable String id, @RequestBody ActuationChange body, HttpServletRequest request) { return service.updateActuation(AdministrationController.actor(request), caseId, id, body.input(), version(body.expectedVersion())); }
	@GetMapping("/private-notes")
	NotePage notes(@PathVariable String caseId, @RequestParam(defaultValue = "25") int first, @RequestParam(required = false) String after, @RequestParam(required = false) String search, HttpServletRequest request) { return service.notes(AdministrationController.actor(request), caseId, search, first, after); }
	@GetMapping("/private-notes/{id}")
	PrivateNote note(@PathVariable String caseId, @PathVariable String id, HttpServletRequest request) { return service.note(AdministrationController.actor(request), caseId, id); }
	@PostMapping("/private-notes")
	PrivateNote createNote(@PathVariable String caseId, @RequestBody NoteInput input, HttpServletRequest request) { return service.createNote(AdministrationController.actor(request), caseId, input); }
	@PutMapping("/private-notes/{id}")
	PrivateNote updateNote(@PathVariable String caseId, @PathVariable String id, @RequestBody NoteChange body, HttpServletRequest request) { return service.updateNote(AdministrationController.actor(request), caseId, id, body.input(), version(body.expectedVersion())); }
	private static int version(Integer value) { if (value == null) throw new Failure("VALIDATION", "Debes indicar la version actual del registro."); return value; }
	public record ActuationChange(ActuationInput input, Integer expectedVersion) {}
	public record NoteChange(NoteInput input, Integer expectedVersion) {}
}