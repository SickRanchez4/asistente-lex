package bo.asistentelex.juridico.infrastructure.security;

/**
 * Identidad del solicitante firmada por el Gateway; la cuenta efectiva sale de aquí, nunca de parámetros.
 */
public record VerifiedIdentity(String userId, String role, String accountId) {

	/** Atributo de la solicitud donde los controladores leen la identidad verificada. */
	public static final String REQUEST_ATTRIBUTE = VerifiedIdentity.class.getName();

}
