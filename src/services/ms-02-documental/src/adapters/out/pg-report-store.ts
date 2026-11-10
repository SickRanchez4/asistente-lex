import type { QueryResultRow } from 'pg';
import { database, transaction } from '../../infrastructure/db/database.ts';
import { DocumentFailure } from '../../domain/documents.ts';
import type { ReportContent, ReportInput, ReportRecord } from '../../domain/reports.ts';
import type { Scope } from '../../application/ports/out/document-ports.ts';
import type { ReportStore } from '../../application/ports/out/report-ports.ts';

function record(row?: QueryResultRow): ReportRecord {
  if(!row||row.status!=='COMPLETE')throw new DocumentFailure('NOT_FOUND','Informe no disponible.');
  return {...row.content,id:row.id,caseId:row.case_id,requestId:row.request_id,kind:row.kind,createdAt:row.created_at.toISOString(),size:row.size};
}
export class PgReportStore implements ReportStore {
  async byRequest(scope: Scope, requestId: string){const row=(await database().query('SELECT id,fingerprint,status FROM documental.reports WHERE account_id=$1 AND case_id=$2 AND request_id=$3',[scope.accountId,scope.caseId,requestId])).rows[0];return row?{id:row.id,fingerprint:row.fingerprint,completed:row.status==='COMPLETE'}:null;}
  async stage(scope: Scope,id: string,input: ReportInput,fingerprint: string){
    try {await database().query('INSERT INTO documental.reports(id,account_id,case_id,request_id,fingerprint,kind) VALUES($1,$2,$3,$4,$5,$6)',[id,scope.accountId,scope.caseId,input.requestId,fingerprint,input.kind]);}
    catch(error){if((error as {code?:string}).code==='23505')throw new DocumentFailure('CONFLICT','La solicitud ya fue admitida. Consulta el historico antes de repetir.');throw error;}
  }
  async publish(scope: Scope,id: string,content: ReportContent,size: number){return record((await database().query("UPDATE documental.reports SET status='COMPLETE',content=$4::jsonb,size=$5 WHERE account_id=$1 AND case_id=$2 AND id=$3 AND status='STAGING' RETURNING *",[scope.accountId,scope.caseId,id,JSON.stringify(content),size])).rows[0]);}
  async get(scope: Scope,id: string){return record((await database().query("SELECT * FROM documental.reports WHERE account_id=$1 AND case_id=$2 AND id=$3 AND status='COMPLETE'",[scope.accountId,scope.caseId,id])).rows[0]);}
  async list(scope: Scope,first: number,after: string|null){
    const position=after?await this.get(scope,after):null;
    return (await database().query("SELECT * FROM documental.reports WHERE account_id=$1 AND case_id=$2 AND status='COMPLETE' AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $5",[scope.accountId,scope.caseId,position?.createdAt??null,position?.id??null,first])).rows.map(record);
  }
  async abandon(scope: Scope,id: string,remove: ()=>Promise<void>){await transaction(async client=>{const row=(await client.query('SELECT status FROM documental.reports WHERE account_id=$1 AND case_id=$2 AND id=$3 FOR UPDATE',[scope.accountId,scope.caseId,id])).rows[0];if(!row||row.status==='COMPLETE')return;await remove();await client.query("DELETE FROM documental.reports WHERE account_id=$1 AND case_id=$2 AND id=$3 AND status='STAGING'",[scope.accountId,scope.caseId,id]);});}
}