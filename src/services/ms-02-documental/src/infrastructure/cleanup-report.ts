import { join } from 'node:path';
import { identifier } from '../domain/documents.ts';
import { PgReportStore } from '../adapters/out/pg-report-store.ts';
import { LocalBinaryStore } from '../adapters/out/local-binary-store.ts';
import { database } from './db/database.ts';
import { loadConfig } from './config.ts';

async function cleanup(){
  if(process.env.REPORTS_CLEANUP!=='true')throw Error('Preparacion explicita requerida.');
  const id=identifier(process.argv[2]),row=(await database().query('SELECT account_id,case_id,status,created_at FROM documental.reports WHERE id=$1',[id])).rows[0];
  if(!row)return;
  if(row.status!=='STAGING'||Date.now()-row.created_at.getTime()<900000)throw Error('Solo restos STAGING antiguos.');
  const root=loadConfig().fileStoragePath;if(!root)throw Error('Almacenamiento no configurado.');
  await new PgReportStore().abandon({accountId:row.account_id,caseId:row.case_id},id,()=>new LocalBinaryStore(join(root,'reports')).remove(id));
  console.log('Limpieza tecnica de informe completada.');
}
cleanup().catch(()=>{console.error('No se pudo limpiar el resto tecnico de informe.');process.exitCode=1;}).finally(()=>database().end());