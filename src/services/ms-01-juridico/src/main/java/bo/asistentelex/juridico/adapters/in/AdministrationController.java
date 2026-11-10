package bo.asistentelex.juridico.adapters.in;

import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.AdministrationService;
import bo.asistentelex.juridico.domain.Administration.*;
import bo.asistentelex.juridico.domain.Identity.*;
import bo.asistentelex.juridico.infrastructure.security.VerifiedIdentity;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class AdministrationController {
	private final AdministrationService service;
	public AdministrationController(AdministrationService service) { this.service = service; }
	static User actor(HttpServletRequest request) {
		var identity = (VerifiedIdentity) request.getAttribute(VerifiedIdentity.REQUEST_ATTRIBUTE);
		return identity == null ? null : new User(identity.userId(), identity.accountId(), Role.valueOf(identity.role()), "");
	}
	@GetMapping("/admin/accounts")
	Page<Lawyer> accounts(@RequestParam(defaultValue = "25") int first, @RequestParam(required = false) String after, HttpServletRequest request) {
		return service.accounts(actor(request), first, after);
	}
	@GetMapping("/admin/accounts/{id}")
	Lawyer account(@PathVariable String id, HttpServletRequest request) { return service.account(actor(request), id); }
	@PostMapping("/admin/accounts")
	Change create(@RequestBody Create body, HttpServletRequest request) { return service.create(actor(request), body.name(), body.email(), body.password()); }
	@PutMapping("/admin/accounts/{id}/enabled")
	Change enabled(@PathVariable String id, @RequestBody Enabled body, HttpServletRequest request) {
		if (body.enabled() == null) throw new Failure("VALIDATION", "Debes indicar el estado.");
		return service.setEnabled(actor(request), id, body.enabled());
	}
	@PutMapping("/admin/accounts/{id}/password")
	Change password(@PathVariable String id, @RequestBody Password body, HttpServletRequest request) { return service.resetPassword(actor(request), id, body.password()); }
	@GetMapping("/public/settings")
	Settings settings() { return service.publicSettings(); }
	@PutMapping("/admin/settings/{key}")
	Change setting(@PathVariable String key, @RequestBody Setting body, HttpServletRequest request) { return service.updateSetting(actor(request), key, body.value()); }
	@GetMapping("/admin/audit-events")
	Page<Event> events(@RequestParam(required = false) String type, @RequestParam(required = false) String from,
			@RequestParam(required = false) String until, @RequestParam(required = false) String userId,
			@RequestParam(defaultValue = "25") int first, @RequestParam(required = false) String after, HttpServletRequest request) {
		return service.auditEvents(actor(request), new Filter(type, from, until, userId), first, after);
	}
	record Create(String name, String email, String password) {}
	record Enabled(Boolean enabled) {}
	record Password(String password) {}
	record Setting(String value) {}
}