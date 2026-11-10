package bo.asistentelex.juridico.infrastructure.security;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrors {
	@ExceptionHandler(DataAccessException.class)
	ResponseEntity<?> storage() {
		System.err.println("[ms-01] Almacen de identidad no disponible.");
		return ResponseEntity.status(503).body(Map.of("category", "SERVICE_UNAVAILABLE", "message", "El servicio no está disponible."));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<?> validation() {
		return ResponseEntity.badRequest().body(Map.of("category", "VALIDATION", "message", "La solicitud no es válida."));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<?> unexpected() {
		System.err.println("[ms-01] Fallo interno sin detalles privados.");
		return ResponseEntity.status(503).body(Map.of("category", "SERVICE_UNAVAILABLE", "message", "El servicio no está disponible."));
	}
}