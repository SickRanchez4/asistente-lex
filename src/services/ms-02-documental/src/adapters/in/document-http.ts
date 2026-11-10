import { randomUUID } from 'node:crypto';
import { DocumentFailure, invalid } from '../../domain/documents.ts';
import { DocumentService } from '../../application/document-service.ts';
import { PgDocumentStore } from '../out/pg-document-store.ts';
import { LocalBinaryStore } from '../out/local-binary-store.ts';
import { ContentInspector } from '../out/file-inspector.ts';
import { RemoteCaseAuthority } from '../out/case-authority.ts';
import { loadConfig } from '../../infrastructure/config.ts';
import { authenticateInternalRequest } from '../../infrastructure/security/internal-auth.ts';

const MAX_BODY_BYTES=14_680_064;
async function body(request: Request, deadline: number): Promise<Record<string,unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') invalid('file','Se requiere JSON.');
  const declared=request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared)||Number(declared)>MAX_BODY_BYTES)) invalid('file','El cuerpo supera el limite de transferencia.');
  const reader=request.body?.getReader();
  if (!reader) invalid('file','Falta el cuerpo de la solicitud.');
  const chunks: Uint8Array[]=[]; let size=0; let expired=false;
  const timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>undefined);},Math.max(1,deadline-Date.now()));
  try {
    while (true) { const result=await reader.read(); if(result.done) break; size+=result.value.byteLength; if(size>MAX_BODY_BYTES){await reader.cancel();invalid('file','El cuerpo supera el limite de transferencia.');} chunks.push(result.value); }
    if (expired || request.signal.aborted) throw new DocumentFailure('SERVICE_UNAVAILABLE','Transferencia interrumpida o plazo agotado.');
    let value: unknown;
    try { value=JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { invalid('file','JSON invalido.'); }
    if (!value || typeof value!=='object' || Array.isArray(value)) invalid('file','Solicitud invalida.');
    return value as Record<string,unknown>;
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
export async function documentHttp(request: Request, caseId: string, segments: string[], sources=false): Promise<Response> {
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try {
    const config=loadConfig();
    const auth=authenticateInternalRequest(request.headers,config);
    if(!auth.authenticated || !auth.identity) throw new DocumentFailure('UNAUTHENTICATED','Solicitud interna no autenticada.');
    if(auth.identity.role!=='ABOGADO') throw new DocumentFailure('FORBIDDEN','No autorizado.');
    const incoming=Number(request.headers.get('X-Lex-Deadline-Ms')??config.fileTransferTimeoutMs);
    const budget=Number.isFinite(incoming)&&incoming>0?Math.min(config.fileTransferTimeoutMs,incoming):0;
    const deadline=Date.now()+budget;
    const active=()=>{if(request.signal.aborted||Date.now()>=deadline)throw new DocumentFailure('SERVICE_UNAVAILABLE','Transferencia interrumpida o plazo agotado.');};
    active();
    const correlation=request.headers.get('X-Correlation-Id')??'';
    const authority=new RemoteCaseAuthority(config,deadline,request.signal,/^[0-9a-f-]{36}$/i.test(correlation)?correlation:randomUUID());
    const service=new DocumentService(new PgDocumentStore(),new LocalBinaryStore(config.fileStoragePath),new ContentInspector(),authority,active);
    const actor=auth.identity;
    const [id,part]=segments;
    let result: unknown;
    let status=200;
    if(segments.length>2) throw new DocumentFailure('NOT_FOUND','Ruta no disponible.');
    if(request.method==='GET') {
      if(!id) result=await service.list(actor,caseId,new URL(request.url).searchParams,sources);
      else if(!part) result=await service.get(actor,caseId,id);
      else if(part==='content') result=await service.content(actor,caseId,id);
      else if(part==='pdf-text') result=await service.text(actor,caseId,id);
      else throw new DocumentFailure('NOT_FOUND','Ruta no disponible.');
    } else if(request.method==='POST'&&!id) result=await service.upload(actor,caseId,await body(request,deadline));
    else if(request.method==='PUT'&&id&&!part) result=await service.classify(actor,caseId,id,await body(request,deadline));
    else if(request.method==='DELETE'&&id&&!part) { const deletion=await service.delete(actor,caseId,id,await body(request,deadline)); result=deletion; status=deletion.cleanupPending?202:200; }
    else throw new DocumentFailure('NOT_FOUND','Ruta no disponible.');
    active();
    return Response.json(result,{status,headers});
  } catch(error) {
    const failure=error instanceof DocumentFailure?error:new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo completar la operacion documental.');
    const status={VALIDATION:400,UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409,SERVICE_UNAVAILABLE:503}[failure.category];
    return Response.json({category:failure.category,message:failure.message,...(failure.fields?{fields:failure.fields}:{})},{status,headers});
  }
}