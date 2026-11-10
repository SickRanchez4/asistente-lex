import { identifier } from '../domain/documents.ts';
import { PgDocumentStore } from '../adapters/out/pg-document-store.ts';
import { LocalBinaryStore } from '../adapters/out/local-binary-store.ts';
import { loadConfig } from './config.ts';
import { database } from './db/database.ts';

async function cleanup() {
  if (process.env.DOCUMENTS_CLEANUP!=='true') throw new Error('Explicit cleanup required');
  const id=identifier(process.argv[2]??'');
  const files=new LocalBinaryStore(loadConfig().fileStoragePath);
  await new PgDocumentStore().cleanup(id,()=>files.remove(id),true);
  console.log('Limpieza individual confirmada.');
}
cleanup().catch(()=>{console.error('No se pudo confirmar limpieza; referencia retenida o archivo no elegible.');process.exitCode=1;}).finally(()=>database().end());