import { createHash, randomUUID } from 'node:crypto';
import { DocumentFailure, identifier, invalid } from '../domain/documents.ts';
import { csv, reportInput, validateContent, type ReportRecord } from '../domain/reports.ts';
import type { Actor, BinaryStore, Scope } from './ports/out/document-ports.ts';
import type { ReportProposer, ReportRenderer, ReportSources, ReportStore } from './ports/out/report-ports.ts';

export class ReportService {
  constructor(private store: ReportStore,private files: BinaryStore,private sources: ReportSources,private proposer: ReportProposer,private renderer: ReportRenderer,private active: ()=>void=()=>undefined){}
  private async scope(actor: Actor,caseId: string,generate=false): Promise<Scope>{if(actor.role!=='ABOGADO'||actor.userId!==actor.accountId)throw new DocumentFailure('FORBIDDEN','No autorizado.');identifier(actor.accountId);identifier(caseId);this.active();await this.sources.authorize(actor,caseId,generate);return {accountId:actor.accountId,caseId};}
  async generate(actor: Actor,caseId: string,value: unknown){
    const input=reportInput(value),scope=await this.scope(actor,caseId,true),fingerprint=createHash('sha256').update(JSON.stringify({...input,requestId:undefined})).digest('hex');
    const previous=await this.store.byRequest(scope,input.requestId);
    if(previous){if(previous.fingerprint!==fingerprint||!previous.completed)throw new DocumentFailure('CONFLICT','Solicitud pendiente o con otro contenido. Consulta el resultado antes de repetir.');return this.store.get(scope,previous.id);}
    const id=randomUUID();await this.store.stage(scope,id,input,fingerprint);
    try {
      const context=await this.sources.gather(actor,caseId,input);this.active();
      const content=validateContent(await this.proposer.propose(actor,caseId,input,context),context.sources);
      if(input.kind!=='NATURAL'&&content.table)invalid('table','Solo el reporte natural admite resultado tabular.');
      const bytes=await this.renderer.render(content,input.kind==='EXECUTIVE');this.active();
      await this.sources.authorize(actor,caseId,true);this.active();await this.files.write(id,bytes);this.active();
      return await this.store.publish(scope,id,content,bytes.length);
    }catch(error){await this.store.abandon(scope,id,()=>this.files.remove(id)).catch(()=>console.warn('[ms02] report outcome unresolved'));throw error;}
  }
  async get(actor: Actor,caseId: string,id: string){return this.store.get(await this.scope(actor,caseId),identifier(id));}
  async byRequest(actor: Actor,caseId: string,id: string){const scope=await this.scope(actor,caseId);const request=await this.store.byRequest(scope,identifier(id));if(!request)throw new DocumentFailure('NOT_FOUND','No hay informe confirmado para esta solicitud.');if(!request.completed)throw new DocumentFailure('CONFLICT','La solicitud no tiene resultado confirmado. No se regenero.');return this.store.get(scope,request.id);}
  async list(actor: Actor,caseId: string,first: number,after: string|null){const scope=await this.scope(actor,caseId);if(!Number.isInteger(first)||first<1||first>100)invalid('first','Pagina invalida.');if(after)identifier(after);const rows=await this.store.list(scope,first+1,after),items=rows.slice(0,first),more=rows.length>first;return {items:items.map(({sections,table,sources,...summary})=>summary),pageInfo:{hasNextPage:more,endCursor:more?items.at(-1)!.id:null}};}
  async content(actor: Actor,caseId: string,id: string,tabular=false){const report=await this.get(actor,caseId,id);let bytes: Buffer;if(tabular){if(!report.table)invalid('table','El informe no contiene resultado tabular.');bytes=csv(report.table);}else{bytes=await this.files.read(report.id);if(bytes.length!==report.size)throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo leer el PDF completo.');}this.active();return {name:`informe-${report.id}.${tabular?'csv':'pdf'}`,contentType:tabular?'text/csv;charset=utf-8':'application/pdf',size:bytes.length,base64:bytes.toString('base64')};}
}