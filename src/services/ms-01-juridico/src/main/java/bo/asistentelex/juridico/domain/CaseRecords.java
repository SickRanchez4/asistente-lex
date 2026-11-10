package bo.asistentelex.juridico.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class CaseRecords {
	private CaseRecords() {}
	public static final Set<String> TYPES = Set.of("HEARING", "FILING", "DECISION", "NOTIFICATION", "OTHER");
	public record ActuationInput(String type, String date, String description) {}
	public record ActuationFilter(String type, String fromDate, String toDate) {}
	public record NoteInput(String text) {}
	public record Actuation(String id, String type, String date, String description, int version) {}
	public record PrivateNote(String id, String text, String date, int version, String privacy) {}
	public record ActuationPage(List<Actuation> items, Administration.PageInfo pageInfo) {}
	public record NotePage(List<PrivateNote> items, Administration.PageInfo pageInfo) {}
	public static final class Failure extends RuntimeException {
		private final String category;
		private final Map<String, String> fields;
		public Failure(String category, String message) { this(category, message, Map.of()); }
		public Failure(String category, String message, Map<String, String> fields) { super(message); this.category = category; this.fields = Map.copyOf(fields); }
		public String category() { return category; }
		public Map<String, String> fields() { return fields; }
	}
	public static LocalDate today(Clock clock) { return LocalDate.now(clock.withZone(ZoneId.of("America/La_Paz"))); }
	public static ActuationInput validate(ActuationInput input, Clock clock) {
		var fields = new LinkedHashMap<String, String>();
		String type = input == null ? null : input.type();
		if (type == null || !TYPES.contains(type)) fields.put("type", "Selecciona un tipo de actuacion valido.");
		String date = civil(input == null ? null : input.date(), "date", fields);
		if (date != null && LocalDate.parse(date).isAfter(today(clock))) fields.put("date", "La fecha no puede ser futura respecto de Bolivia.");
		String description = text(input == null ? null : input.description(), "description", 10000, fields);
		if (!fields.isEmpty()) throw invalid(fields);
		return new ActuationInput(type, date, description);
	}
	public static ActuationFilter filter(ActuationFilter input) {
		var fields = new LinkedHashMap<String, String>();
		String type = input == null ? null : optional(input.type()), from = input == null ? null : optional(input.fromDate()), to = input == null ? null : optional(input.toDate());
		if (type != null && !TYPES.contains(type)) fields.put("type", "Selecciona un tipo de actuacion valido.");
		if (from != null) from = civil(from, "fromDate", fields);
		if (to != null) to = civil(to, "toDate", fields);
		if (from != null && to != null && from.compareTo(to) > 0) fields.put("toDate", "La fecha final debe ser igual o posterior a la inicial.");
		if (!fields.isEmpty()) throw invalid(fields);
		return new ActuationFilter(type, from, to);
	}
	public static NoteInput validate(NoteInput input) {
		var fields = new LinkedHashMap<String, String>();
		String value = text(input == null ? null : input.text(), "text", 20000, fields);
		if (!fields.isEmpty()) throw invalid(fields);
		return new NoteInput(value);
	}
	public static String search(String value) {
		String result = optional(value);
		if (result != null && (result.length() > 200 || controls(result))) throw invalid(Map.of("search", "La busqueda admite hasta 200 caracteres sin controles."));
		return result;
	}
	private static String optional(String value) { return value == null || value.isBlank() ? null : value.strip(); }
	private static String civil(String value, String field, Map<String, String> fields) {
		try { if (value != null && value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") && LocalDate.parse(value).getYear() >= 1) return value; }
		catch (java.time.DateTimeException ignored) {}
		fields.put(field, "Indica una fecha civil valida en formato AAAA-MM-DD."); return null;
	}
	private static String text(String value, String field, int maximum, Map<String, String> fields) {
		String result = optional(value);
		if (result == null || result.length() > maximum || controls(result)) fields.put(field, "Completa el texto obligatorio, hasta " + maximum + " caracteres sin controles no permitidos.");
		return result;
	}
	private static boolean controls(String value) { return value.codePoints().anyMatch(code -> Character.isISOControl(code) && code != '\n' && code != '\r' && code != '\t'); }
	private static Failure invalid(Map<String, String> fields) { return new Failure("VALIDATION", "Revisa los campos indicados.", fields); }
	public static Failure missing() { return new Failure("NOT_FOUND", "El recurso no esta disponible."); }
	public static Failure conflict() { return new Failure("CONFLICT", "El registro cambio o el expediente no admite cambios. Consulta su estado vigente."); }
}