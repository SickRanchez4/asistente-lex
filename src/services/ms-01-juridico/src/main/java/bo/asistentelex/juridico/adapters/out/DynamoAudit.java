package bo.asistentelex.juridico.adapters.out;

import java.time.Instant;
import java.time.format.DateTimeFormatterBuilder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.Audit;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

@Component
public class DynamoAudit implements Audit {
	private final DynamoDbClient client;
	private final String table;

	public DynamoAudit(DynamoDbClient client, @Value("${asistentelex.auth.audit-table}") String table) {
		this.client = client;
		this.table = table;
	}

	public boolean record(String type, String userId, String result) {
		return recordEvent(UUID.randomUUID().toString(), type, userId, result);
	}

	public boolean recordEvent(String eventId, String type, String userId, String result) {
		String date = new DateTimeFormatterBuilder().appendInstant(9).toFormatter().format(Instant.now());
		Map<String, AttributeValue> item = new HashMap<>();
		Map.of("eventId", eventId, "type", type, "date", date, "result", result,
				"allPk", "EVENTS", "typePk", type, "sortKey", date + "#" + eventId)
				.forEach((key, value) -> item.put(key, AttributeValue.fromS(value)));
		if (userId != null) {
			item.put("userId", AttributeValue.fromS(userId));
			item.put("userPk", AttributeValue.fromS(userId));
		}
		try {
			client.putItem(PutItemRequest.builder().tableName(table).item(item)
					.conditionExpression("attribute_not_exists(eventId)").build());
			return true;
		}
		catch (ConditionalCheckFailedException duplicate) {
			try {
				var existing = client.getItem(GetItemRequest.builder().tableName(table).consistentRead(true)
						.key(Map.of("eventId", AttributeValue.fromS(eventId))).build()).item();
				return AttributeValue.fromS(type).equals(existing.get("type"))
						&& AttributeValue.fromS(result).equals(existing.get("result"))
						&& java.util.Objects.equals(userId == null ? null : AttributeValue.fromS(userId), existing.get("userId"));
			}
			catch (RuntimeException unavailable) { return false; }
		}
		catch (RuntimeException unavailable) {
			System.err.println("[ms-01] No se pudo registrar auditoria.");
			return false;
		}
	}

	public void provision() {
		try {
			client.describeTable(DescribeTableRequest.builder().tableName(table).build());
		}
		catch (ResourceNotFoundException missing) {
			client.createTable(CreateTableRequest.builder().tableName(table).billingMode(BillingMode.PAY_PER_REQUEST)
					.keySchema(KeySchemaElement.builder().attributeName("eventId").keyType(KeyType.HASH).build())
					.attributeDefinitions(List.of("eventId", "allPk", "typePk", "userPk", "sortKey").stream()
							.map(name -> AttributeDefinition.builder().attributeName(name).attributeType(ScalarAttributeType.S).build()).toList())
					.globalSecondaryIndexes(List.of(index("by-date", "allPk"), index("by-type", "typePk"), index("by-user", "userPk")))
					.build());
		}
		client.waiter().waitUntilTableExists(DescribeTableRequest.builder().tableName(table).build());
		var description = client.describeTable(DescribeTableRequest.builder().tableName(table).build()).table();
		if (!description.globalSecondaryIndexes().stream().map(GlobalSecondaryIndexDescription::indexName).toList()
				.containsAll(List.of("by-date", "by-type", "by-user"))) {
			throw new IllegalStateException("El esquema de auditoria no es compatible con la version 1.");
		}
	}

	private GlobalSecondaryIndex index(String name, String partition) {
		return GlobalSecondaryIndex.builder().indexName(name)
				.keySchema(KeySchemaElement.builder().attributeName(partition).keyType(KeyType.HASH).build(),
						KeySchemaElement.builder().attributeName("sortKey").keyType(KeyType.RANGE).build())
				.projection(Projection.builder().projectionType(ProjectionType.ALL).build()).build();
	}
}