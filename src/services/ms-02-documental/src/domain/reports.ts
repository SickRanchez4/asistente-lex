import { DocumentFailure, identifier, invalid } from './documents.ts';

export type ReportKind = 'EXECUTIVE' | 'CLIENT' | 'NATURAL';
export type ColumnType = 'TEXT' | 'DATE' | 'AMOUNT' | 'NUMBER' | 'BOOLEAN';
export interface ReportTable { columns: { key: string; label: string; type: ColumnType }[]; rows: string[][] }
export interface ReportContent { title: string; sections: { heading: string; body: string }[]; table: ReportTable | null; sources: { id: string; kind: 'CASE' | 'PDF'; label: string }[]; agent: { id: string; name: string } }
export interface ReportRecord extends ReportContent { id: string; caseId: string; kind: ReportKind; createdAt: string; size: number; requestId: string }
export interface ReportInput { requestId: string; kind: ReportKind; agentId?: string; question: string; documentIds: string[]; filter: { actuationType: string | null; fromDate: string | null; toDate: string | null } }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('report','Objeto invalido.');
  return value as Record<string,unknown>;
}
export function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) invalid('report','Texto ausente, invalido o demasiado extenso.');
  return value.trim();
}
export function civil(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value<'0001-01-01' || !Number.isFinite(Date.parse(value+'T00:00:00Z')) || new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value) invalid('date','Fecha civil invalida.');
  return value;
}
export function reportInput(value: unknown): ReportInput {
  const input=object(value);
  if (Object.keys(input).some(key=>!['requestId','kind','agentId','question','documentIds','filter'].includes(key))) invalid('report','Campo no permitido.');
  if (!['EXECUTIVE','CLIENT','NATURAL'].includes(String(input.kind))) invalid('kind','Tipo de informe invalido.');
  const kind=input.kind as ReportKind;
  const filter=input.filter==null?{}:object(input.filter);
  if(Object.keys(filter).some(key=>!['actuationType','fromDate','toDate'].includes(key))) invalid('filter','Filtro no permitido.');
  const actuationType=filter.actuationType==null?null:String(filter.actuationType);
  if(actuationType&&!['HEARING','FILING','DECISION','NOTIFICATION','OTHER'].includes(actuationType)) invalid('filter','Tipo de actuacion invalido.');
  const fromDate=filter.fromDate==null?null:civil(filter.fromDate),toDate=filter.toDate==null?null:civil(filter.toDate);
  if(fromDate&&toDate&&fromDate>toDate) invalid('filter','Periodo invalido.');
  const documents=input.documentIds??[];
  if(!Array.isArray(documents)||documents.length>10) invalid('documentIds','Selecciona hasta 10 PDF.');
  const documentIds=[...new Set(documents.map(identifier))];
  if(kind==='CLIENT'&&documentIds.length) invalid('documentIds','El informe para cliente no admite documentos.');
  const agentId=input.agentId==null?undefined:String(input.agentId);
  if(agentId&&!['civilista','penalista'].includes(agentId)) invalid('agentId','Agente invalido.');
  return {requestId:identifier(text(input.requestId,36)),kind,agentId,question:kind==='NATURAL'?text(input.question,8000):'',documentIds,filter:{actuationType,fromDate,toDate}};
}
export function tableValue(value: unknown): ReportTable | null {
  if(value===null) return null;
  const table=object(value);
  if(Object.keys(table).some(key=>!['columns','rows'].includes(key))||!Array.isArray(table.columns)||table.columns.length<1||table.columns.length>12||!Array.isArray(table.rows)||table.rows.length>200) invalid('table','Tabla invalida o excesiva.');
  const columns=table.columns.map(value=>{const column=object(value);const key=text(column.key,60),label=text(column.label,100),type=String(column.type) as ColumnType;if(Object.keys(column).some(key=>!['key','label','type'].includes(key))||!['TEXT','DATE','AMOUNT','NUMBER','BOOLEAN'].includes(type)) invalid('table','Columna no tipada.');return {key,label,type};});
  if(new Set(columns.map(column=>column.key)).size!==columns.length) invalid('table','Columnas repetidas.');
  const rows=table.rows.map(value=>{
    if(!Array.isArray(value)||value.length!==columns.length) invalid('table','Fila invalida.');
    return value.map((cell,index)=>{
      if(typeof cell!=='string'||cell.length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(cell)) invalid('table','Celda invalida.');
      const type=columns[index].type;
      if(type==='DATE')civil(cell);
      if(type==='AMOUNT'&&!/^-?\d{1,15}(?:\.\d{1,2})?$/.test(cell))invalid('table','Importe decimal invalido.');
      if(type==='NUMBER'&&!/^-?\d{1,15}(?:\.\d{1,8})?$/.test(cell))invalid('table','Numero invalido.');
      if(type==='BOOLEAN'&&!['true','false'].includes(cell))invalid('table','Booleano invalido.');
      return cell;
    });
  });
  return {columns,rows};
}
export function displayCell(value: string, type: ColumnType): string {
  if(type==='DATE')return value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4);
  if(type==='AMOUNT'){const [whole,fraction='']=value.split('.');return whole+','+fraction.padEnd(2,'0');}
  if(type==='NUMBER')return value.replace('.',',');
  return value;
}
export function protectedText(value: string): string { return /^(?:\s*[=+\-@]|[\t\r\n]|')/.test(value)?"'"+value:value; }
export function csv(table: ReportTable): Buffer {
  const quote=(value: string)=>'"'+value.replaceAll('"','""')+'"';
  const rows=[table.columns.map(column=>protectedText(column.label)),...table.rows.map(row=>row.map((cell,index)=>{const column=table.columns[index];const formatted=displayCell(cell,column.type);return column.type==='TEXT'?protectedText(formatted):formatted;}))];
  return Buffer.from('\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n','utf8');
}
export function validateContent(value: unknown, sources: ReportContent['sources']): ReportContent {
  const input=object(value);
  if(Object.keys(input).some(key=>!['title','sections','table','sourceIds','agent'].includes(key))||!Array.isArray(input.sections)||input.sections.length<1||input.sections.length>12) invalid('report','Propuesta IA invalida.');
  const sections=input.sections.map(value=>{const item=object(value);if(Object.keys(item).some(key=>!['heading','body'].includes(key)))invalid('report','Seccion invalida.');return {heading:text(item.heading,150),body:text(item.body,12000)};});
  if(!Array.isArray(input.sourceIds)||!input.sourceIds.length||input.sourceIds.length>20)invalid('report','Faltan fuentes verificadas.');
  const references=[...new Set(input.sourceIds.map(value=>text(value,100)))].map(id=>{const source=sources.find(item=>item.id===id);if(!source)throw new DocumentFailure('SERVICE_UNAVAILABLE','La IA cito una fuente no autorizada.');return source;});
  const agent=object(input.agent);if(!['civilista','penalista'].includes(String(agent.id)))invalid('agent','Agente de respuesta invalido.');
  return {title:text(input.title,180),sections,table:tableValue(input.table),sources:references,agent:{id:String(agent.id),name:text(agent.name,60)}};
}