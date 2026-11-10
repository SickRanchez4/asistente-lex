package bo.asistentelex.juridico.infrastructure.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import bo.asistentelex.juridico.application.AuthService;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.*;

@Configuration
public class AuthConfig {
	@Bean
	Passwords passwords() {
		var encoder = new BCryptPasswordEncoder(12);
		return new Passwords() {
			public String hash(String password) { return encoder.encode(password); }
			public boolean matches(String password, String hash) { return encoder.matches(password, hash); }
		};
	}

	@Bean
	Tokens tokens() {
		var random = new SecureRandom();
		return new Tokens() {
			public String generate() {
				byte[] bytes = new byte[32];
				random.nextBytes(bytes);
				return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
			}
			public String digest(String token) {
				try {
					return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
				}
				catch (java.security.NoSuchAlgorithmException unavailable) { throw new IllegalStateException(unavailable); }
			}
		};
	}

	@Bean
	AuthService authService(Accounts accounts, Sessions sessions, Passwords passwords, Tokens tokens, Audit audit) {
		return new AuthService(accounts, sessions, passwords, tokens, audit, Clock.systemUTC());
	}
}