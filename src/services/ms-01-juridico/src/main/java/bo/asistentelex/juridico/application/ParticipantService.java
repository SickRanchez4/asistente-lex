package bo.asistentelex.juridico.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import bo.asistentelex.juridico.application.ports.out.ParticipantStore;
import bo.asistentelex.juridico.domain.Administration.PageInfo;
import bo.asistentelex.juridico.domain.Identity.*;
import bo.asistentelex.juridico.domain.Participants;
import bo.asistentelex.juridico.domain.Participants.*;

public final class ParticipantService {
	private final ParticipantStore store;
	private final AuthService auth;
	public ParticipantService(ParticipantStore store, AuthService auth) { this.store = store; this.auth = auth; }
	public Participant link(User actor, String caseId, String personId, Input input) {
		String account = account(actor), identifier = validId(caseId), person = validId(personId);
		return store.link(account, identifier, UUID.randomUUID().toString(), person, Participants.validate(input), actor.userId());
	}
	public Participant update(User actor, String caseId, String id, Input input, int expectedVersion) {
		String account = account(actor), parent = validId(caseId), identifier = validId(id); version(expectedVersion);
		return store.update(account, parent, identifier, Participants.validate(input), expectedVersion, actor.userId());
	}
	public Removal unlink(User actor, String caseId, String id, int expectedVersion) {
		String account = account(actor), parent = validId(caseId), identifier = validId(id); version(expectedVersion);
		return store.unlink(account, parent, identifier, expectedVersion, actor.userId());
	}
	public Page list(User actor, String caseId, int first, String after) {
		String account = account(actor), parent = validId(caseId);
		if (!store.ownsCase(account, parent)) throw Participants.missing();
		if (first < 1 || first > 100) throw invalid("El tamano de pagina debe estar entre 1 y 100.");
		String scope = scope(account, parent), position = "00000000-0000-0000-0000-000000000000";
		if (after != null) {
			try {
				if (after.length() > 256) throw new IllegalArgumentException();
				String[] parts = new String(Base64.getUrlDecoder().decode(after), StandardCharsets.UTF_8).split(":", -1);
				if (parts.length != 3 || !parts[0].equals("participants-v1") || !parts[1].equals(scope)) throw new IllegalArgumentException();
				position = validId(parts[2]);
			} catch (IllegalArgumentException ex) { throw invalid("La pagina no corresponde a esta consulta."); }
		}
		var rows = store.list(account, parent, first + 1, position);
		boolean more = rows.size() > first; var items = rows.stream().limit(first).toList();
		String cursor = more ? Base64.getUrlEncoder().withoutPadding().encodeToString(("participants-v1:" + scope + ":" + items.getLast().id()).getBytes(StandardCharsets.UTF_8)) : null;
		return new Page(items, new PageInfo(cursor, more));
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
	private static void version(int expected) { if (expected < 1) throw invalid("Debes indicar la version actual de la participacion."); }
	private static Failure invalid(String message) { return new Failure("VALIDATION", message); }
	private static String scope(String account, String caseId) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((account + "\n" + caseId).getBytes(StandardCharsets.UTF_8))); }
		catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
	}
}