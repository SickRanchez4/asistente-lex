<?php

namespace AsistenteLex\Erp\Infrastructure\Health;

use Illuminate\Http\JsonResponse;
use PDO;
use Throwable;

/**
 * Comprobación técnica de disponibilidad según el contrato común de la spec 000.
 */
final class HealthController
{
    private const SERVICE_NAME = 'ms-03-erp';

    public function __invoke(): JsonResponse
    {
        $dependencies = [
            'postgresql' => $this->isPostgresAvailable() ? 'UP' : 'DOWN',
        ];
        $allUp = ! in_array('DOWN', $dependencies, true);

        return new JsonResponse([
            'service' => self::SERVICE_NAME,
            'status' => $allUp ? 'UP' : 'DOWN',
            'dependencies' => $dependencies,
        ], $allUp ? 200 : 503);
    }

    // Se usa PDO directamente: la conexión de Laravel no admite connect_timeout
    // y reintenta al perder la conexión, lo que superaría el tiempo de espera.
    private function isPostgresAvailable(): bool
    {
        $db = config('database.connections.pgsql');
        $timeoutSeconds = max(1, (int) ceil(config('health.timeout_ms') / 1000));
        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;connect_timeout=%d;sslmode=%s;sslrootcert=%s',
            $db['host'],
            $db['port'],
            $db['database'],
            $timeoutSeconds,
            $db['sslmode'],
            $db['sslrootcert'],
        );

        try {
            $pdo = new PDO($dsn, $db['username'], $db['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $statement = $pdo->prepare("SELECT set_config('search_path', quote_ident(?), false)");
            $statement->execute([$db['search_path']]);

            return $pdo->query('SELECT current_schema()')->fetchColumn() === $db['search_path'];
        } catch (Throwable) {
            return false;
        }
    }
}
