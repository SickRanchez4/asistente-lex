import { createHmac } from 'node:crypto';
import { DocumentFailure, identifier } from '../../domain/documents.ts';
import { object, text, type ReportContent, type ReportInput } from '../../domain/reports.ts';
import type { Actor } from '../../application/ports/out/document-ports.ts';
import type { ReportSources, ReportProposer } from '../../application/ports/out/report-ports.ts';
import type { DocumentService } from '../../application/document-service.ts';
import type { ServiceConfig } from '../../infrastructure/config.ts';

export class ReportRemote implements ReportSources, ReportProposer {
  constructor(private config: ServiceConfig,private deadline: number,private signal: AbortSignal,private correlation: string,private documents: DocumentService){}
  private async call(actor: Actor,service: 'ms01'|'ms04',path: string,body?: unknown,query?: URLSearchParams): Promise<Record<string,unknown>> {
    const remaining=this.deadline-Date.now(),token=service==='ms01'?this.config.ms01ApiToken:this.config.ms04ApiToken,url=service==='ms01'?this.config.ms01Url:this.config.ms04Url;
    if(remaining<=0||this.signal.aborted||!token||this.config.userContextSigningKey.length<32)throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo completar el informe dentro del plazo.');
    const payload=Buffer.from(JSON.stringify({...actor,exp:Math.floor(Date.now()/1000)+120})).toString('base64url'),signature=createHmac('sha256',this.config.userContextSigningKey).update(payload).digest('base64url');
    try {
      const response=await fetch(url.replace(/\/+$/,'')+path+(query?'?'+query.toString():''),{method:body===undefined?'GET':'POST',body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.any([this.signal,AbortSignal.timeout(remaining)]),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Lex-User-Context':payload+'.'+signature,'X-Correlation-Id':this.correlation,'X-Lex-Deadline-Ms':String(remaining)}});
      if(!response.ok){const category=({400:'VALIDATION',401:'UNAUTHENTICATED',403:'FORBIDDEN',404:'NOT_FOUND',409:'CONFLICT'} as const)[response.status as 400]??'SERVICE_UNAVAILABLE';throw new DocumentFailure(category,'La fuente o generacion rechazo la solicitud. No se confirmo un informe nuevo.');}
      const reader=response.body?.getReader();if(!reader)throw Error();const chunks: Uint8Array[]=[];let size=0;
      try {while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>1500000){await reader.cancel();throw new DocumentFailure('VALIDATION','Contexto o propuesta demasiado extensos. No se omitieron datos.');}chunks.push(next.value);}}finally{reader.releaseLock();}
      return object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    }catch(error){if(error instanceof DocumentFailure)throw error;throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo completar el flujo del informe. Consulta el historico antes de repetir.');}
  }
  async authorize(actor: Actor,caseId: string,generate: boolean){const value=await this.call(actor,'ms01',`/cases/${caseId}/eligibility`);if(value.id!==caseId||!['OPEN','CLOSED','ARCHIVED'].includes(String(value.state))||typeof value.archiving!=='boolean'||!['civilista','penalista'].includes(String(value.initialAgentId)))throw new DocumentFailure('SERVICE_UNAVAILABLE','Elegibilidad no verificable.');if(generate&&(value.state==='ARCHIVED'||value.archiving||value.questionsAllowed!==true))throw new DocumentFailure('CONFLICT','Solo se generan informes en Abierto/Cerrado sin archivo pendiente.');return {initialAgentId:String(value.initialAgentId)};}
  async gather(actor: Actor,caseId: string,input: ReportInput){
    const query=new URLSearchParams({audience:input.kind==='CLIENT'?'CLIENT':'INTERNAL'});for(const [key,value]of Object.entries(input.filter))if(value)query.set(key==='actuationType'?'type':key,value);
    const legal=await this.call(actor,'ms01',`/cases/${caseId}/report-sources`,undefined,query);
    if(legal.caseId!==caseId||!Array.isArray(legal.participants)||!Array.isArray(legal.actuations))throw new DocumentFailure('SERVICE_UNAVAILABLE','Fuentes juridicas no verificables.');
    const basic=object(legal.caseData),sources: ReportContent['sources']=[{id:'CASE:'+caseId,kind:'CASE',label:'Expediente '+String(basic.code)}],pdfs=[];
    for(const id of input.documentIds){const file=await this.documents.get(actor,caseId,id);if(file.format!=='PDF'||file.availability!=='AVAILABLE')throw new DocumentFailure('VALIDATION','Selecciona solo PDF disponibles del expediente.');const result=await this.documents.text(actor,caseId,id);if(result.status!=='EXTRACTED'||!result.text?.trim())throw new DocumentFailure('VALIDATION','PDF sin texto extraible o demasiado extenso. No se usa OCR ni se envio al proveedor.');const source={id:'PDF:'+id,kind:'PDF' as const,label:file.name};sources.push(source);pdfs.push({source,text:result.text});}
    if(!legal.participants.length&&!legal.actuations.length&&!pdfs.length)throw new DocumentFailure('VALIDATION','Fuentes insuficientes: se requiere participante, actuacion o texto PDF autorizado.');
    const data={legal,pdfs};if(Buffer.byteLength(JSON.stringify(data))>1000000)throw new DocumentFailure('VALIDATION','El contexto excede el limite. No se omitieron fuentes.');return {data,sources};
  }
  async propose(actor: Actor,caseId: string,input: ReportInput,context: {data:unknown;sources:ReportContent['sources']}){
    const proposal=await this.call(actor,'ms04',`/cases/${caseId}/report-proposal`,{kind:input.kind,agentId:input.agentId??null,question:input.question,filter:input.filter,context:context.data});
    if(!Array.isArray(proposal.lawSources)||proposal.lawSources.length>10)throw new DocumentFailure('SERVICE_UNAVAILABLE','Biblioteca normativa no verificable.');
    const laws=proposal.lawSources.map(value=>{const source=object(value);const id=text(source.id,40),label=text(source.label,180);if(Object.keys(source).length!==3||source.kind!=='LAW'||!id.startsWith('LAW:')||!label.toLowerCase().endsWith('.md'))throw new DocumentFailure('SERVICE_UNAVAILABLE','Fuente normativa no verificable.');identifier(id.slice(4));return {id,kind:'LAW' as const,label};});
    if(new Set(laws.map(source=>source.id)).size!==laws.length)throw new DocumentFailure('SERVICE_UNAVAILABLE','Referencias normativas repetidas.');
    context.sources.push(...laws);
    const {lawSources,...content}=proposal;
    return content;
  }
}