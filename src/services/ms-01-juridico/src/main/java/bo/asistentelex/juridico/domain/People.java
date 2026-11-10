package bo.asistentelex.juridico.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class People {
	private People() {}
	public record Input(String type, String firstNames, String lastNames, String businessName,
			String documentType, String documentNumber, String issuingCountry, String phone, String email, String address) {}
	public record Person(String id, String type, String firstNames, String lastNames, String businessName,
			String documentType, String documentNumber, String issuingCountry, String phone, String email, String address) {
		public String getDisplayName() { return "NATURAL".equals(type) ? firstNames + " " + lastNames : businessName; }
		public Selection selection() { return new Selection(id, type, getDisplayName()); }
	}
	public record Selection(String id, String type, String displayName) {}
	public record Filter(String name, String type, String document) {}
	public record Page<T>(List<T> items, bo.asistentelex.juridico.domain.Administration.PageInfo pageInfo) {}
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
		if (input == null) throw new Failure("VALIDATION", "Debes completar la ficha.");
		var fields = new LinkedHashMap<String, String>();
		String type = text(input.type(), "type", 20, fields);
		if (type == null || !Set.of("NATURAL", "LEGAL").contains(type)) fields.put("type", "Selecciona el tipo de persona.");
		String first = text(input.firstNames(), "firstNames", 200, fields);
		String last = text(input.lastNames(), "lastNames", 200, fields);
		String business = text(input.businessName(), "businessName", 300, fields);
		if ("NATURAL".equals(type)) {
			if (first == null) fields.put("firstNames", "Los nombres son obligatorios.");
			if (last == null) fields.put("lastNames", "Los apellidos son obligatorios.");
			business = null;
		} else if ("LEGAL".equals(type)) {
			if (business == null) fields.put("businessName", "La razon social es obligatoria.");
			first = null; last = null;
		}
		String documentType = text(input.documentType(), "documentType", 100, fields);
		String number = text(input.documentNumber(), "documentNumber", 100, fields);
		String country = text(input.issuingCountry(), "issuingCountry", 100, fields);
		if (documentType != null || number != null || country != null) {
			if (documentType == null) fields.put("documentType", "Completa el tipo de documento.");
			if (number == null) fields.put("documentNumber", "Completa el numero de documento.");
			if (country == null) fields.put("issuingCountry", "Completa el pais emisor.");
		}
		String phone = text(input.phone(), "phone", 100, fields);
		String email = text(input.email(), "email", 254, fields);
		String address = text(input.address(), "address", 1000, fields);
		if (!fields.isEmpty()) throw new Failure("VALIDATION", "Revisa los campos indicados.", fields);
		return new Input(type, first, last, business, documentType, number, country, phone, email, address);
	}
	private static String text(String value, String field, int maximum, Map<String, String> fields) {
		if (value == null || value.isBlank()) return null;
		String result = value.strip();
		if (result.length() > maximum || result.chars().anyMatch(Character::isISOControl)) fields.put(field, "El valor es demasiado largo o contiene caracteres no permitidos.");
		return result;
	}
}