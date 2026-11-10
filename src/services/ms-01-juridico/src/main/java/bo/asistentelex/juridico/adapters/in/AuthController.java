package bo.asistentelex.juridico.adapters.in;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.AuthService;
import bo.asistentelex.juridico.application.AdministrationService;
import bo.asistentelex.juridico.domain.Identity.Result;
import bo.asistentelex.juridico.infrastructure.security.VerifiedIdentity;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class AuthController {
	private final AuthService auth;
	private final AdministrationService administration;

	public AuthController(AuthService auth, AdministrationService administration) { this.auth = auth; this.administration = administration; }

	@PostMapping("/auth/login")
	Result login(@RequestBody Login body) { return auth.login(body.email(), body.password()); }

	@PostMapping("/auth/verify")
	Result verify(@RequestBody Verify body) { return auth.verify(body.token(), body.active()); }

	@PostMapping("/auth/logout")
	Result logout(@RequestBody Token body) { return auth.logout(body.token()); }

	@PostMapping("/auth/password")
	Result password(@RequestBody Password body) { return auth.changePassword(body.token(), body.currentPassword(), body.newPassword()); }

	@PostMapping("/auth/denial")
	Result denial(@RequestBody Token body) { return auth.denial(body.token()); }

	@PostMapping("/audit/events")
	ResponseEntity<?> event(@RequestBody Event body, HttpServletRequest request) {
		var identity = (VerifiedIdentity) request.getAttribute(VerifiedIdentity.REQUEST_ATTRIBUTE);
		if (identity == null) return ResponseEntity.status(403).body(Map.of("category", "FORBIDDEN", "message", "Se requiere usuario verificado."));
		if ("AGENT_ACTION".equals(body.type())) {
			if (!"SUCCESS".equals(body.result())) throw new bo.asistentelex.juridico.domain.Administration.Failure("VALIDATION", "El evento debe corresponder a un cambio aplicado.");
			return ResponseEntity.ok(administration.receiveAgentEvent(AdministrationController.actor(request),
					body.eventId(), body.operation(), body.agentId(), body.date()));
		}
		if (!"AI_ACTION".equals(body.type()) && !"ACCESS_DENIED".equals(body.type())) {
			throw new bo.asistentelex.juridico.domain.Administration.Failure("VALIDATION", "Tipo de evento no permitido para MS-04.");
		}
		return ResponseEntity.ok(auth.receiveEvent(identity.userId(), identity.accountId(), identity.role(),
				body.eventId(), body.type(), body.result()));
	}

	record Login(String email, String password) {}
	record Verify(String token, boolean active) {}
	record Token(String token) {}
	record Password(String token, String currentPassword, String newPassword) {}
	record Event(String eventId, String type, String result, String operation, String agentId, String date) {}
}