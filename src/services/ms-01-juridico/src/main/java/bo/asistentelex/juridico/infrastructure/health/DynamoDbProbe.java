package bo.asistentelex.juridico.infrastructure.health;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Component
@Order(2)
class DynamoDbProbe implements DependencyProbe {

	private final DynamoDbClient client;

	DynamoDbProbe(DynamoDbClient client) {
		this.client = client;
	}

	@Override
	public String name() {
		return "dynamodb";
	}

	@Override
	public boolean isAvailable() {
		try {
			this.client.listTables(request -> request.limit(1));
			return true;
		}
		catch (Exception ex) {
			return false;
		}
	}

}
