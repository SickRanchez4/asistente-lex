package bo.asistentelex.juridico.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "asistentelex.dynamodb")
public record DynamoDbProperties(String endpoint, String region, String accessKeyId, String secretAccessKey) {
}
