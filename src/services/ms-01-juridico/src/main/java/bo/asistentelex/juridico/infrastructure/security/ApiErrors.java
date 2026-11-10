package bo.asistentelex.juridico.infrastructure.security;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrors {
	@ExceptionHandler(bo.asistentelex.juridico.domain.CaseRecords.Failure.class)
	ResponseEntity<?> caseRecords(bo.asistentelex.juridico.domain.CaseRecords.Failure failure) {
		int status = switch (failure.category()) {
			case "VALIDATION" -> 400;
			case "UNAUTHENTICATED" -> 401;
			case "FORBIDDEN" -> 403;
			case "NOT_FOUND" -> 404;
			case "CONFLICT" -> 409;
			default -> 503;
		};
		return ResponseEntity.status(status).body(Map.of("category", failure.category(), "message", failure.getMessage(),
				"fields", failure.fields().entrySet().stream().map(field -> Map.of("field", field.getKey(), "message", field.getValue())).toList()));
	}
	@ExceptionHandler(bo.asistentelex.juridico.domain.Participants.Failure.class)
	ResponseEntity<?> participants(bo.asistentelex.juridico.domain.Participants.Failure failure) {
		int status = switch (failure.category()) {
			case "VALIDATION" -> 400;
			case "UNAUTHENTICATED" -> 401;
			case "FORBIDDEN" -> 403;
			case "NOT_FOUND" -> 404;
			case "CONFLICT" -> 409;
			default -> 503;
		};
		return ResponseEntity.status(status).body(Map.of("category", failure.category(), "message", failure.getMessage(),
				"fields", failure.fields().entrySet().stream().map(field -> Map.of("field", field.getKey(), "message", field.getValue())).toList()));
	}
	@ExceptionHandler(bo.asistentelex.juridico.domain.Cases.Failure.class)
	ResponseEntity<?> cases(bo.asistentelex.juridico.domain.Cases.Failure failure) {
		int status = switch (failure.category()) {
			case "VALIDATION" -> 400;
			case "UNAUTHENTICATED" -> 401;
			case "FORBIDDEN" -> 403;
			case "NOT_FOUND" -> 404;
			case "CONFLICT" -> 409;
			case "PARTIAL_FAILURE" -> 502;
			default -> 503;
		};
		return ResponseEntity.status(status).body(Map.of("category", failure.category(), "message", failure.getMessage(),
				"fields", failure.fields().entrySet().stream().map(field -> Map.of("field", field.getKey(), "message", field.getValue())).toList()));
	}
	@ExceptionHandler(bo.asistentelex.juridico.domain.People.Failure.class)
	ResponseEntity<?> people(bo.asistentelex.juridico.domain.People.Failure failure) {
		int status = switch (failure.category()) {
			case "VALIDATION" -> 400;
			case "UNAUTHENTICATED" -> 401;
			case "FORBIDDEN" -> 403;
			case "NOT_FOUND" -> 404;
			case "CONFLICT" -> 409;
			default -> 503;
		};
		return ResponseEntity.status(status).body(Map.of("category", failure.category(), "message", failure.getMessage(),
				"fields", failure.fields().entrySet().stream().map(field -> Map.of("field", field.getKey(), "message", field.getValue())).toList()));
	}
	@ExceptionHandler(bo.asistentelex.juridico.domain.Administration.Failure.class)
	ResponseEntity<?> administration(bo.asistentelex.juridico.domain.Administration.Failure failure) {
		int status = switch (failure.category()) {
			case "VALIDATION" -> 400;
			case "UNAUTHENTICATED" -> 401;
			case "FORBIDDEN" -> 403;
			case "NOT_FOUND" -> 404;
			case "CONFLICT" -> 409;
			default -> 503;
		};
		return ResponseEntity.status(status).body(Map.of("category", failure.category(), "message", failure.getMessage()));
	}
	@ExceptionHandler(DataAccessException.class)
	ResponseEntity<?> storage() {
		System.err.println("[ms-01] Almacen de identidad no disponible.");
		return ResponseEntity.status(503).body(Map.of("category", "SERVICE_UNAVAILABLE", "message", "El servicio no está disponible."));
	}

	@ExceptionHandler({HttpMessageNotReadableException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
			org.springframework.web.bind.MissingServletRequestParameterException.class})
	ResponseEntity<?> validation() {
		return ResponseEntity.badRequest().body(Map.of("category", "VALIDATION", "message", "La solicitud no es válida."));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<?> unexpected() {
		System.err.println("[ms-01] Fallo interno sin detalles privados.");
		return ResponseEntity.status(503).body(Map.of("category", "SERVICE_UNAVAILABLE", "message", "El servicio no está disponible."));
	}
}