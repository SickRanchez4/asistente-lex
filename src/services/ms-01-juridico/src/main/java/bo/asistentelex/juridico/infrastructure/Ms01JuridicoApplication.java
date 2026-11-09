package bo.asistentelex.juridico.infrastructure;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// Se escanea el paquete raíz para que los adaptadores de las demás capas
// se registren sin que el arranque viva fuera de infraestructura.
@SpringBootApplication(scanBasePackages = "bo.asistentelex.juridico")
@ConfigurationPropertiesScan("bo.asistentelex.juridico.infrastructure")
public class Ms01JuridicoApplication {

	public static void main(String[] args) {
		SpringApplication.run(Ms01JuridicoApplication.class, args);
	}

}
