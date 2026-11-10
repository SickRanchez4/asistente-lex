package bo.asistentelex.juridico.infrastructure.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.Set;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.json.JsonMapper;

/**
 * Toda ruta salvo GET /health exige autenticación interna (spec 002): credencial
 * del servicio y, si se envía, contexto de usuario firmado y vigente.
 */
@Component
class InternalAuthFilter extends OncePerRequestFilter {

	private static final String USER_CONTEXT_HEADER = "X-Lex-User-Context";

	private static final String BEARER_PREFIX = "Bearer ";

	private static final int MIN_SIGNING_KEY_LENGTH = 32;

	private static final Set<String> ROLES = Set.of("ABOGADO", "ADMINISTRADOR");

	private static final String UNAUTHENTICATED_BODY = "{\"category\":\"UNAUTHENTICATED\",\"message\":\"Solicitud interna no autenticada.\"}";

	private final InternalAuthProperties properties;

	private final JsonMapper jsonMapper;
	private final String ms04AuditToken;

	InternalAuthFilter(InternalAuthProperties properties, JsonMapper jsonMapper,
			@Value("${asistentelex.internal.ms04-audit-token:}") String ms04AuditToken) {
		this.properties = properties;
		this.jsonMapper = jsonMapper;
		this.ms04AuditToken = ms04AuditToken;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return "GET".equals(request.getMethod()) && "/health".equals(request.getRequestURI());
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		request.removeAttribute(VerifiedIdentity.REQUEST_ATTRIBUTE);
		String authorization = request.getHeader("Authorization");
		String expectedToken = "POST".equals(request.getMethod()) && "/audit/events".equals(request.getRequestURI())
				? this.ms04AuditToken : this.properties.apiToken();
		if (expectedToken.isEmpty() || authorization == null || !authorization.startsWith(BEARER_PREFIX)
				|| !constantTimeEquals(authorization.substring(BEARER_PREFIX.length()), expectedToken)) {
			reject(response);
			return;
		}

		String context = request.getHeader(USER_CONTEXT_HEADER);
		if (context != null) {
			Optional<VerifiedIdentity> identity = verifyUserContext(context);
			if (identity.isEmpty()) {
				reject(response);
				return;
			}
			request.setAttribute(VerifiedIdentity.REQUEST_ATTRIBUTE, identity.get());
		}
		chain.doFilter(request, response);
	}

	private Optional<VerifiedIdentity> verifyUserContext(String value) {
		String signingKey = this.properties.userContextSigningKey();
		if (signingKey.length() < MIN_SIGNING_KEY_LENGTH) {
			return Optional.empty();
		}
		String[] parts = value.split("\\.", -1);
		if (parts.length != 2 || parts[0].isEmpty() || parts[1].isEmpty()) {
			return Optional.empty();
		}
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(signingKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			String expected = Base64.getUrlEncoder()
				.withoutPadding()
				.encodeToString(mac.doFinal(parts[0].getBytes(StandardCharsets.US_ASCII)));
			if (!constantTimeEquals(parts[1], expected)) {
				return Optional.empty();
			}
			Claims claims = this.jsonMapper.readValue(Base64.getUrlDecoder().decode(parts[0]), Claims.class);
			boolean valid = claims != null && notBlank(claims.userId()) && notBlank(claims.accountId())
					&& claims.role() != null && ROLES.contains(claims.role()) && claims.exp() != null
					&& claims.exp() > Instant.now().getEpochSecond();
			return valid ? Optional.of(new VerifiedIdentity(claims.userId(), claims.role(), claims.accountId()))
					: Optional.empty();
		}
		catch (GeneralSecurityException | RuntimeException ex) {
			return Optional.empty();
		}
	}

	private static boolean notBlank(String value) {
		return value != null && !value.isEmpty();
	}

	private static boolean constantTimeEquals(String a, String b) {
		return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
	}

	private static void reject(HttpServletResponse response) throws IOException {
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write(UNAUTHENTICATED_BODY);
	}

	record Claims(String userId, String role, String accountId, Long exp) {
	}

}
