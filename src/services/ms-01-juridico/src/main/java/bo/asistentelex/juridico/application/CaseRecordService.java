package bo.asistentelex.juridico.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import bo.asistentelex.juridico.application.ports.out.CaseRecordStore;
import bo.asistentelex.juridico.application.ports.out.CaseRecordStore.Position;
import bo.asistentelex.juridico.domain.Administration.PageInfo;
import bo.asistentelex.juridico.domain.CaseRecords;
import bo.asistentelex.juridico.domain.CaseRecords.*;
import bo.asistentelex.juridico.domain.Identity.*;

public final class CaseRecordService {
	private final CaseRecordStore store;
	private final AuthService auth;
	private final Clock clock;
	public CaseRecordService(CaseRecordStore store, AuthService auth, Clock clock) { this.store = store; this.auth = auth; this.clock = clock; }
	public Actuation createActuation(User actor, String caseId, ActuationInput input) {
		String account = account(actor), parent = id(caseId);
		return store.createActuation(account, parent, UUID.randomUUID().toString(), CaseRecords.validate(input, clock), actor.userId());
	}
	public Actuation updateActuation(User actor, String caseId, String identifier, ActuationInput input, int expectedVersion) {
		String account = account(actor), parent = id(caseId), record = id(identifier); version(expectedVersion);
		return store.updateActuation(account, parent, record, CaseRecords.validate(input, clock), expectedVersion, actor.userId());
	}
	public PrivateNote createNote(User actor, String caseId, NoteInput input) {
		String account = account(actor), parent = id(caseId);
		return store.createNote(account, parent, UUID.randomUUID().toString(), CaseRecords.validate(input));
	}
	public PrivateNote updateNote(User actor, String caseId, String identifier, NoteInput input, int expectedVersion) {
		String account = account(actor), parent = id(caseId), record = id(identifier); version(expectedVersion);
		return store.updateNote(account, parent, record, CaseRecords.validate(input), expectedVersion);
	}
	public Actuation actuation(User actor, String caseId, String identifier) { return store.actuation(account(actor), id(caseId), id(identifier)); }
	public PrivateNote note(User actor, String caseId, String identifier) { return store.note(account(actor), id(caseId), id(identifier)); }
	public ActuationPage actuations(User actor, String caseId, ActuationFilter filter, int first, String after) {
		String account = account(actor), parent = id(caseId); readable(account, parent, first);
		var data = CaseRecords.filter(filter);
		String scope = scope(account, parent, "actuations", data.type() + "\n" + data.fromDate() + "\n" + data.toDate());
		var rows = store.actuations(account, parent, data, first + 1, position(after, scope, true));
		boolean more = rows.size() > first; var items = rows.stream().limit(first).toList();
		return new ActuationPage(items, new PageInfo(more ? cursor(scope, items.getLast().date(), items.getLast().id()) : null, more));
	}
	public NotePage notes(User actor, String caseId, String search, int first, String after) {
		String account = account(actor), parent = id(caseId); readable(account, parent, first);
		String data = CaseRecords.search(search), scope = scope(account, parent, "private-notes", data == null ? "" : data);
		var rows = store.notes(account, parent, data, first + 1, position(after, scope, false));
		boolean more = rows.size() > first; var items = rows.stream().limit(first).toList();
		return new NotePage(items, new PageInfo(more ? cursor(scope, items.getLast().date(), items.getLast().id()) : null, more));
	}
	private void readable(String account, String parent, int first) {
		if (!store.ownsCase(account, parent)) throw CaseRecords.missing();
		if (first < 1 || first > 100) throw invalid("El tamano de pagina debe estar entre 1 y 100.");
	}
	private String account(User actor) {
		if (actor == null) throw new Failure("UNAUTHENTICATED", "Debes iniciar sesion.");
		var result = auth.authorize(actor.userId(), actor.accountId(), actor.role().name(), Role.ABOGADO, null);
		if (!result.success()) throw new Failure(result.category(), result.message());
		return result.user().accountId();
	}
	private static String id(String value) {
		try { if (value != null && UUID.fromString(value).toString().equalsIgnoreCase(value)) return UUID.fromString(value).toString(); }
		catch (IllegalArgumentException ignored) {}
		throw invalid("El identificador no es valido.");
	}
	private static void version(int value) { if (value < 1) throw invalid("Debes indicar la version actual del registro."); }
	private static Failure invalid(String message) { return new Failure("VALIDATION", message); }
	private static String scope(String account, String parent, String kind, String filter) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((account + "\n" + parent + "\n" + kind + "\n" + filter).getBytes(StandardCharsets.UTF_8))); }
		catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
	}
	private static String cursor(String scope, String date, String id) { return Base64.getUrlEncoder().withoutPadding().encodeToString(("records-v1\n" + scope + "\n" + date + "\n" + id).getBytes(StandardCharsets.UTF_8)); }
	private static Position position(String value, String scope, boolean civil) {
		if (value == null) return null;
		try {
			if (value.length() > 512) throw new IllegalArgumentException();
			String[] parts = new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8).split("\n", -1);
			if (parts.length != 4 || !parts[0].equals("records-v1") || !parts[1].equals(scope)) throw new IllegalArgumentException();
			if (civil) { if (!parts[2].matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || LocalDate.parse(parts[2]).getYear() < 1) throw new IllegalArgumentException(); }
			else Instant.parse(parts[2]);
			return new Position(parts[2], id(parts[3]));
		} catch (IllegalArgumentException | java.time.DateTimeException ex) { throw invalid("La pagina no corresponde a esta consulta."); }
	}
}