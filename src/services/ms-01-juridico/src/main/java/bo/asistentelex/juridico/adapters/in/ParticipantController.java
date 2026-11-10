package bo.asistentelex.juridico.adapters.in;

import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.ParticipantService;
import bo.asistentelex.juridico.domain.Participants.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/cases/{caseId}/participants")
public class ParticipantController {
	private final ParticipantService service;
	public ParticipantController(ParticipantService service) { this.service = service; }
	@ModelAttribute
	void noStore(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }
	@GetMapping
	Page list(@PathVariable String caseId, @RequestParam(defaultValue = "25") int first, @RequestParam(required = false) String after, HttpServletRequest request) {
		return service.list(AdministrationController.actor(request), caseId, first, after);
	}
	@PostMapping
	Participant link(@PathVariable String caseId, @RequestBody Link body, HttpServletRequest request) {
		return service.link(AdministrationController.actor(request), caseId, body.personId(), body.input());
	}
	@PutMapping("/{id}")
	Participant update(@PathVariable String caseId, @PathVariable String id, @RequestBody Change body, HttpServletRequest request) {
		return service.update(AdministrationController.actor(request), caseId, id, body.input(), version(body.expectedVersion()));
	}
	@DeleteMapping("/{id}")
	Removal unlink(@PathVariable String caseId, @PathVariable String id, @RequestParam int expectedVersion, HttpServletRequest request) {
		return service.unlink(AdministrationController.actor(request), caseId, id, expectedVersion);
	}
	private static int version(Integer value) { if (value == null) throw new Failure("VALIDATION", "Debes indicar la version actual de la participacion."); return value; }
	record Link(String personId, Input input) {}
	record Change(Input input, Integer expectedVersion) {}
}