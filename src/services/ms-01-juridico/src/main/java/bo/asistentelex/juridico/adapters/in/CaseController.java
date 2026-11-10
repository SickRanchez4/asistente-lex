package bo.asistentelex.juridico.adapters.in;

import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.CaseService;
import bo.asistentelex.juridico.application.ports.out.CasePorts.RemoteContext;
import bo.asistentelex.juridico.domain.Cases.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/cases")
public class CaseController {
	private final CaseService service;
	public CaseController(CaseService service) { this.service = service; }
	@ModelAttribute
	void noStore(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }
	@GetMapping
	Page<CaseFile> list(@RequestParam(required = false) String state, @RequestParam(required = false) String area,
			@RequestParam(required = false) String code, @RequestParam(required = false) String title,
			@RequestParam(defaultValue = "25") int first, @RequestParam(required = false) String after, HttpServletRequest request) {
		return service.list(AdministrationController.actor(request), new Filter(state, area, code, title), first, after);
	}
	@GetMapping("/{id}")
	CaseFile get(@PathVariable String id, HttpServletRequest request) { return service.get(AdministrationController.actor(request), id); }
	@GetMapping("/{id}/eligibility")
	Eligibility eligibility(@PathVariable String id, HttpServletRequest request) { return service.get(AdministrationController.actor(request), id).eligibility(); }
	@PostMapping
	CaseFile create(@RequestBody Input input, HttpServletRequest request) { return service.create(AdministrationController.actor(request), input, remote(request)); }
	@PutMapping("/{id}")
	CaseFile update(@PathVariable String id, @RequestBody Update input, HttpServletRequest request) {
		return service.update(AdministrationController.actor(request), id, input.input(), version(input.expectedVersion()), remote(request));
	}
	@PostMapping("/{id}/transitions")
	CaseFile transition(@PathVariable String id, @RequestBody Change input, HttpServletRequest request) {
		return service.transition(AdministrationController.actor(request), id, input.action(), version(input.expectedVersion()), Boolean.TRUE.equals(input.confirmConversationDeletion()), remote(request));
	}
	@GetMapping("/{id}/transitions")
	Page<Transition> history(@PathVariable String id, @RequestParam(defaultValue = "25") int first,
			@RequestParam(required = false) String after, HttpServletRequest request) { return service.history(AdministrationController.actor(request), id, first, after); }
	private static int version(Integer value) { if (value == null) throw new Failure("VALIDATION", "Debes indicar la version actual del expediente."); return value; }
	private static RemoteContext remote(HttpServletRequest request) {
		String correlation = request.getHeader("X-Correlation-Id");
		if (correlation == null || !correlation.matches("[a-zA-Z0-9-]{1,100}")) correlation = UUID.randomUUID().toString();
		long budget = 10000;
		try { String header = request.getHeader("X-Lex-Deadline-Ms"); if (header != null) budget = Math.min(60000, Long.parseLong(header)); }
		catch (NumberFormatException invalid) { throw new Failure("VALIDATION", "El plazo no es valido."); }
		return new RemoteContext(correlation, System.nanoTime() + Math.max(0, budget) * 1_000_000);
	}
	record Update(Input input, Integer expectedVersion) {}
	record Change(String action, Integer expectedVersion, Boolean confirmConversationDeletion) {}
}