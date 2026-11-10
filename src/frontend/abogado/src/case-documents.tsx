import { useEffect, useRef, useState, type FormEvent } from 'react';
import { requestGraphql, GraphqlFailure } from '../../shared/graphql';
import { formatEventDateTime } from '../../shared/formats';
import { feedbackForError, type CaseState, type Feedback } from '../../shared/presentation';
import { ConfirmationDialog, StatusNotice, TextField } from './ui';

interface Document { id:string; name:string; format:'PDF'|'JPEG'|'PNG'; size:number; uploadedAt:string; classification:string; version:number; availability:'AVAILABLE'|'DELETE_PENDING' }
interface Content {name:string;contentType:string;base64:string;size:number}
interface Page {items:Document[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}
interface Props {caseId:string;state:CaseState;pending:boolean;onRefreshCase:()=>void}
const CLASSES:Record<string,string>={FILING:'Escrito',DECISION:'Resolucion',EVIDENCE:'Prueba',OTHER:'Otro'};
const FIELDS='id name format size uploadedAt classification version availability';
const EMPTY={name:'',classification:'',format:'',fromDate:'',toDate:''};
function bytes(content: Content) { const raw=atob(content.base64);return Uint8Array.from(raw,character=>character.charCodeAt(0)); }
function failure(error:unknown):Feedback {
  const category=error instanceof GraphqlFailure?error.category:'SERVICE_UNAVAILABLE';
  const base=feedbackForError(category==='VALIDATION'?'validation':category==='CONFLICT'?'conflict':category==='FORBIDDEN'?'forbidden':category==='UNAUTHENTICATED'?'unauthenticated':category==='NOT_FOUND'?'not-found':'unavailable');
  return {...base,message:error instanceof GraphqlFailure?error.message:base.message};
}
function Classification({id,value,onChange,all=false}:{id:string;value:string;onChange:(value:string)=>void;all?:boolean}) {
  return <div className="al-field"><label htmlFor={id}>Clasificacion{all?'':' (obligatoria)'}</label><select className="al-input" id={id} value={value} required={!all} onChange={event=>onChange(event.target.value)}>{all&&<option value="">Todas</option>}{Object.entries(CLASSES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>;
}
function PdfPreview({content}:{content:Content}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const [page,setPage]=useState(1),[total,setTotal]=useState(0),[zoom,setZoom]=useState(100),[error,setError]=useState(false),[loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true; let dispose:(()=>void)|undefined;
    setLoading(true);setError(false);
    void import('pdfjs-dist').then(async pdfjs=>{
      if(!active)return;
      pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.mjs',import.meta.url).toString();
      const task=pdfjs.getDocument({data:bytes(content),verbosity:0,useWasm:false});
      dispose=()=>{void task.destroy().catch(()=>undefined);};
      try {
        const document=await task.promise;
        if(!active)return;
        setTotal(document.numPages);
        const current=await document.getPage(Math.min(page,document.numPages));
        const viewport=current.getViewport({scale:zoom/100});
        if(viewport.width*viewport.height>16000000||viewport.width>16384||viewport.height>16384)throw Error('Unsafe canvas dimensions');
        const element=canvas.current;
        if(!active||!element)return;
        element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height);
        await current.render({canvas:element,viewport}).promise;
        if(active)setLoading(false);
      }catch{if(active){setError(true);setLoading(false);}}
    }).catch(()=>{if(active){setError(true);setLoading(false);}});
    return ()=>{active=false;dispose?.();};
  },[content,page,zoom]);
  return <><div className="al-toolbar"><button className="al-button al-button--secondary" disabled={loading||page<=1} onClick={()=>setPage(value=>value-1)}>Pagina PDF anterior</button><span>Pagina {page} de {total||'...'}</span><button className="al-button al-button--secondary" disabled={loading||page>=total} onClick={()=>setPage(value=>value+1)}>Pagina PDF siguiente</button><label htmlFor="pdf-zoom">Zoom</label><select className="al-input" id="pdf-zoom" value={zoom} onChange={event=>setZoom(Number(event.target.value))}>{[50,75,100,125,150,200].map(value=><option key={value} value={value}>{value}%</option>)}</select></div>{loading&&<p role="status">Abriendo PDF...</p>}{error?<p role="alert">No se pudo visualizar esta pagina del PDF.</p>:<div className="al-document-canvas"><canvas ref={canvas} aria-label={`Pagina ${page} del PDF`} /></div>}</>;
}
export function Preview({content,onClose}:{content:Content;onClose:()=>void}) {
  const [url,setUrl]=useState<string|null>(null);
  useEffect(()=>{const next=URL.createObjectURL(new Blob([bytes(content)],{type:content.contentType}));setUrl(next);return ()=>URL.revokeObjectURL(next);},[content]);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[]);
  return <section className="al-document-preview" aria-labelledby="document-preview-heading"><div className="al-toolbar"><h3 className="al-record-text" id="document-preview-heading" ref={heading} tabIndex={-1}>{content.name}</h3><button className="al-button al-button--secondary" onClick={onClose}>Cerrar vista previa</button>{url&&<a className="al-button" href={url} download={content.name}>Descargar original</a>}</div>{content.contentType!=='application/pdf'&&<p className="al-notice">La descarga conserva los metadatos originales de la fotografia.</p>}{content.contentType==='application/pdf'?<PdfPreview content={content}/>:url&&<img className="al-document-image" src={url} alt={content.name}/>}</section>;
}
export default function CaseDocuments(props:Props) {
  const [page,setPage]=useState<Page|null>(null),[eligibility,setEligibility]=useState<{state:string;archiving:boolean}|null>(null);
  const [filter,setFilter]=useState(EMPTY),[applied,setApplied]=useState(EMPTY),[cursors,setCursors]=useState<(string|null)[]>([null]),[refresh,setRefresh]=useState(0);
  const [feedback,setFeedback]=useState<Feedback|null>(null),[readError,setReadError]=useState<Feedback|null>(null),[errors,setErrors]=useState<Record<string,string>>({});
  const [online,setOnline]=useState(navigator.onLine),[pending,setPending]=useState(false),[uncertain,setUncertain]=useState(false);
  const [upload,setUpload]=useState(false),[selected,setSelected]=useState<File|null>(null),[kind,setKind]=useState('EVIDENCE');
  const [editing,setEditing]=useState<Document|null>(null),[editKind,setEditKind]=useState('EVIDENCE'),[deleting,setDeleting]=useState<Document|null>(null),[preview,setPreview]=useState<Content|null>(null);
  const operation=useRef<AbortController|null>(null),fileInput=useRef<HTMLInputElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const after=cursors[cursors.length-1],busy=pending||props.pending;
  const writable=online&&props.state==='Abierto'&&eligibility?.state==='OPEN'&&!eligibility.archiving;
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);operation.current?.abort();};},[]);
  useEffect(()=>{if(upload||editing)heading.current?.focus();},[upload,editing]);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    setPage(null);setEligibility(null);setReadError(null);setPreview(null);setErrors({});
    if(online)void requestGraphql<{caseFiles:Page;caseEligibility:{state:string;archiving:boolean}}>(`query($caseId:ID!,$after:String,$filter:CaseFileFilter){caseFiles(caseId:$caseId,after:$after,first:25,filter:$filter){items{${FIELDS}}pageInfo{hasNextPage endCursor}}caseEligibility(id:$caseId){state archiving}}`,{caseId:props.caseId,after,filter:Object.fromEntries(Object.entries(applied).filter(([,value])=>value!==''))},controller.signal).then(result=>{if(active){setPage(result.caseFiles);setEligibility(result.caseEligibility);setUncertain(false);}}).catch(error=>{if(active){setReadError(failure(error));if(error instanceof GraphqlFailure)setErrors(Object.fromEntries(error.fields.map(item=>[item.field,item.message])));}});
    return ()=>{active=false;controller.abort();};
  },[props.caseId,props.state,online,applied,after,refresh]);
  function consult(){setFeedback(null);setUpload(false);setEditing(null);setDeleting(null);setSelected(null);setRefresh(value=>value+1);}
  async function perform<T>(query:string,variables:Record<string,unknown>,confirmed:(result:T)=>void,write=true) {
    if(operation.current||!online||props.pending||(write&&(!writable||uncertain)))return;
    const controller=new AbortController();operation.current=controller;setPending(true);setFeedback(null);setErrors({});
    try {const result=await requestGraphql<T>(query,{caseId:props.caseId,...variables},controller.signal,60000);if(!controller.signal.aborted)confirmed(result);}
    catch(error){if(!controller.signal.aborted){setDeleting(null);setFeedback(failure(error));if(error instanceof GraphqlFailure){setErrors(Object.fromEntries(error.fields.map(item=>[item.field,item.message])));if(write)setUncertain(error.uncertain||error.category==='CONFLICT'||error.category==='NOT_FOUND');}else if(write)setUncertain(true);}}
    finally{operation.current=null;if(!controller.signal.aborted)setPending(false);}
  }
  function changed(message:string){setCursors([null]);setRefresh(value=>value+1);setFeedback({kind:'success',title:'Archivo actualizado',message});}
  async function submit(event:FormEvent) {
    event.preventDefault();if(!selected||busy||uncertain)return;
    if(selected.size<1||selected.size>10485760){setErrors({file:'El archivo debe tener entre 1 byte y 10 MiB.'});return;}
    try {
      const buffer=new Uint8Array(await selected.arrayBuffer());let binary='';
      for(let offset=0;offset<buffer.length;offset+=32768)binary+=String.fromCharCode(...buffer.subarray(offset,offset+32768));
      const extension=selected.name.split('.').pop()?.toLowerCase();const contentType=extension==='pdf'?'application/pdf':extension==='png'?'image/png':extension==='jpg'||extension==='jpeg'?'image/jpeg':selected.type;
      await perform(`mutation($caseId:ID!,$input:CaseFileInput!){uploadCaseFile(caseId:$caseId,input:$input){${FIELDS}}}`,{input:{name:selected.name,contentType,base64:btoa(binary),classification:kind}},()=>{setUpload(false);setSelected(null);changed('Archivo adjuntado.');});
    }catch{setFeedback(failure(null));}
  }
  return <section className="al-admin-form" aria-labelledby="case-documents-heading"><div className="al-toolbar"><h2 id="case-documents-heading">Documentos y fotografias</h2>{writable&&!upload&&!editing&&<button className="al-button" disabled={busy||uncertain} onClick={()=>{setUpload(true);setFeedback(null);setErrors({});}}>Adjuntar archivo</button>}<button className="al-button al-button--secondary" disabled={busy||!online} onClick={consult}>Actualizar archivos</button></div>
    {!online&&<p className="al-notice" role="status">Sin conexion. Archivos remotos no disponibles.</p>}{(props.state!=='Abierto'||eligibility&&(eligibility.state!=='OPEN'||eligibility.archiving))&&<p className="al-notice" role="status">Archivos de solo lectura: el expediente no admite cambios.</p>}
    {feedback&&<StatusNotice feedback={feedback}/>} {readError&&<StatusNotice feedback={readError} onRetry={!busy&&online?consult:undefined}/>}
    {uncertain&&<div className="al-toolbar"><p>Resultado no confirmado o datos desactualizados.</p><button className="al-button al-button--secondary" disabled={busy||!online} onClick={consult}>Consultar archivos</button><button className="al-button al-button--secondary" disabled={busy||!online} onClick={props.onRefreshCase}>Consultar expediente</button></div>}
    <form onSubmit={event=>{event.preventDefault();setCursors([null]);setApplied({...filter});}}><fieldset className="al-filter-grid" disabled={busy||upload||Boolean(editing)||!online}><TextField id="files-name" label="Nombre de archivo" value={filter.name} error={errors.name} onChange={event=>setFilter({...filter,name:event.target.value})}/><Classification id="files-classification" value={filter.classification} all onChange={classification=>setFilter({...filter,classification})}/><div className="al-field"><label htmlFor="files-format">Formato</label><select className="al-input" id="files-format" value={filter.format} onChange={event=>setFilter({...filter,format:event.target.value})}><option value="">Todos</option>{['PDF','JPEG','PNG'].map(format=><option key={format}>{format}</option>)}</select></div><TextField id="files-from" label="Cargado desde" type="date" value={filter.fromDate} error={errors.fromDate} onChange={event=>setFilter({...filter,fromDate:event.target.value})}/><TextField id="files-to" label="Cargado hasta" type="date" value={filter.toDate} error={errors.toDate} onChange={event=>setFilter({...filter,toDate:event.target.value})}/><div className="al-toolbar"><button className="al-button">Buscar archivos</button><button className="al-button al-button--secondary" type="button" onClick={()=>{setFilter(EMPTY);setApplied({...EMPTY});setCursors([null]);}}>Limpiar archivos</button></div></fieldset></form>
    {online&&!readError&&(!page?<p role="status">Cargando archivos...</p>:page.items.length===0?<p>Sin archivos que coincidan.</p>:<><ul className="al-record-list" aria-label="Archivos del expediente">{page.items.map(item=><li key={item.id}><h3 className="al-record-text">{item.name}</h3><p>{CLASSES[item.classification]} · {item.format} · {new Intl.NumberFormat('es-BO').format(item.size)} bytes · <time dateTime={item.uploadedAt}>{formatEventDateTime(item.uploadedAt)}</time></p>{item.availability==='DELETE_PENDING'&&<p className="al-notice" role="status">Eliminacion incompleta. Archivo no disponible; limpieza pendiente.</p>}<div className="al-toolbar">{item.availability==='AVAILABLE'&&<button className="al-button al-button--secondary" disabled={busy||uncertain} onClick={()=>void perform<{caseFileContent:Content}>('query($caseId:ID!,$id:ID!){caseFileContent(caseId:$caseId,id:$id){name contentType base64 size}}',{id:item.id},result=>setPreview(result.caseFileContent),false)}>Abrir archivo</button>}{writable&&<>{item.availability==='AVAILABLE'&&<button className="al-button al-button--secondary" disabled={busy||uncertain||upload||Boolean(editing)} onClick={()=>{setEditing(item);setEditKind(item.classification);setFeedback(null);}}>Reclasificar archivo</button>}<button className="al-button al-button--danger" disabled={busy||uncertain||upload||Boolean(editing)} onClick={()=>setDeleting(item)}>{item.availability==='DELETE_PENDING'?'Reintentar eliminacion':'Eliminar archivo'}</button></>}</div></li>)}</ul><div className="al-toolbar"><button className="al-button al-button--secondary" disabled={busy||upload||Boolean(editing)||cursors.length===1} onClick={()=>setCursors(previous=>previous.slice(0,-1))}>Archivos anteriores</button><span>Pagina {cursors.length}</span><button className="al-button al-button--secondary" disabled={busy||upload||Boolean(editing)||!page.pageInfo.hasNextPage} onClick={()=>setCursors(previous=>[...previous,page.pageInfo.endCursor])}>Archivos siguientes</button></div></>)}
    {upload&&<form onSubmit={event=>void submit(event)} className="al-admin-form"><h3 ref={heading} tabIndex={-1}>Adjuntar archivo existente</h3><fieldset disabled={busy||uncertain||!writable}><div className="al-field"><label htmlFor="document-file">PDF, JPEG o PNG, hasta 10 MiB (obligatorio)</label><input ref={fileInput} id="document-file" className="al-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required aria-invalid={Boolean(errors.file||errors.name)} aria-describedby={errors.file||errors.name?'document-file-error':undefined} onChange={event=>setSelected(event.target.files?.[0]??null)}/>{(errors.file||errors.name)&&<p className="al-field-error" id="document-file-error">{errors.file||errors.name}</p>}</div><Classification id="upload-classification" value={kind} onChange={setKind}/>{errors.classification&&<p className="al-field-error">{errors.classification}</p>}<button className="al-button" disabled={!selected} type="submit">{pending?'Adjuntando...':'Guardar archivo'}</button></fieldset><button type="button" className="al-button al-button--secondary" disabled={busy} onClick={()=>{setUpload(false);setSelected(null);}}>Cancelar carga</button></form>}
    {editing&&<form className="al-admin-form" onSubmit={event=>{event.preventDefault();void perform('mutation($caseId:ID!,$id:ID!,$classification:FileClassification!,$version:Int!){classifyCaseFile(caseId:$caseId,id:$id,classification:$classification,expectedVersion:$version){id version}}',{id:editing.id,classification:editKind,version:editing.version},()=>{setEditing(null);changed('Clasificacion guardada.');});}}><h3 ref={heading} tabIndex={-1}>Reclasificar archivo</h3><fieldset disabled={busy||uncertain||!writable}><Classification id="edit-file-classification" value={editKind} onChange={setEditKind}/><button className="al-button">Guardar clasificacion</button></fieldset><button type="button" className="al-button al-button--secondary" disabled={busy} onClick={()=>setEditing(null)}>Cancelar clasificacion</button></form>}
    {preview&&online&&<Preview content={preview} onClose={()=>setPreview(null)}/>}
    <ConfirmationDialog id="delete-document" open={Boolean(deleting)} title="Eliminar archivo" consequences="La eliminacion es irreversible. No elimina copias descargadas ni modifica informes guardados. Un fallo puede dejar limpieza pendiente, sin acceso al archivo." confirmLabel="Eliminar definitivamente" pending={busy} onCancel={()=>setDeleting(null)} onConfirm={()=>{if(!deleting)return;void perform<{deleteCaseFile:{deleted:boolean;cleanupPending:boolean}}>('mutation($caseId:ID!,$id:ID!,$version:Int!){deleteCaseFile(caseId:$caseId,id:$id,expectedVersion:$version,confirm:true){deleted cleanupPending}}',{id:deleting.id,version:deleting.version},result=>{setDeleting(null);setPreview(null);if(result.deleteCaseFile.deleted)changed('Archivo eliminado.');else{setRefresh(value=>value+1);setFeedback({kind:'partial',title:'Eliminacion incompleta',message:'El archivo no esta disponible, pero no se confirmo el borrado completo. Consulta y reintenta la limpieza.'});}});}}/>
  </section>;
}