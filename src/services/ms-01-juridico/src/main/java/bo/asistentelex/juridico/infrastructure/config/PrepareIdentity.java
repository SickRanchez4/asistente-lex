package bo.asistentelex.juridico.infrastructure.config;

import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;
import bo.asistentelex.juridico.adapters.out.DynamoAudit;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.*;
import bo.asistentelex.juridico.domain.Identity.*;

@Component
public class PrepareIdentity implements ApplicationRunner {
	private final DataSource source;
	private final Accounts accounts;
	private final Passwords passwords;
	private final DynamoAudit audit;
	private final ConfigurableApplicationContext context;
	@Value("${asistentelex.auth.prepare}") private boolean prepare;
	@Value("${asistentelex.auth.demo}") private boolean demo;
	@Value("${asistentelex.auth.environment}") private String environment;
	@Value("${asistentelex.auth.demo-email}") private String demoEmail;
	@Value("${asistentelex.auth.demo-password}") private String demoPassword;
	@Value("${asistentelex.database.schema}") private String schema;

	public PrepareIdentity(DataSource source, Accounts accounts, Passwords passwords, DynamoAudit audit, ConfigurableApplicationContext context) {
		this.source = source; this.accounts = accounts; this.passwords = passwords; this.audit = audit; this.context = context;
	}

	public void run(ApplicationArguments arguments) {
		if (demo && (!prepare || !"local".equals(environment))) {
			throw new IllegalStateException("Demo requiere preparacion explicita en entorno local.");
		}
		if (!prepare) return;
		if (!"juridico".equals(schema)) throw new IllegalStateException("La preparacion requiere el esquema juridico.");
		Flyway.configure().dataSource(source).defaultSchema(schema).schemas(schema).createSchemas(false)
				.locations("classpath:db/migration").load().migrate();
		audit.provision();
		if (demo) {
			if (!"admin@demo.com".equals(demoEmail) || !"password".equals(demoPassword)) {
				throw new IllegalStateException("La opcion demo solo admite las credenciales publicas documentadas.");
			}
			accounts.prepareDemo(new Account(UUID.randomUUID().toString(), "Administrador demo", demoEmail,
					passwords.hash(demoPassword), Role.ADMINISTRADOR, true),
					new Account(UUID.randomUUID().toString(), "Abogado demo", "abogado@demo.com",
							passwords.hash(demoPassword), Role.ABOGADO, true));
		}
		System.out.println("[ms-01] Preparacion de identidad y auditoria completada.");
		context.close();
	}
}