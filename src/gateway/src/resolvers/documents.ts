import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';
import { decodeBase64, MAX_UPLOAD_BYTES } from '../base64.ts';

function object(data: unknown): Record<string,unknown> { if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid response');return data as Record<string,unknown>; }
function text(value: unknown): string { if(typeof value!=='string')throw new Error('Invalid text');return value; }
function integer(value: unknown, max=Number.MAX_SAFE_INTEGER): number { if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>max)throw new Error('Invalid integer');return value; }
function document(data: unknown) {
  const value=object(data),name=text(value.name),format=text(value.format),classification=text(value.classification),availability=text(value.availability),uploadedAt=text(value.uploadedAt);
  if(!name.trim()||name.length>180||!['PDF','JPEG','PNG'].includes(format)||!['FILING','DECISION','EVIDENCE','OTHER'].includes(classification)||!['AVAILABLE','DELETE_PENDING'].includes(availability)||!Number.isFinite(Date.parse(uploadedAt)))throw new Error('Invalid document');
  return {id:text(value.id),name,format,classification,availability,uploadedAt,size:integer(value.size,MAX_UPLOAD_BYTES),version:integer(value.version)};
}
function page(data: unknown) {
  const value=object(data),info=object(value.pageInfo);
  if(!Array.isArray(value.items)||value.items.length>100||typeof info.hasNextPage!=='boolean')throw new Error('Invalid page');
  const endCursor=info.endCursor===null?null:text(info.endCursor);
  if(info.hasNextPage&&!endCursor)throw new Error('Invalid cursor');
  return {items:value.items.map(document),pageInfo:{hasNextPage:info.hasNextPage,endCursor}};
}
interface Scope {caseId:string;id:string}
interface Change extends Scope {classification:string;expectedVersion:number}
export function createDocumentResolvers(config: GatewayConfig) {
  const rest=createRestClient(config);
  async function call<T>(context: GatewayContext,caseId: string,id: string|undefined,part: string,method: 'GET'|'POST'|'PUT'|'DELETE',parse: (data:unknown)=>T,body?: unknown,query?:Record<string,string|number|undefined>,transfer=false) {
    await requireRole(context,['ABOGADO']);
    return rest({service:'ms-02-documental',operation:'case-documents',path:`/cases/${encodeURIComponent(caseId)}/files${id?'/'+encodeURIComponent(id):''}${part}`,method,body,query,parse,...(transfer?{timeoutMs:config.fileTransferTimeoutMs}:{})},context);
  }
  return {
    Query:{
      caseFiles:(_parent:unknown,args:{caseId:string;first:number;after?:string|null;filter?:Record<string,string|null>|null},context:GatewayContext)=>call(context,args.caseId,undefined,'','GET',page,undefined,Object.fromEntries(Object.entries({...args.filter,first:args.first,after:args.after}).filter(([,value])=>value!=null)) as Record<string,string|number>),
      caseDocument:(_parent:unknown,args:Scope,context:GatewayContext)=>call(context,args.caseId,args.id,'','GET',document),
      caseFileContent:(_parent:unknown,args:Scope,context:GatewayContext)=>call(context,args.caseId,args.id,'/content','GET',data=>{
        const value=object(data),base64=text(value.base64),contentType=text(value.contentType),size=integer(value.size,MAX_UPLOAD_BYTES);
        if(!['application/pdf','image/jpeg','image/png'].includes(contentType)||decodeBase64(base64,MAX_UPLOAD_BYTES,context.correlationId).length!==size)throw new Error('Invalid content');
        return {name:text(value.name),contentType,base64,size};
      },undefined,undefined,true),
    },
    Mutation:{
      uploadCaseFile:async(_parent:unknown,args:{caseId:string;input:{base64:string}},context:GatewayContext)=>{
        await requireRole(context,['ABOGADO']);decodeBase64(args.input.base64,MAX_UPLOAD_BYTES,context.correlationId);
        return call(context,args.caseId,undefined,'','POST',document,args.input,undefined,true);
      },
      classifyCaseFile:(_parent:unknown,args:Change,context:GatewayContext)=>call(context,args.caseId,args.id,'','PUT',document,{classification:args.classification,expectedVersion:args.expectedVersion}),
      deleteCaseFile:(_parent:unknown,args:Scope&{expectedVersion:number;confirm:boolean},context:GatewayContext)=>call(context,args.caseId,args.id,'','DELETE',data=>{
        const value=object(data);if(typeof value.deleted!=='boolean'||typeof value.cleanupPending!=='boolean'||value.deleted===value.cleanupPending)throw new Error('Invalid deletion');
        return {deleted:value.deleted,cleanupPending:value.cleanupPending};
      },{expectedVersion:args.expectedVersion,confirm:args.confirm},undefined,true),
    },
  };
}