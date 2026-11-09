package bo.asistentelex.juridico.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Credencial propia de MS-01 para llamadas REST internas y clave compartida para
 * verificar el contexto de usuario firmado. Valores vacíos rechazan toda llamada.
 */
@ConfigurationProperties(prefix = "asistentelex.internal")
public record InternalAuthProperties(String apiToken, String userContextSigningKey) {

	public InternalAuthProperties {
		apiToken = apiToken == null ? "" : apiToken;
		userContextSigningKey = userContextSigningKey == null ? "" : userContextSigningKey;
	}

}
