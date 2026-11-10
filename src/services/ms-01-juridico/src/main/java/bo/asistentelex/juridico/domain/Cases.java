package bo.asistentelex.juridico.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import bo.asistentelex.juridico.domain.Administration.PageInfo;

public final class Cases {
	private Cases() {}
	public record Input(String code, String title, String description, String area, String initialAgentId) {}
	public record CaseFile(String id, String code, String title, String description, String area,
			String initialAgentId, String state, int version, boolean archiving) {
		public Eligibility eligibility() { return new Eligibility(id, state, initialAgentId, version, archiving, !archiving && !"ARCHIVED".equals(state)); }
	}
	public record Eligibility(String id, String state, String initialAgentId, int version, boolean archiving, boolean questionsAllowed) {}
	public record Transition(String id, String previousState, String newState, String date, String authorId, int version) {}
	public record ArchiveAttempt(String id, CaseFile caseFile) {}
	public record Filter(String state, String area, String code, String title) {}
	public record Page<T>(List<T> items, PageInfo pageInfo) {}
	public static final class Failure extends RuntimeException {
		private final String category;
		private final Map<String, String> fields;
		public Failure(String category, String message) { this(category, message, Map.of()); }
		public Failure(String category, String message, Map<String, String> fields) {
			super(message); this.category = category; this.fields = Map.copyOf(fields);
		}
		public String category() { return category; }
		public Map<String, String> fields() { return fields; }
	}
	public static Input validate(Input input) {
		if (input == null) throw new Failure("VALIDATION", "Debes completar el expediente.");
		var fields = new LinkedHashMap<String, String>();
		String code = text(input.code(), "code", 100, true, fields);
		String title = text(input.title(), "title", 300, true, fields);
		String description = text(input.description(), "description", 10000, false, fields);
		String area = text(input.area(), "area", 20, true, fields);
		String agent = text(input.initialAgentId(), "initialAgentId", 100, true, fields);
		if (area != null && !Set.of("CIVIL", "PENAL").contains(area)) fields.put("area", "Selecciona Civil o Penal.");
		if (agent != null && !Set.of("civilista", "penalista").contains(agent)) fields.put("initialAgentId", "Selecciona un agente del catalogo.");
		if (!fields.isEmpty()) throw new Failure("VALIDATION", "Revisa los campos indicados.", fields);
		return new Input(code, title, description, area, agent);
	}
	public static String next(String current, String action) {
		return switch (current + ":" + action) {
			case "OPEN:CLOSE" -> "CLOSED";
			case "CLOSED:REOPEN" -> "OPEN";
			case "CLOSED:ARCHIVE" -> "ARCHIVED";
			case "ARCHIVED:UNARCHIVE" -> "CLOSED";
			default -> throw new Failure("CONFLICT", "La transicion no esta permitida en el estado actual.");
		};
	}
	private static String text(String value, String field, int maximum, boolean required, Map<String, String> fields) {
		if (value == null || value.isBlank()) {
			if (required) fields.put(field, "Este campo es obligatorio.");
			return null;
		}
		String result = value.strip();
		if (result.length() > maximum || result.chars().anyMatch(code -> Character.isISOControl(code)
				&& !(field.equals("description") && (code == '\n' || code == '\t')))) fields.put(field, "El valor es demasiado largo o contiene caracteres no permitidos.");
		return result;
	}
}