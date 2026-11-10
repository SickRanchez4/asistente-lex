package bo.asistentelex.juridico.adapters.out;

import java.time.Instant;
import java.time.format.DateTimeFormatterBuilder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Base64;
import java.util.Set;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import bo.asistentelex.juridico.application.ports.out.IdentityPorts.Audit;
import bo.asistentelex.juridico.application.ports.out.AdministrationPorts.Events;
import bo.asistentelex.juridico.domain.Administration.*;
import tools.jackson.databind.json.JsonMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

@Component
public class DynamoAudit implements Audit, Events {
	private final DynamoDbClient client;
	private final String table;
	private final JsonMapper json = JsonMapper.builder().build();

	public DynamoAudit(DynamoDbClient client, @Value("${asistentelex.auth.audit-table}") String table) {
		this.client = client;
		this.table = table;
	}

	public boolean record(String type, String userId, String result) {
		return recordEvent(UUID.randomUUID().toString(), type, userId, result);
	}

	public boolean recordEvent(String eventId, String type, String userId, String result) {
		return write(new Event(eventId, type, Instant.now().toString(), userId, result, null, null, null, null, null, null));
	}

	public boolean write(Event event) {
		String eventId = event.id(), type = event.type(), userId = event.userId(), result = event.result();
		String date = timestamp(event.date());
		Map<String, AttributeValue> item = new HashMap<>();
		Map.of("eventId", eventId, "type", type, "date", date, "result", result,
				"allPk", "EVENTS", "typePk", type, "sortKey", date + "#" + eventId)
				.forEach((key, value) -> item.put(key, AttributeValue.fromS(value)));
		if (userId != null) {
			item.put("userId", AttributeValue.fromS(userId));
			item.put("userPk", AttributeValue.fromS(userId));
		}
		optional(item, "operation", event.operation()); optional(item, "targetId", event.targetId());
		optional(item, "parameter", event.parameter()); optional(item, "previousValue", event.previousValue());
		optional(item, "newValue", event.newValue()); optional(item, "agentId", event.agentId());
		try {
			client.putItem(PutItemRequest.builder().tableName(table).item(item)
					.conditionExpression("attribute_not_exists(eventId)").build());
			return true;
		}
		catch (ConditionalCheckFailedException duplicate) {
			try {
				var existing = client.getItem(GetItemRequest.builder().tableName(table).consistentRead(true)
						.key(Map.of("eventId", AttributeValue.fromS(eventId))).build()).item();
				return List.of("type", "result", "userId", "operation", "targetId", "parameter", "previousValue", "newValue", "agentId").stream()
						.allMatch(key -> Objects.equals(item.get(key), existing.get(key)))
						&& (event.operation() == null || Objects.equals(item.get("date"), existing.get("date")));
			}
			catch (RuntimeException unavailable) { return false; }
		}
		catch (RuntimeException unavailable) {
			System.err.println("[ms-01] No se pudo registrar auditoria.");
			return false;
		}
	}

	public Page<Event> query(Filter filter, int first, String after) {
		String partition = filter.userId() != null ? "userPk" : filter.type() != null ? "typePk" : "allPk";
		String index = filter.userId() != null ? "by-user" : filter.type() != null ? "by-type" : "by-date";
		String value = filter.userId() != null ? filter.userId() : filter.type() != null ? filter.type() : "EVENTS";
		String scope = String.join("|", Objects.toString(filter.type(), ""), Objects.toString(filter.from(), ""), Objects.toString(filter.until(), ""), Objects.toString(filter.userId(), ""));
		Map<String, String> names = new HashMap<>(Map.of("#pk", partition));
		Map<String, AttributeValue> values = new HashMap<>(Map.of(":pk", AttributeValue.fromS(value)));
		String condition = "#pk = :pk";
		if (filter.from() != null || filter.until() != null) {
			names.put("#sk", "sortKey");
			if (filter.from() != null) values.put(":from", AttributeValue.fromS(timestamp(filter.from()) + "#"));
			if (filter.until() != null) values.put(":until", AttributeValue.fromS(timestamp(filter.until()) + "#"));
			condition += filter.from() != null && filter.until() != null ? " AND #sk BETWEEN :from AND :until"
					: filter.from() != null ? " AND #sk >= :from" : " AND #sk < :until";
		}
		var request = QueryRequest.builder().tableName(table).indexName(index).keyConditionExpression(condition)
				.limit(first).scanIndexForward(false);
		if (filter.userId() != null && filter.type() != null) {
			names.put("#type", "type"); values.put(":type", AttributeValue.fromS(filter.type()));
			request.filterExpression("#type = :type");
		}
		if (after != null) request.exclusiveStartKey(decodeCursor(after, scope, partition, value));
		var result = client.query(request.expressionAttributeNames(names).expressionAttributeValues(values).build());
		boolean more = !result.lastEvaluatedKey().isEmpty();
		String cursor = null;
		if (more) {
			Map<String, String> key = new HashMap<>();
			result.lastEvaluatedKey().forEach((name, attribute) -> key.put(name, attribute.s()));
			cursor = Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(Map.of("scope", scope, "key", key)));
		}
		var items = result.items().stream().map(item -> new Event(text(item, "eventId"), text(item, "type"), text(item, "date"),
				text(item, "userId"), text(item, "result"), text(item, "operation"), text(item, "targetId"), text(item, "parameter"),
				text(item, "previousValue"), text(item, "newValue"), text(item, "agentId"))).toList();
		return new Page<>(items, new PageInfo(cursor, more));
	}

	private Map<String, AttributeValue> decodeCursor(String cursor, String scope, String partition, String value) {
		try {
			if (cursor.length() > 4096) throw new IllegalArgumentException();
			var parsed = json.readTree(Base64.getUrlDecoder().decode(cursor));
			if (!scope.equals(parsed.path("scope").asString())) throw new IllegalArgumentException();
			var key = parsed.path("key");
			if (key.size() != 3 || !value.equals(key.path(partition).asString())) throw new IllegalArgumentException();
			Map<String, AttributeValue> result = new HashMap<>();
			for (String name : Set.of("eventId", "sortKey", partition)) {
				if (!key.path(name).isString() || key.path(name).asString().length() > 1024) throw new IllegalArgumentException();
				result.put(name, AttributeValue.fromS(key.path(name).asString()));
			}
			return result;
		} catch (RuntimeException invalid) { throw new Failure("VALIDATION", "La página no es válida para estos filtros."); }
	}
	private static String timestamp(String value) { return new DateTimeFormatterBuilder().appendInstant(9).toFormatter().format(Instant.parse(value)); }
	private static void optional(Map<String, AttributeValue> item, String key, String value) { if (value != null) item.put(key, AttributeValue.fromS(value)); }
	private static String text(Map<String, AttributeValue> item, String key) { return item.containsKey(key) ? item.get(key).s() : null; }

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