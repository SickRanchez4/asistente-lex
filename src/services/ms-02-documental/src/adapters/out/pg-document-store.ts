import type { QueryResultRow } from 'pg';
import type { Classification, FileRecord } from '../../domain/documents.ts';
import { DocumentFailure } from '../../domain/documents.ts';
import type { DocumentStore, FileFilter, Position, Scope } from '../../application/ports/out/document-ports.ts';
import { database, transaction } from '../../infrastructure/db/database.ts';

function missing(): never { throw new DocumentFailure('NOT_FOUND', 'Archivo no disponible.'); }
function conflict(): never { throw new DocumentFailure('CONFLICT', 'El archivo cambio o no esta disponible para esta operacion.'); }
function record(row?: QueryResultRow): FileRecord {
  if (!row || row.availability === 'STAGING') missing();
  return { id: row.id, name: row.original_name, format: row.format, size: row.size, uploadedAt: row.uploaded_at.toISOString(), classification: row.classification, version: row.version, availability: row.availability };
}
const scopeWhere = 'account_id=$1 AND case_id=$2 AND id=$3';
const values = (scope: Scope, id: string) => [scope.accountId, scope.caseId, id];
export class PgDocumentStore implements DocumentStore {
  async stage(scope: Scope, id: string, file: { name: string; format: string; size: number; classification: Classification }) {
    await database().query("INSERT INTO documental.files(id,account_id,case_id,original_name,format,size,classification,availability) VALUES($1,$2,$3,$4,$5,$6,$7,'STAGING')", [id,scope.accountId,scope.caseId,file.name,file.format,file.size,file.classification]);
  }
  async publish(scope: Scope, id: string) {
    return record((await database().query(`UPDATE documental.files SET availability='AVAILABLE' WHERE ${scopeWhere} AND availability='STAGING' RETURNING *`,values(scope,id))).rows[0]);
  }
  async get(scope: Scope, id: string) {
    return record((await database().query(`SELECT * FROM documental.files WHERE ${scopeWhere} AND availability<>'STAGING'`,values(scope,id))).rows[0]);
  }
  async list(scope: Scope, filter: FileFilter, position: Position | null, limit: number, sources: boolean) {
    const parameters: unknown[] = [scope.accountId,scope.caseId];
    const conditions = ['account_id=$1','case_id=$2', sources ? "availability='AVAILABLE'" : "availability<>'STAGING'"];
    const add = (clause: string, value: unknown) => { parameters.push(value); conditions.push(clause.replace('?', '$'+parameters.length)); };
    if (filter.name) add('strpos(lower(original_name),lower(?))>0',filter.name);
    if (filter.classification) add('classification=?',filter.classification);
    if (filter.format) add('format=?',filter.format);
    if (filter.fromDate) add("(uploaded_at AT TIME ZONE 'America/La_Paz')::date >= ?::date",filter.fromDate);
    if (filter.toDate) add("(uploaded_at AT TIME ZONE 'America/La_Paz')::date <= ?::date",filter.toDate);
    if (position) { parameters.push(position.date,position.id); conditions.push(`(uploaded_at,id)<($${parameters.length-1}::timestamptz,$${parameters.length}::uuid)`); }
    parameters.push(limit);
    return (await database().query(`SELECT * FROM documental.files WHERE ${conditions.join(' AND ')} ORDER BY uploaded_at DESC,id DESC LIMIT $${parameters.length}`,parameters)).rows.map(record);
  }
  async classify(scope: Scope, id: string, version: number, classification: Classification) {
    return transaction(async client => {
      const current = record((await client.query(`SELECT * FROM documental.files WHERE ${scopeWhere} FOR UPDATE`,values(scope,id))).rows[0]);
      if (current.version !== version || current.availability !== 'AVAILABLE') conflict();
      if (current.classification === classification) return current;
      return record((await client.query(`UPDATE documental.files SET classification=$4,version=version+1 WHERE ${scopeWhere} RETURNING *`,[...values(scope,id),classification])).rows[0]);
    });
  }
  async markDelete(scope: Scope, id: string, version: number) {
    await transaction(async client => {
      const current = record((await client.query(`SELECT * FROM documental.files WHERE ${scopeWhere} FOR UPDATE`,values(scope,id))).rows[0]);
      if (current.version !== version) conflict();
      await client.query(`UPDATE documental.files SET availability='DELETE_PENDING' WHERE ${scopeWhere}`,values(scope,id));
    });
  }
  async finishDelete(scope: Scope, id: string) { await database().query(`DELETE FROM documental.files WHERE ${scopeWhere} AND availability='DELETE_PENDING'`,values(scope,id)); }
  async read<T>(scope: Scope, id: string, reader: (file: FileRecord) => Promise<T>) {
    return transaction(async client => {
      const current = record((await client.query(`SELECT * FROM documental.files WHERE ${scopeWhere} FOR SHARE`,values(scope,id))).rows[0]);
      if (current.availability !== 'AVAILABLE') conflict();
      return reader(current);
    });
  }
  async cleanup(id: string, remove: () => Promise<void>, staleOnly: boolean) {
    await transaction(async client => {
      const row = (await client.query('SELECT availability,uploaded_at FROM documental.files WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (!row) return;
      if (row.availability === 'AVAILABLE' || (!staleOnly && row.availability !== 'STAGING') || (staleOnly && row.availability === 'STAGING' && Date.now()-row.uploaded_at.getTime()<900000)) conflict();
      await remove();
      await client.query('DELETE FROM documental.files WHERE id=$1',[id]);
    });
  }
}