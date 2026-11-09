package bo.asistentelex.juridico.infrastructure.config;

import java.net.URI;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Configuration
public class DynamoDbConfig {

	@Bean(destroyMethod = "close")
	DynamoDbClient dynamoDbClient(DynamoDbProperties properties,
			@Value("${asistentelex.health.timeout-ms}") long timeoutMs) {
		return DynamoDbClient.builder()
			.endpointOverride(URI.create(properties.endpoint()))
			.region(Region.of(properties.region()))
			.credentialsProvider(StaticCredentialsProvider.create(
					AwsBasicCredentials.create(properties.accessKeyId(), properties.secretAccessKey())))
			.overrideConfiguration(ClientOverrideConfiguration.builder()
				.apiCallTimeout(Duration.ofMillis(timeoutMs))
				.build())
			.build();
	}

}
