package bo.asistentelex.juridico.infrastructure.health;

/**
 * Comprobación técnica de un almacén asignado al servicio.
 */
public interface DependencyProbe {

	String name();

	boolean isAvailable();

}
