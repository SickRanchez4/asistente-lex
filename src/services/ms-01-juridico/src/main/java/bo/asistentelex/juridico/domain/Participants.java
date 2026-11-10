package bo.asistentelex.juridico.domain;

import java.util.List;
import java.util.Map;
import java.util.Set;
import bo.asistentelex.juridico.domain.Administration.PageInfo;
import bo.asistentelex.juridico.domain.People.Selection;

public final class Participants {
	private Participants() {}
	public record Input(String role, String detail) {}
	public record Participant(String id, Selection person, String role, String detail, int version) {}
	public record Page(List<Participant> items, PageInfo pageInfo) {}
	public record Removal(String id, boolean removed) {}
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
		if (input == null || input.role() == null || !Set.of("REPRESENTED_PERSON", "COUNTERPARTY", "WITNESS", "REPRESENTATIVE", "OTHER").contains(input.role())) {
			throw new Failure("VALIDATION", "Selecciona un rol del catalogo.", Map.of("role", "El rol no es valido."));
		}
		String detail = input.detail() == null || input.detail().isBlank() ? null : input.detail().strip();
		if ("OTHER".equals(input.role()) && (detail == null || detail.length() > 2000 || detail.chars().anyMatch(Character::isISOControl))) {
			throw new Failure("VALIDATION", "Otro requiere una descripcion valida.", Map.of("detail", "Indica una descripcion de hasta 2000 caracteres, sin caracteres de control."));
		}
		return new Input(input.role(), "OTHER".equals(input.role()) ? detail : null);
	}
	public static Failure missing() { return new Failure("NOT_FOUND", "El recurso no esta disponible."); }
	public static Failure conflict() { return new Failure("CONFLICT", "La participacion cambio o el expediente no admite cambios. Consulta su estado vigente."); }
}