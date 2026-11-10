import type { GatewayConfig } from '../config/config.ts';
import { createRestClient, startDeadline } from '../clients/rest-client.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { decodeBase64, MAX_UPLOAD_BYTES } from '../base64.ts';

function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid report');return value as Record<string,unknown>;}
function text(value:unknown):string{if(typeof value!=='string')throw Error('Invalid text');return value;}
function agent(value:unknown){const item=object(value),id=text(item.id);if(!['civilista','penalista'].includes(id))throw Error('Invalid agent');return {id,name:text(item.name)};}
function summary(value:unknown){const item=object(value),kind=text(item.kind),createdAt=text(item.createdAt);if(!['EXECUTIVE','CLIENT','NATURAL'].includes(kind)||!Number.isFinite(Date.parse(createdAt))||typeof item.size!=='number'||!Number.isSafeInteger(item.size)||item.size<1||item.size>MAX_UPLOAD_BYTES)throw Error('Invalid report summary');return {id:text(item.id),caseId:text(item.caseId),requestId:text(item.requestId),kind,createdAt,size:item.size,title:text(item.title),agent:agent(item.agent)};}
function report(value:unknown){
  const item=object(value);if(!Array.isArray(item.sections)||item.sections.length>12||!Array.isArray(item.sources)||item.sources.length>20)throw Error('Invalid report content');
  const sections=item.sections.map(value=>{const section=object(value);return {heading:text(section.heading),body:text(section.body)};});
  const sources=item.sources.map(value=>{const source=object(value),kind=text(source.kind),id=text(source.id);if(!['CASE','PDF'].includes(kind)||!id.startsWith(kind+':'))throw Error('Invalid report source');return {id,kind,label:text(source.label)};});
  let table=null;
  if(item.table!==null){const value=object(item.table);if(!Array.isArray(value.columns)||value.columns.length>12||!Array.isArray(value.rows)||value.rows.length>200)throw Error('Invalid table');const columns=value.columns.map(value=>{const column=object(value),type=text(column.type);if(!['TEXT','DATE','AMOUNT','NUMBER','BOOLEAN'].includes(type))throw Error('Invalid column');return {key:text(column.key),label:text(column.label),type};});const rows=value.rows.map(value=>{if(!Array.isArray(value)||value.length!==columns.length)throw Error('Invalid row');return value.map(text);});table={columns,rows};}
  return {...summary(item),sections,sources,table};
}
function page(value:unknown){const item=object(value),info=object(item.pageInfo);if(!Array.isArray(item.items)||item.items.length>100||typeof info.hasNextPage!=='boolean')throw Error('Invalid report page');const endCursor=info.endCursor===null?null:text(info.endCursor);if(info.hasNextPage&&!endCursor)throw Error('Invalid cursor');return {items:item.items.map(summary),pageInfo:{hasNextPage:info.hasNextPage,endCursor}};}
interface Scope{caseId:string;id:string}
export function createReportResolvers(config:GatewayConfig){
  const rest=createRestClient(config);
  async function call<T>(context:GatewayContext,caseId:string,part:string,method:'GET'|'POST',parse:(value:unknown)=>T,body?:unknown,query?:Record<string,string|number|undefined>,mode?:'generate'|'content'){
    const deadline=mode==='generate'?startDeadline(config.aiBudgetMs):undefined;await requireRole(context,['ABOGADO']);
    return rest({service:'ms-02-documental',operation:'legal-reports',path:`/cases/${encodeURIComponent(caseId)}/reports${part}`,method,body,query,parse,deadline,...(mode==='content'?{timeoutMs:config.fileTransferTimeoutMs}:{})},context);
  }
  return {Query:{
    legalReports:(_parent:unknown,args:{caseId:string;first:number;after?:string|null},context:GatewayContext)=>call(context,args.caseId,'','GET',page,undefined,{first:args.first,after:args.after??undefined}),
    legalReport:(_parent:unknown,args:Scope,context:GatewayContext)=>call(context,args.caseId,'/'+encodeURIComponent(args.id),'GET',report),
    legalReportByRequest:(_parent:unknown,args:{caseId:string;requestId:string},context:GatewayContext)=>call(context,args.caseId,'/requests/'+encodeURIComponent(args.requestId),'GET',report),
    legalReportContent:(_parent:unknown,args:Scope&{csv:boolean},context:GatewayContext)=>call(context,args.caseId,'/'+encodeURIComponent(args.id)+(args.csv?'/csv':'/content'),'GET',value=>{const content=object(value),base64=text(content.base64),contentType=text(content.contentType);if(typeof content.size!=='number'||!['application/pdf','text/csv;charset=utf-8'].includes(contentType)||decodeBase64(base64,MAX_UPLOAD_BYTES,context.correlationId).length!==content.size)throw Error('Invalid report download');return {name:text(content.name),contentType,base64,size:content.size};},undefined,undefined,'content'),
  },Mutation:{generateLegalReport:(_parent:unknown,args:{caseId:string;input:unknown},context:GatewayContext)=>call(context,args.caseId,'','POST',report,args.input,undefined,'generate')}};
}