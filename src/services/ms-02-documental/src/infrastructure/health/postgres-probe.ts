import { readFileSync } from 'node:fs';

import { Client } from 'pg';

import type { ServiceConfig } from '../config';

export async function isPostgresAvailable(config: ServiceConfig): Promise<boolean> {
  const { database, healthCheckTimeoutMs } = config;
  let client: Client | undefined;
  try {
    client = new Client({
      host: database.host,
      port: database.port,
      database: database.name,
      user: database.user,
      password: database.password,
      connectionTimeoutMillis: healthCheckTimeoutMs,
      query_timeout: healthCheckTimeoutMs,
      ssl: database.sslMode === 'disable' ? false : {
        rejectUnauthorized: true,
        ca: readFileSync(database.sslRootCert, 'utf8'),
      },
    });
    await client.connect();
    // set_config evita interpolar el identificador del esquema en SQL.
    await client.query("SELECT set_config('search_path', quote_ident($1), false)", [database.schema]);
    const result = await client.query<{ schema: string | null }>('SELECT current_schema() AS schema');
    return result.rows[0]?.schema === database.schema;
  } catch {
    console.error('PostgreSQL health check failed; check connectivity, schema and TLS configuration.');
    return false;
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}
