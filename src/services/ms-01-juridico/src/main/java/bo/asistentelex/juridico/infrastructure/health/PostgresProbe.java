package bo.asistentelex.juridico.infrastructure.health;

import java.sql.Connection;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
class PostgresProbe implements DependencyProbe {

	private final DataSource dataSource;

	private final int timeoutSeconds;

	private final String schema;

	PostgresProbe(DataSource dataSource, @Value("${asistentelex.health.timeout-ms}") long timeoutMs,
			@Value("${asistentelex.database.schema}") String schema) {
		this.dataSource = dataSource;
		this.timeoutSeconds = (int) Math.max(1, Math.ceil(timeoutMs / 1000.0));
		this.schema = schema;
	}

	@Override
	public String name() {
		return "postgresql";
	}

	@Override
	public boolean isAvailable() {
		try (Connection connection = this.dataSource.getConnection()) {
			try (var statement = connection.createStatement()) {
				statement.setQueryTimeout(this.timeoutSeconds);
				try (var result = statement.executeQuery("SELECT current_schema()")) {
					return result.next() && this.schema.equals(result.getString(1));
				}
			}
		}
		catch (Exception ex) {
			return false;
		}
	}

}
