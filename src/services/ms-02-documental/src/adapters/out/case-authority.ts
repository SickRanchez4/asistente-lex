import { createHmac } from 'node:crypto';
import type { CaseAuthority, Actor } from '../../application/ports/out/document-ports.ts';
import { DocumentFailure } from '../../domain/documents.ts';
import type { ServiceConfig } from '../../infrastructure/config.ts';

export class RemoteCaseAuthority implements CaseAuthority {
  constructor(private config: ServiceConfig, private deadline: number, private signal: AbortSignal, private correlationId: string) {}
  async authorize(actor: Actor, caseId: string, write: boolean) {
    if (!this.config.ms01ApiToken || this.config.userContextSigningKey.length<32) throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo comprobar el expediente.');
    const remaining=Math.min(10000,this.deadline-Date.now());
    if (remaining<=0 || this.signal.aborted) throw new DocumentFailure('SERVICE_UNAVAILABLE','Se agoto el plazo de la operacion.');
    const payload=Buffer.from(JSON.stringify({...actor,exp:Math.floor(Date.now()/1000)+120})).toString('base64url');
    const signature=createHmac('sha256',this.config.userContextSigningKey).update(payload).digest('base64url');
    let response: Response;
    try { response=await fetch(`${this.config.ms01Url.replace(/\/+$/,'')}/cases/${encodeURIComponent(caseId)}/eligibility`,{cache:'no-store',redirect:'error',signal:AbortSignal.any([this.signal,AbortSignal.timeout(remaining)]),headers:{Authorization:`Bearer ${this.config.ms01ApiToken}`,'X-Lex-User-Context':`${payload}.${signature}`,'X-Correlation-Id':this.correlationId,'X-Lex-Deadline-Ms':String(remaining)}}); }
    catch { throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo comprobar el expediente.'); }
    if (response.status===403) throw new DocumentFailure('FORBIDDEN','No autorizado.');
    if (response.status===404) throw new DocumentFailure('NOT_FOUND','Expediente no disponible.');
    if (!response.ok) throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo comprobar el expediente.');
    let value: {id?:unknown;state?:unknown;archiving?:unknown};
    try { const parsed=await response.json(); if (!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new Error(); value=parsed; } catch { throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo comprobar el expediente.'); }
    if (value.id!==caseId || !['OPEN','CLOSED','ARCHIVED'].includes(String(value.state)) || typeof value.archiving!=='boolean') throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo comprobar el expediente.');
    if (write && (value.state!=='OPEN' || value.archiving)) throw new DocumentFailure('CONFLICT','El expediente debe estar Abierto y sin archivo pendiente.');
  }
}