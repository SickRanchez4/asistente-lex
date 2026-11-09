package bo.asistentelex.juridico.infrastructure.health;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Comprobación técnica de disponibilidad según el contrato común de la spec 000.
 */
@RestController
class HealthController {

	private static final String SERVICE_NAME = "ms-01-juridico";

	private static final String UP = "UP";

	private static final String DOWN = "DOWN";

	private final List<DependencyProbe> probes;

	private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

	HealthController(List<DependencyProbe> probes) {
		this.probes = probes;
	}

	@GetMapping("/health")
	ResponseEntity<HealthResponse> health() {
		// Las comprobaciones se ejecutan en paralelo para que la respuesta
		// no supere el tiempo de espera de una sola dependencia.
		Map<String, CompletableFuture<Boolean>> checks = new LinkedHashMap<>();
		for (DependencyProbe probe : this.probes) {
			checks.put(probe.name(), CompletableFuture.supplyAsync(probe::isAvailable, this.executor));
		}

		Map<String, String> dependencies = new LinkedHashMap<>();
		checks.forEach((name, check) -> dependencies.put(name, check.join() ? UP : DOWN));

		boolean allUp = dependencies.values().stream().allMatch(UP::equals);
		HealthResponse body = new HealthResponse(SERVICE_NAME, allUp ? UP : DOWN, dependencies);
		return ResponseEntity.status(allUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
	}

	record HealthResponse(String service, String status, Map<String, String> dependencies) {
	}

}
