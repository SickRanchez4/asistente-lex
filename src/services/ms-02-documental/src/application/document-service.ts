import { createHash, randomUUID } from 'node:crypto';
import { classification, DocumentFailure, expectedVersion, fileInput, identifier, invalid, type FileFormat } from '../domain/documents.ts';
import type { Actor, BinaryStore, CaseAuthority, DocumentStore, FileFilter, FileInspector, Position, Scope } from './ports/out/document-ports.ts';

export class DocumentService {
  constructor(private store: DocumentStore, private files: BinaryStore, private inspector: FileInspector, private authority: CaseAuthority, private active: () => void = ()=>undefined) {}
  private async scope(actor: Actor, caseId: string, write=false): Promise<Scope> {
    if (actor.role!=='ABOGADO' || actor.accountId!==actor.userId) throw new DocumentFailure('FORBIDDEN','No autorizado.');
    identifier(actor.accountId); identifier(actor.userId); const normalizedId=identifier(caseId); this.active();
    await this.authority.authorize(actor,normalizedId,write);
    return {accountId:actor.accountId,caseId:normalizedId};
  }
  async upload(actor: Actor, caseId: string, input: unknown) {
    const scope=await this.scope(actor,caseId,true);
    const file=fileInput(input);
    await this.inspector.validate(file.bytes,file.format);
    await this.authority.authorize(actor,scope.caseId,true); this.active();
    const id=randomUUID();
    try {
      await this.store.stage(scope,id,{...file,size:file.bytes.length});
      await this.files.write(id,file.bytes); this.active();
      return await this.store.publish(scope,id);
    } catch (error) {
      await this.store.cleanup(id,()=>this.files.remove(id),false).catch(()=>console.warn(`[ms02] upload outcome unresolved ref=${id}`));
      throw error;
    }
  }
  async get(actor: Actor, caseId: string, id: string) { return this.store.get(await this.scope(actor,caseId),identifier(id)); }
  async list(actor: Actor, caseId: string, query: URLSearchParams, sources=false) {
    const scope=await this.scope(actor,caseId);
    const first=Number(query.get('first')??25);
    if (!Number.isInteger(first)||first<1||first>100) invalid('first','La pagina admite de 1 a 100 archivos.');
    const name=(query.get('name')??'').trim();
    if (name.length>180 || /[\x00-\x1f\x7f]/.test(name)) invalid('name','Busqueda de nombre invalida.');
    const kind=query.get('classification'); const format=query.get('format');
    if (format && !['PDF','JPEG','PNG'].includes(format)) invalid('format','Formato invalido.');
    const civil=(key: string) => {
      const value=query.get(key); if (!value) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4))<1 || !Number.isFinite(Date.parse(value+'T00:00:00Z')) || new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value) invalid(key,'Fecha civil invalida.');
      return value;
    };
    const filter: FileFilter={name,classification:kind?classification(kind):null,format:format as FileFormat|null,fromDate:civil('fromDate'),toDate:civil('toDate')};
    if (filter.fromDate&&filter.toDate&&filter.fromDate>filter.toDate) invalid('toDate','La fecha final debe ser igual o posterior a la inicial.');
    const hash=createHash('sha256').update(JSON.stringify([scope,filter,sources])).digest('hex');
    const after=query.get('after'); let position: Position|null=null;
    if (after) {
      try {
        if (after.length>1024 || !/^[A-Za-z0-9_-]+$/.test(after)) throw new Error();
        const value=JSON.parse(Buffer.from(after,'base64url').toString('utf8'));
        if (value.scope!==hash || typeof value.date!=='string' || !Number.isFinite(Date.parse(value.date)) || new Date(value.date).toISOString()!==value.date) throw new Error();
        position={date:value.date,id:identifier(value.id)};
      } catch { invalid('after','Cursor invalido para esta consulta.'); }
    }
    const rows=await this.store.list(scope,filter,position,first+1,sources);
    const hasNextPage=rows.length>first; const items=rows.slice(0,first); const last=items.at(-1);
    return {items,pageInfo:{hasNextPage,endCursor:hasNextPage&&last?Buffer.from(JSON.stringify({scope:hash,date:last.uploadedAt,id:last.id})).toString('base64url'):null}};
  }
  async content(actor: Actor, caseId: string, id: string) {
    const scope=await this.scope(actor,caseId); identifier(id);
    return this.store.read(scope,id,async file=>{
      const bytes=await this.files.read(id);
      if (bytes.length!==file.size) throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo leer el archivo completo.');
      return {name:file.name,contentType:{PDF:'application/pdf',JPEG:'image/jpeg',PNG:'image/png'}[file.format],base64:bytes.toString('base64'),size:file.size};
    });
  }
  async text(actor: Actor, caseId: string, id: string) {
    const scope=await this.scope(actor,caseId); identifier(id);
    const bytes=await this.store.read(scope,id,async file=>{
      if (file.format!=='PDF') invalid('file','Solo se extrae texto de PDF, sin OCR.');
      const bytes=await this.files.read(id); if (bytes.length!==file.size) throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo leer el archivo completo.'); return bytes;
    });
    return this.inspector.pdfText(bytes);
  }
  async classify(actor: Actor, caseId: string, id: string, input: Record<string,unknown>) {
    const scope=await this.scope(actor,caseId,true); identifier(id);
    return this.store.classify(scope,id,expectedVersion(input.expectedVersion),classification(input.classification));
  }
  async delete(actor: Actor, caseId: string, id: string, input: Record<string,unknown>) {
    if (input.confirm!==true) invalid('confirm','Confirma la eliminacion irreversible.');
    const scope=await this.scope(actor,caseId,true); identifier(id);
    await this.store.markDelete(scope,id,expectedVersion(input.expectedVersion));
    try { await this.files.remove(id); await this.store.finishDelete(scope,id); return {deleted:true,cleanupPending:false}; }
    catch { return {deleted:false,cleanupPending:true}; }
  }
}