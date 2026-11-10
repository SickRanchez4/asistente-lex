import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { ReportService } from '../../application/report-service.ts';
import { DocumentService } from '../../application/document-service.ts';
import { DocumentFailure } from '../../domain/documents.ts';
import { PgReportStore } from '../out/pg-report-store.ts';
import { PgDocumentStore } from '../out/pg-document-store.ts';
import { LocalBinaryStore } from '../out/local-binary-store.ts';
import { ContentInspector } from '../out/file-inspector.ts';
import { RemoteCaseAuthority } from '../out/case-authority.ts';
import { ReportRemote } from '../out/report-remote.ts';
import { ReportPdf } from '../out/report-pdf.ts';
import { loadConfig } from '../../infrastructure/config.ts';
import { authenticateInternalRequest } from '../../infrastructure/security/internal-auth.ts';
import { body } from './document-http.ts';

export async function reportHttp(request: Request,caseId: string,segments: string[]): Promise<Response>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},started=Date.now();
  try {
    const config=loadConfig(),auth=authenticateInternalRequest(request.headers,config);
    if(!auth.authenticated||!auth.identity)throw new DocumentFailure('UNAUTHENTICATED','Solicitud interna no autenticada.');
    if(auth.identity.role!=='ABOGADO')throw new DocumentFailure('FORBIDDEN','No autorizado.');
    const budget=Number(request.headers.get('X-Lex-Deadline-Ms')??config.aiBudgetMs),deadline=started+Math.min(config.aiBudgetMs,budget);
    const active=()=>{if(!Number.isFinite(deadline)||request.signal.aborted||Date.now()>=deadline)throw new DocumentFailure('SERVICE_UNAVAILABLE','Plazo agotado o conexion interrumpida. Consulta el historico antes de repetir.');};active();
    if(!config.fileStoragePath)throw new DocumentFailure('SERVICE_UNAVAILABLE','Almacenamiento no configurado.');
    const correlation=randomUUID(),files=new LocalBinaryStore(config.fileStoragePath),documents=new DocumentService(new PgDocumentStore(),files,new ContentInspector(),new RemoteCaseAuthority(config,deadline,request.signal,correlation),active);
    const remote=new ReportRemote(config,deadline,request.signal,correlation,documents),service=new ReportService(new PgReportStore(),new LocalBinaryStore(join(config.fileStoragePath,'reports')),remote,remote,new ReportPdf(),active),actor=auth.identity;
    const [id,part]=segments;let result: unknown;
    if(segments.length>2)throw new DocumentFailure('NOT_FOUND','Ruta no disponible.');
    if(request.method==='POST'&&!id)result=await service.generate(actor,caseId,await body(request,deadline));
    else if(request.method==='GET'){
      if(!id){const query=new URL(request.url).searchParams;result=await service.list(actor,caseId,Number(query.get('first')??25),query.get('after'));}
      else if(id==='requests'&&part)result=await service.byRequest(actor,caseId,part);
      else if(!part)result=await service.get(actor,caseId,id);
      else if(part==='content'||part==='csv')result=await service.content(actor,caseId,id,part==='csv');
      else throw new DocumentFailure('NOT_FOUND','Ruta no disponible.');
    }else throw new DocumentFailure('NOT_FOUND','Operacion no disponible.');
    active();return Response.json(result,{headers});
  }catch(error){const failure=error instanceof DocumentFailure?error:new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo confirmar el informe. Consulta el historico antes de repetir.');const status={VALIDATION:400,UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409,SERVICE_UNAVAILABLE:503}[failure.category];return Response.json({category:failure.category,message:failure.message},{status,headers});}
}