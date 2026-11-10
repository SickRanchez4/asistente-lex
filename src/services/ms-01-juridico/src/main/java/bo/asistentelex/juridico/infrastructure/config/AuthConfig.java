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
import bo.asistentelex.juridico.application.AdministrationService;
import bo.asistentelex.juridico.application.PeopleService;
import bo.asistentelex.juridico.application.CaseService;
import bo.asistentelex.juridico.application.ParticipantService;
import bo.asistentelex.juridico.application.CaseRecordService;
import bo.asistentelex.juridico.application.ports.out.CaseRecordStore;
import bo.asistentelex.juridico.application.ports.out.ParticipantStore;
import bo.asistentelex.juridico.application.ports.out.CasePorts;
import bo.asistentelex.juridico.application.ports.out.PeopleStore;
import bo.asistentelex.juridico.application.ports.out.AdministrationPorts;
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

	@Bean
	AdministrationService administrationService(AdministrationPorts.Store store, AdministrationPorts.Events events, Passwords passwords, AuthService auth) {
		return new AdministrationService(store, events, passwords, auth, Clock.systemUTC());
	}

	@Bean
	PeopleService peopleService(PeopleStore store, AuthService auth) { return new PeopleService(store, auth); }

	@Bean
	CaseService caseService(CasePorts.Store store, CasePorts.Intelligence intelligence, AuthService auth) { return new CaseService(store, intelligence, auth); }

	@Bean
	ParticipantService participantService(ParticipantStore store, AuthService auth) { return new ParticipantService(store, auth); }

	@Bean
	CaseRecordService caseRecordService(CaseRecordStore store, AuthService auth) { return new CaseRecordService(store, auth, Clock.systemUTC()); }
}