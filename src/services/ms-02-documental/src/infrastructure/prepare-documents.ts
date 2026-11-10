import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { database, transaction } from './db/database.ts';

async function prepare() {
  if (process.env.DOCUMENTS_PREPARE !== 'true') throw new Error('Preparacion explicita requerida.');
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(10010010)');
    const schema = await client.query("SELECT 1 FROM information_schema.schemata WHERE schema_name='documental'");
    if (!schema.rowCount) throw new Error('Esquema documental no preparado.');
    await client.query('CREATE TABLE IF NOT EXISTS documental.schema_migrations(version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const directory = new URL('./db/migrations/',import.meta.url);
    for (const name of (await readdir(directory)).filter(name=>/^V\d+__.*\.sql$/.test(name)).sort((left,right)=>Number(left.match(/^V(\d+)/)![1])-Number(right.match(/^V(\d+)/)![1]))) {
      const sql = await readFile(new URL(name,directory),'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = await client.query('SELECT checksum FROM documental.schema_migrations WHERE version=$1',[name]);
      if (previous.rowCount) { if (previous.rows[0].checksum!==checksum) throw new Error('Checksum de migracion no coincide.'); continue; }
      await client.query(sql);
      await client.query('INSERT INTO documental.schema_migrations(version,checksum) VALUES($1,$2)',[name,checksum]);
    }
  });
  console.log('Preparacion documental completada.');
}
prepare().catch(()=>{console.error('No se pudo preparar documental; revisar esquema, migraciones y conectividad.');process.exitCode=1;}).finally(()=>database().end());