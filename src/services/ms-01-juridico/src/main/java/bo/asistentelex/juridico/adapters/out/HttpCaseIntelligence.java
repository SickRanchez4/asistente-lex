package bo.asistentelex.juridico.adapters.out;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import bo.asistentelex.juridico.application.ports.out.CasePorts.*;
import bo.asistentelex.juridico.domain.Cases.Failure;
import bo.asistentelex.juridico.domain.Identity.User;

@Component
public class HttpCaseIntelligence implements Intelligence {
	private final String url;
	private final String token;
	private final String signingKey;
	private final JsonMapper json;
	private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
	public HttpCaseIntelligence(@Value("${asistentelex.cases.ms04-url}") String url, @Value("${asistentelex.cases.ms04-token}") String token,
			@Value("${asistentelex.internal.user-context-signing-key}") String signingKey, JsonMapper json) {
		this.url = url.replaceAll("/+$", ""); this.token = token; this.signingKey = signingKey; this.json = json;
	}
	public void requireEnabled(User actor, String agentId, RemoteContext context) {
		var body = call(actor, "/agents/" + agentId + "/availability", null, context, true);
		if (!agentId.equals(body.get("id")) || !Boolean.TRUE.equals(body.get("enabled"))) throw unavailable();
	}
	public void deleteConversations(User actor, String caseId, String attemptId, RemoteContext context) {
		var body = call(actor, "/cases/" + caseId + "/conversations/delete", Map.of("archiveAttemptId", attemptId), context, false);
		Object generation = body.get("generation");
		if (!Boolean.TRUE.equals(body.get("deleted")) || !caseId.equals(body.get("caseId")) || !attemptId.equals(body.get("archiveAttemptId"))
				|| !(generation instanceof Integer || generation instanceof Long) || ((Number) generation).longValue() < 1) throw unavailable();
	}
	private Map<?, ?> call(User actor, String path, Map<String, String> body, RemoteContext context, boolean availability) {
		try {
			long remaining = Math.min(8000, (context.deadlineNanos() - System.nanoTime()) / 1_000_000);
			if (token.isBlank() || signingKey.length() < 32 || remaining < 1) throw unavailable();
			String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(Map.of("userId", actor.userId(),
					"accountId", actor.accountId(), "role", actor.role().name(), "exp", Instant.now().getEpochSecond() + 120)));
			var mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(signingKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.US_ASCII)));
			var request = HttpRequest.newBuilder(URI.create(url + path)).timeout(Duration.ofMillis(remaining)).header("Accept", "application/json")
					.header("Authorization", "Bearer " + token).header("X-Lex-User-Context", payload + "." + signature)
					.header("X-Correlation-Id", context.correlationId()).header("X-Lex-Deadline-Ms", Long.toString(remaining));
			if (body != null) request.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
			var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
			if (availability && response.statusCode() == 409) throw new Failure("CONFLICT", "El agente inicial esta deshabilitado.", Map.of("initialAgentId", "Selecciona un agente habilitado."));
			if (availability && response.statusCode() == 404) throw new Failure("VALIDATION", "El agente inicial no esta disponible.", Map.of("initialAgentId", "Selecciona un agente del catalogo."));
			if (response.statusCode() != 200) throw unavailable();
			Map<?, ?> parsed = json.readValue(response.body(), Map.class);
			if (parsed == null) throw unavailable();
			return parsed;
		} catch (Failure failure) { throw failure; }
		catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw unavailable(); }
		catch (Exception failure) { throw unavailable(); }
	}
	private static Failure unavailable() { return new Failure("SERVICE_UNAVAILABLE", "No se pudo confirmar la operacion con el servicio de IA."); }
}