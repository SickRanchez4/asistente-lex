import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { formatCivilDate, formatEventDateTime } from '../../shared/formats';
import { feedbackForError, type Feedback } from '../../shared/presentation';
import { useAvailableAgents } from './agents';
import { AgentSelect, StatusNotice, TextField } from './ui';
import { Preview } from './case-documents';

type Kind='EXECUTIVE'|'CLIENT'|'NATURAL';
interface Summary{id:string;caseId:string;requestId:string;kind:Kind;createdAt:string;size:number;title:string;agent:{id:string;name:string}}
interface Column{key:string;label:string;type:string}
interface Report extends Summary{sections:{heading:string;body:string}[];sources:{id:string;kind:string;label:string}[];table:{columns:Column[];rows:string[][]}|null}
interface Content{name:string;contentType:string;base64:string;size:number}
interface Page{items:Summary[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}
interface Props{caseId:string;initialAgentId:string;pending:boolean;onRefreshCase:()=>void}
interface Pdf{id:string;name:string;availability:string}
const SUMMARY='id caseId requestId kind createdAt size title agent{id name}';
const DETAILS=`${SUMMARY} sections{heading body} sources{id kind label} table{columns{key label type} rows}`;
const KINDS:Record<Kind,string>={EXECUTIVE:'Resumen ejecutivo',CLIENT:'Informe para cliente',NATURAL:'Consulta natural'};
const ACTS:Record<string,string>={HEARING:'Audiencia',FILING:'Presentacion',DECISION:'Resolucion',NOTIFICATION:'Notificacion',OTHER:'Otra'};
function failure(error:unknown):Feedback{const category=error instanceof GraphqlFailure?error.category:'SERVICE_UNAVAILABLE',base=feedbackForError(category==='VALIDATION'?'validation':category==='CONFLICT'?'conflict':category==='FORBIDDEN'?'forbidden':category==='UNAUTHENTICATED'?'unauthenticated':category==='NOT_FOUND'?'not-found':'unavailable');return {...base,message:error instanceof GraphqlFailure?error.message:base.message};}
function cell(value:string,column:Column){if(column.type==='DATE')return formatCivilDate(value);if(column.type==='AMOUNT'){const [whole,fraction='']=value.split('.');return whole+','+fraction.padEnd(2,'0');}return column.type==='NUMBER'?value.replace('.',','):value;}
function download(content:Content){const raw=atob(content.base64),url=URL.createObjectURL(new Blob([Uint8Array.from(raw,character=>character.charCodeAt(0))],{type:content.contentType})),link=document.createElement('a');link.href=url;link.download=content.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export default function CaseReports(props:Props){
  const catalog=useAvailableAgents(),[online,setOnline]=useState(navigator.onLine),[allowed,setAllowed]=useState(false);
  const [page,setPage]=useState<Page|null>(null),[report,setReport]=useState<Report|null>(null),[preview,setPreview]=useState<Content|null>(null);
  const [kind,setKind]=useState<Kind>('EXECUTIVE'),[question,setQuestion]=useState(''),[alternative,setAlternative]=useState('');
  const [filter,setFilter]=useState({actuationType:'',fromDate:'',toDate:''}),[documentIds,setDocumentIds]=useState<string[]>([]),[pdfs,setPdfs]=useState<Pdf[]>([]);
  const [cursors,setCursors]=useState<(string|null)[]>([null]),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[uncertain,setUncertain]=useState(false);
  const [feedback,setFeedback]=useState<Feedback|null>(null),[readError,setReadError]=useState<Feedback|null>(null),[pdfError,setPdfError]=useState<Feedback|null>(null);
  const requestId=useRef(crypto.randomUUID()),operation=useRef<AbortController|null>(null),after=cursors[cursors.length-1],busy=pending||props.pending||loading;
  const initial=catalog.agents.find(agent=>agent.id===props.initialAgentId),enabled=initial?.enabled||catalog.agents.some(agent=>agent.id===alternative&&agent.enabled);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);operation.current?.abort();};},[]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setPage(null);setAllowed(false);setReadError(null);setLoading(true);setPreview(null);
    if(online)void requestGraphql<{legalReports:Page;caseEligibility:{questionsAllowed:boolean}}>(`query($caseId:ID!,$after:String){legalReports(caseId:$caseId,first:25,after:$after){items{${SUMMARY}}pageInfo{hasNextPage endCursor}}caseEligibility(id:$caseId){questionsAllowed}}`,{caseId:props.caseId,after},controller.signal).then(result=>{if(active){setPage(result.legalReports);setAllowed(result.caseEligibility.questionsAllowed);}}).catch(error=>{if(active)setReadError(failure(error));}).finally(()=>{if(active)setLoading(false);});else setLoading(false);
    return ()=>{active=false;controller.abort();};
  },[props.caseId,online,after,refresh]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setPdfs([]);setPdfError(null);
    if(kind!=='CLIENT'&&online&&allowed)void (async()=>{
      try{let cursor:string|null=null;const items:Pdf[]=[],seen=new Set<string>();do{const result:{caseFiles:{items:Pdf[];pageInfo:Page['pageInfo']}}=await requestGraphql('query($caseId:ID!,$after:String){caseFiles(caseId:$caseId,first:100,after:$after,filter:{format:PDF}){items{id name availability}pageInfo{hasNextPage endCursor}}}',{caseId:props.caseId,after:cursor},controller.signal);items.push(...result.caseFiles.items.filter(item=>item.availability==='AVAILABLE'));if(items.length>1000)throw new GraphqlFailure('VALIDATION','Demasiados PDF. No se ocultaron fuentes.');cursor=result.caseFiles.pageInfo.hasNextPage?result.caseFiles.pageInfo.endCursor:null;if(cursor&&seen.has(cursor))throw Error();if(cursor)seen.add(cursor);}while(cursor);if(active)setPdfs(items);}catch(error){if(active)setPdfError(failure(error));}
    })();return ()=>{active=false;controller.abort();};
  },[props.caseId,online,allowed,kind,refresh]);
  async function perform<T>(query:string,variables:Record<string,unknown>,confirmed:(result:T)=>void,generate=false){
    if(operation.current||!online||busy)return;const controller=new AbortController();operation.current=controller;setPending(true);setFeedback(null);
    try{const result=await requestGraphql<T>(query,{caseId:props.caseId,...variables},controller.signal,generate||query.includes('legalReportContent')?60000:12000);if(!controller.signal.aborted)confirmed(result);}
    catch(error){if(!controller.signal.aborted){setFeedback(failure(error));if(generate){const unresolved=!(error instanceof GraphqlFailure)||error.uncertain||['CONFLICT','SERVICE_UNAVAILABLE'].includes(error.category);setUncertain(unresolved);if(!unresolved)requestId.current=crypto.randomUUID();}}}
    finally{operation.current=null;if(!controller.signal.aborted)setPending(false);}
  }
  function confirmed(result:Report){setReport(result);setPreview(null);setUncertain(false);requestId.current=crypto.randomUUID();setCursors([null]);setRefresh(value=>value+1);setFeedback({kind:'success',title:'Informe guardado',message:'PDF e historico confirmados. Requiere revision profesional.'});}
  function submit(event:FormEvent){event.preventDefault();if(!allowed||!enabled||uncertain)return;void perform<{generateLegalReport:Report}>(`mutation($caseId:ID!,$input:GenerateLegalReportInput!){generateLegalReport(caseId:$caseId,input:$input){${DETAILS}}}`,{input:{requestId:requestId.current,kind,question:kind==='NATURAL'?question:'',agentId:initial?.enabled?null:alternative,documentIds:kind==='CLIENT'?[]:documentIds,filter:Object.fromEntries(Object.entries(filter).filter(([,value])=>value!==''))}},result=>confirmed(result.generateLegalReport),true);}
  async function consultResult(){
    if(operation.current||busy||!online)return;const controller=new AbortController();operation.current=controller;setPending(true);setFeedback(null);
    try{const result=await requestGraphql<{legalReportByRequest:Report}>(`query($caseId:ID!,$requestId:ID!){legalReportByRequest(caseId:$caseId,requestId:$requestId){${DETAILS}}}`,{caseId:props.caseId,requestId:requestId.current},controller.signal);if(!controller.signal.aborted)confirmed(result.legalReportByRequest);}
    catch(error){if(!controller.signal.aborted){if(error instanceof GraphqlFailure&&error.category==='NOT_FOUND'){setUncertain(false);requestId.current=crypto.randomUUID();setFeedback({kind:'success',title:'Consulta completada',message:'No existe un informe guardado para esta solicitud. Se conservaron los datos del formulario.'});}else setFeedback(failure(error));}}
    finally{operation.current=null;if(!controller.signal.aborted){setPending(false);setRefresh(value=>value+1);}}
  }
  return <section className="al-admin-form" aria-labelledby="case-reports-heading">
    <div className="al-toolbar"><h2 id="case-reports-heading">Informes juridicos</h2><button className="al-button al-button--secondary" disabled={pending||props.pending||!online} onClick={()=>{catalog.refresh();setRefresh(value=>value+1);}}>Actualizar informes</button></div>
    <p className="al-notice">Contenido generado con IA. Requiere revision profesional antes de utilizarlo o compartirlo con el cliente.</p>
    {!online&&<p role="status">Sin conexion. Informes remotos y generacion no disponibles.</p>}
    {feedback&&<StatusNotice feedback={feedback}/>} {readError&&<StatusNotice feedback={readError}/>}
    {!allowed&&online&&!loading&&!readError&&<p role="status">Solo lectura: no se generan informes en Archivado ni durante un archivo pendiente.</p>}
    {uncertain&&<div className="al-toolbar"><p role="status">Resultado no confirmado. Consulta antes de generar otro informe.</p><button className="al-button al-button--secondary" disabled={busy||!online} onClick={()=>void consultResult()}>Consultar resultado</button><button className="al-button al-button--secondary" disabled={busy||!online} onClick={props.onRefreshCase}>Consultar expediente</button></div>}
    {allowed&&online&&<form onSubmit={submit}><fieldset disabled={busy||uncertain||catalog.loading} className="al-admin-form">
      <div className="al-field"><label htmlFor="report-kind">Tipo de informe</label><select className="al-input" id="report-kind" value={kind} onChange={event=>{setKind(event.target.value as Kind);if(event.target.value==='CLIENT')setDocumentIds([]);}}>{Object.entries(KINDS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
      {catalog.feedback&&<StatusNotice feedback={catalog.feedback} onRetry={catalog.refresh}/>}
      {initial?.enabled?<p>Agente: {initial.name}</p>:<AgentSelect id="report-agent" label="Agente alternativo habilitado (obligatorio)" value={alternative} options={catalog.agents.map(agent=>({id:agent.id,name:agent.name,available:agent.enabled}))} onChange={event=>setAlternative(event.target.value)}/>}
      {!enabled&&!catalog.loading&&<p role="status">Selecciona explicitamente un agente habilitado. Sin agentes disponibles no se puede generar.</p>}
      {kind==='NATURAL'&&<div className="al-field"><label htmlFor="report-question">Consulta sobre este expediente (obligatoria)</label><textarea className="al-input" id="report-question" required maxLength={8000} value={question} onChange={event=>setQuestion(event.target.value)}/></div>}
      <div className="al-filter-grid"><div className="al-field"><label htmlFor="report-act-type">Tipo de actuacion</label><select className="al-input" id="report-act-type" value={filter.actuationType} onChange={event=>setFilter({...filter,actuationType:event.target.value})}><option value="">Todos</option>{Object.entries(ACTS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div><TextField id="report-from" label="Actuaciones desde" type="date" value={filter.fromDate} onChange={event=>setFilter({...filter,fromDate:event.target.value})}/><TextField id="report-to" label="Actuaciones hasta" type="date" value={filter.toDate} onChange={event=>setFilter({...filter,toDate:event.target.value})}/></div>
      {kind!=='CLIENT'&&<fieldset className="al-admin-form"><legend>PDF adicionales</legend>{pdfError&&<StatusNotice feedback={pdfError}/>}<ul className="al-record-list">{pdfs.map(pdf=><li key={pdf.id}><label className="al-record-text"><input type="checkbox" checked={documentIds.includes(pdf.id)} disabled={!documentIds.includes(pdf.id)&&documentIds.length>=10} onChange={event=>setDocumentIds(previous=>event.target.checked?[...previous,pdf.id]:previous.filter(id=>id!==pdf.id))}/> {pdf.name}</label></li>)}</ul></fieldset>}
      <button className="al-button" disabled={!enabled||Boolean(pdfError&&kind!=='CLIENT')||kind==='NATURAL'&&!question.trim()}>{pending?'Procesando...':'Generar y guardar informe'}</button>
    </fieldset></form>}
    <h3>Historico de informes</h3>
    {online&&loading&&<p role="status">Cargando informes...</p>}
    {online&&page&&(page.items.length===0?<p>Sin informes guardados.</p>:<ul className="al-record-list" aria-label="Informes guardados">{page.items.map(item=><li key={item.id}><h4 className="al-record-text">{item.title}</h4><p>{KINDS[item.kind]} · <time dateTime={item.createdAt}>{formatEventDateTime(item.createdAt)}</time> · {item.agent.name}</p><button className="al-button al-button--secondary" disabled={busy} onClick={()=>void perform<{legalReport:Report}>(`query($caseId:ID!,$id:ID!){legalReport(caseId:$caseId,id:$id){${DETAILS}}}`,{id:item.id},result=>{setReport(result.legalReport);setPreview(null);})}>Abrir informe</button></li>)}</ul>)}
    {online&&page&&<div className="al-toolbar"><button className="al-button al-button--secondary" disabled={busy||cursors.length===1} onClick={()=>setCursors(previous=>previous.slice(0,-1))}>Informes anteriores</button><span>Pagina {cursors.length}</span><button className="al-button al-button--secondary" disabled={busy||!page.pageInfo.hasNextPage} onClick={()=>setCursors(previous=>[...previous,page.pageInfo.endCursor])}>Informes siguientes</button></div>}
    {online&&report&&<section aria-labelledby="report-detail-title"><h3 id="report-detail-title" className="al-record-text">{report.title}</h3><p>{KINDS[report.kind]} · {formatEventDateTime(report.createdAt)} · {report.agent.name}</p>{report.sections.map((section,index)=><section key={index}><h4>{section.heading}</h4><p className="al-record-text">{section.body}</p></section>)}
      {report.table&&<><div className="al-table-scroll" tabIndex={0} role="region" aria-label="Resultado tabular"><table className="al-table"><thead><tr>{report.table.columns.map(column=><th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{report.table.rows.map((row,index)=><tr key={index}>{row.map((value,position)=><td key={position} className="al-record-text">{cell(value,report.table!.columns[position])}</td>)}</tr>)}</tbody></table></div><p>CSV UTF-8, separador ;, fechas dd/MM/yyyy y coma decimal sin miles. El texto que puede interpretarse como formula recibe un apostrofo protector; un apostrofo inicial se duplica. Los valores originales de la tabla no se modifican.</p></>}
      <h4>Fuentes</h4><ul>{report.sources.map(source=><li className="al-record-text" key={source.id}>{source.label}</li>)}</ul>
      <div className="al-toolbar"><button className="al-button" disabled={busy} onClick={()=>void perform<{legalReportContent:Content}>('query($caseId:ID!,$id:ID!){legalReportContent(caseId:$caseId,id:$id){name contentType size base64}}',{id:report.id},result=>setPreview(result.legalReportContent))}>Abrir PDF guardado</button>{report.table&&<button className="al-button al-button--secondary" disabled={busy} onClick={()=>void perform<{legalReportContent:Content}>('query($caseId:ID!,$id:ID!){legalReportContent(caseId:$caseId,id:$id,csv:true){name contentType size base64}}',{id:report.id},result=>download(result.legalReportContent))}>Exportar CSV</button>}</div>
    </section>}
    {online&&preview&&<Preview content={preview} onClose={()=>setPreview(null)}/>}
  </section>;
}