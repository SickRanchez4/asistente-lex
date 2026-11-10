package bo.asistentelex.juridico.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import bo.asistentelex.juridico.application.ports.out.PeopleStore;
import bo.asistentelex.juridico.domain.Administration.PageInfo;
import bo.asistentelex.juridico.domain.Identity.*;
import bo.asistentelex.juridico.domain.People;
import bo.asistentelex.juridico.domain.People.*;

public final class PeopleService {
	private final PeopleStore store;
	private final AuthService auth;
	public PeopleService(PeopleStore store, AuthService auth) { this.store = store; this.auth = auth; }
	public Person create(User actor, Input input) {
		String account = account(actor);
		var data = People.validate(input);
		String id = UUID.randomUUID().toString();
		if (data.documentType() != null && store.documentExists(account, data, id)) throw duplicate();
		return store.create(account, id, data);
	}
	public Person get(User actor, String id) {
		return store.find(account(actor), validId(id)).orElseThrow(PeopleService::missing);
	}
	public Person update(User actor, String id, Input input) {
		String account = account(actor), identifier = validId(id);
		if (store.find(account, identifier).isEmpty()) throw missing();
		var data = People.validate(input);
		if (data.documentType() != null && store.documentExists(account, data, identifier)) throw duplicate();
		return store.update(account, identifier, data).orElseThrow(PeopleService::missing);
	}
	public Page<Person> list(User actor, Filter input, int first, String after) {
		String account = account(actor);
		if (first < 1 || first > 100) throw invalid("El tamano de pagina debe estar entre 1 y 100.");
		var filter = input == null ? new Filter(null, null, null) : new Filter(filterText(input.name(), 300), filterText(input.type(), 20), filterText(input.document(), 100));
		if (filter.type() != null && !Set.of("NATURAL", "LEGAL").contains(filter.type())) throw invalid("El tipo de persona no es valido.");
		String fingerprint = fingerprint(account, filter), afterId = "00000000-0000-0000-0000-000000000000";
		if (after != null) {
			try {
				if (after.length() > 256) throw new IllegalArgumentException();
				String decoded = new String(Base64.getUrlDecoder().decode(after), StandardCharsets.UTF_8);
				String[] parts = decoded.split(":", -1);
				if (parts.length != 3 || !parts[0].equals("people-v1") || !parts[1].equals(fingerprint)) throw new IllegalArgumentException();
				afterId = validId(parts[2]);
			} catch (IllegalArgumentException ex) { throw invalid("La pagina no corresponde a esta consulta."); }
		}
		var rows = store.list(account, filter, first + 1, afterId);
		boolean more = rows.size() > first;
		var items = rows.stream().limit(first).toList();
		String cursor = more ? Base64.getUrlEncoder().withoutPadding().encodeToString(("people-v1:" + fingerprint + ":" + items.getLast().id()).getBytes(StandardCharsets.UTF_8)) : null;
		return new Page<>(items, new PageInfo(cursor, more));
	}
	public Page<Selection> selections(User actor, Filter filter, int first, String after) {
		var page = list(actor, filter, first, after);
		return new Page<>(page.items().stream().map(Person::selection).toList(), page.pageInfo());
	}
	private String account(User actor) {
		if (actor == null) throw new Failure("UNAUTHENTICATED", "Debes iniciar sesion.");
		var result = auth.authorize(actor.userId(), actor.accountId(), actor.role().name(), Role.ABOGADO, null);
		if (!result.success()) throw new Failure(result.category(), result.message());
		return result.user().accountId();
	}
	private static String validId(String value) {
		try { if (value != null && UUID.fromString(value).toString().equalsIgnoreCase(value)) return UUID.fromString(value).toString(); }
		catch (IllegalArgumentException ignored) {}
		throw invalid("El identificador no es valido.");
	}
	private static String filterText(String value, int maximum) {
		if (value == null || value.isBlank()) return null;
		String result = value.strip();
		if (result.length() > maximum || result.chars().anyMatch(Character::isISOControl)) throw invalid("El filtro no es valido.");
		return result;
	}
	private static String fingerprint(String account, Filter filter) {
		try {
			String value = account + "\n" + (filter.name() == null ? "" : filter.name())
					+ "\n" + (filter.type() == null ? "" : filter.type()) + "\n" + (filter.document() == null ? "" : filter.document());
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
	}
	public static Failure duplicate() {
		String message = "La identificacion ya esta registrada en tu cuenta.";
		return new Failure("CONFLICT", message, Map.of("documentType", message, "documentNumber", message, "issuingCountry", message));
	}
	private static Failure invalid(String message) { return new Failure("VALIDATION", message); }
	private static Failure missing() { return new Failure("NOT_FOUND", "La persona no esta disponible."); }
}