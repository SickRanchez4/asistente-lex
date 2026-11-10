import { readFileSync } from 'node:fs';
import { Pool, type PoolClient } from 'pg';
import { loadConfig } from '../config.ts';

let instance: Pool | undefined;
export function database(): Pool {
  if (!instance) {
    const config = loadConfig().database;
    instance = new Pool({ host: config.host, port: config.port, database: config.name, user: config.user, password: config.password,
      max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, query_timeout: 10000,
      ssl: config.sslMode === 'disable' ? false : { rejectUnauthorized: true, ca: readFileSync(config.sslRootCert, 'utf8') } });
    instance.on('error', () => console.error('[ms02] database connection unavailable'));
  }
  return instance;
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
  finally { client.release(); }
}