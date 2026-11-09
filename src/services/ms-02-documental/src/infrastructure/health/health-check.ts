import { loadConfig } from '../config';
import { isFileStorageAvailable } from './file-storage-probe';
import { isPostgresAvailable } from './postgres-probe';

type Status = 'UP' | 'DOWN';

export interface HealthResult {
  httpStatus: 200 | 503;
  body: {
    service: string;
    status: Status;
    dependencies: Record<string, Status>;
  };
}

const SERVICE_NAME = 'ms-02-documental';

export async function checkHealth(): Promise<HealthResult> {
  const config = loadConfig();
  const [postgresql, fileStorage] = await Promise.all([
    isPostgresAvailable(config),
    isFileStorageAvailable(config),
  ]);

  const dependencies: Record<string, Status> = {
    postgresql: postgresql ? 'UP' : 'DOWN',
    fileStorage: fileStorage ? 'UP' : 'DOWN',
  };
  const allUp = Object.values(dependencies).every((status) => status === 'UP');

  return {
    httpStatus: allUp ? 200 : 503,
    body: { service: SERVICE_NAME, status: allUp ? 'UP' : 'DOWN', dependencies },
  };
}
