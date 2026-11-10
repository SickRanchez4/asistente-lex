import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { formatCivilDate, formatEventDateTime } from '../../shared/formats';
import { feedbackForError, type CaseState, type Feedback } from '../../shared/presentation';
import { StatusNotice, TextField } from './ui';

type ActuationType = 'HEARING' | 'FILING' | 'DECISION' | 'NOTIFICATION' | 'OTHER';
interface Actuation { id: string; type: ActuationType; date: string; description: string; version: number }
interface Note { id: string; text: string; date: string; version: number; privacy: 'OWNER_ONLY' }
interface Filter { type: string; fromDate: string; toDate: string }
interface Page<T> { items: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
interface Props { caseId: string; state: CaseState; pending: boolean; onRefreshCase: () => void }
const TYPES: Record<ActuationType, string> = { HEARING: 'Audiencia', FILING: 'Presentacion de escrito', DECISION: 'Resolucion', NOTIFICATION: 'Notificacion', OTHER: 'Otra' };
const ACT_FIELDS = 'id type date description version', NOTE_FIELDS = 'id text date version privacy';
const EMPTY_FILTER: Filter = { type: '', fromDate: '', toDate: '' };
function failure(error: unknown): Feedback {
  const category = error instanceof GraphqlFailure ? error.category : 'SERVICE_UNAVAILABLE';
  const base = feedbackForError(category === 'UNAUTHENTICATED' ? 'unauthenticated' : category === 'FORBIDDEN' ? 'forbidden' : category === 'NOT_FOUND' ? 'not-found' : category === 'CONFLICT' ? 'conflict' : category === 'VALIDATION' ? 'validation' : 'unavailable');
  return { ...base, message: error instanceof GraphqlFailure ? error.message : base.message };
}
function useRecords<T>(props: Props, field: 'actuations' | 'privateNotes', fields: string, filter: Filter | string) {
  const [page, setPage] = useState<Page<T> | null>(null), [caseState, setCaseState] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]), [refresh, setRefresh] = useState(0);
  const [readFeedback, setReadFeedback] = useState<Feedback | null>(null), [feedback, setFeedback] = useState<Feedback | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const mutation = useRef<AbortController | null>(null), after = cursors[cursors.length - 1];
  const busy = pending || props.pending, writable = online && props.state === 'Abierto' && caseState === 'OPEN';
  useEffect(() => { const changed = () => setOnline(navigator.onLine); window.addEventListener('online', changed); window.addEventListener('offline', changed); return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); }; }, []);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setPage(null); setCaseState(null); setReadFeedback(null); setErrors({});
    if (online) {
      const query = field === 'actuations'
        ? `query($caseId:ID!,$after:String,$filter:ActuationFilter){records:actuations(caseId:$caseId,first:25,after:$after,filter:$filter){items{${fields}}pageInfo{hasNextPage endCursor}}caseEligibility(id:$caseId){state}}`
        : `query($caseId:ID!,$after:String,$search:String){records:privateNotes(caseId:$caseId,first:25,after:$after,search:$search){items{${fields}}pageInfo{hasNextPage endCursor}}caseEligibility(id:$caseId){state}}`;
      const variables = typeof filter === 'string' ? { search: filter || null } : { filter: Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== '')) };
      requestGraphql<{ records: Page<T>; caseEligibility: { state: string } }>(query, { caseId: props.caseId, after, ...variables }, controller.signal)
        .then(data => { if (active) { setPage(data.records); setCaseState(data.caseEligibility.state); setUncertain(false); } }).catch(error => { if (active) { setReadFeedback(failure(error)); if (error instanceof GraphqlFailure) setErrors(Object.fromEntries(error.fields.map(item => [item.field, item.message]))); } });
    }
    return () => { active = false; controller.abort(); };
  }, [props.caseId, props.state, field, fields, filter, after, refresh, online]);
  function consult() { setFeedback(null); setErrors({}); setRefresh(value => value + 1); }
  function reset() { setFeedback(null); setErrors({}); }
  function invalid(fields: Record<string, string>) { setErrors(fields); setFeedback(feedbackForError('validation')); }
  async function save(query: string, variables: Record<string, unknown>, confirmed: () => void) {
    if (mutation.current || !writable || uncertain || props.pending) return;
    const controller = new AbortController(); mutation.current = controller; setPending(true); setFeedback(null); setErrors({});
    try {
      await requestGraphql(query, { caseId: props.caseId, ...variables }, controller.signal);
      if (!controller.signal.aborted) { confirmed(); setCursors([null]); setRefresh(value => value + 1); setFeedback({ kind: 'success', title: 'Registro guardado', message: field === 'privateNotes' ? 'Nota privada guardada.' : 'Actuacion guardada.' }); }
    } catch (error) {
      if (!controller.signal.aborted) {
        setFeedback(failure(error));
        if (error instanceof GraphqlFailure) { setErrors(Object.fromEntries(error.fields.map(item => [item.field, item.message]))); setUncertain(error.uncertain || error.category === 'CONFLICT' || error.category === 'NOT_FOUND'); } else setUncertain(true);
      }
    } finally { mutation.current = null; if (!controller.signal.aborted) setPending(false); }
  }
  return { page, caseState, cursors, setCursors, busy, pending, writable, uncertain, online, feedback, readFeedback, errors, consult, reset, invalid, save };
}
function RecordNotices({ view, props, consult }: { view: ReturnType<typeof useRecords>; props: Props; consult: () => void }) {
  return <>
    {!view.online && <p className="al-notice" role="status">Sin conexion. Consulta remota no disponible.</p>}
    {(props.state !== 'Abierto' || (view.caseState !== null && view.caseState !== 'OPEN')) && <p className="al-notice" role="status">Registros de solo lectura: el expediente no esta Abierto.</p>}
    {view.feedback && <StatusNotice feedback={view.feedback} />}
    {view.uncertain && <div className="al-toolbar"><p>Resultado no confirmado o datos desactualizados.</p><button className="al-button al-button--secondary" disabled={view.busy || !view.online} onClick={consult}>Consultar registros</button><button className="al-button al-button--secondary" disabled={view.busy || !view.online} onClick={props.onRefreshCase}>Consultar expediente</button></div>}
    {view.readFeedback && <StatusNotice feedback={view.readFeedback} onRetry={!view.busy && view.online ? consult : undefined} />}
  </>;
}
function RecordPagination({ view, editing, label }: { view: ReturnType<typeof useRecords>; editing: boolean; label: string }) {
  return <div className="al-toolbar"><button className="al-button al-button--secondary" disabled={view.busy || editing || view.cursors.length === 1} onClick={() => view.setCursors(previous => previous.slice(0, -1))}>{label} anteriores</button><span>Pagina {view.cursors.length}</span><button className="al-button al-button--secondary" disabled={view.busy || editing || !view.page?.pageInfo.hasNextPage} onClick={() => view.setCursors(previous => [...previous, view.page!.pageInfo.endCursor])}>{label} siguientes</button></div>;
}
function Actuations(props: Props) {
  const [filters, setFilters] = useState<Filter>(EMPTY_FILTER), [applied, setApplied] = useState<Filter>(EMPTY_FILTER);
  const view = useRecords<Actuation>(props, 'actuations', ACT_FIELDS, applied);
  const [form, setForm] = useState(false), [editing, setEditing] = useState<Actuation | null>(null);
  const [input, setInput] = useState({ type: '', date: '', description: '' });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (form) heading.current?.focus(); }, [form]);
  function consult() { setForm(false); setEditing(null); view.consult(); }
  function start(item?: Actuation) { setEditing(item ?? null); setInput(item ? { type: item.type, date: item.date, description: item.description } : { type: '', date: '', description: '' }); view.reset(); setForm(true); }
  function submit(event: FormEvent) {
    event.preventDefault(); const fields = Object.fromEntries(Object.entries(input).filter(([, value]) => !value.trim()).map(([key]) => [key, 'Este campo es obligatorio.']));
    if (Object.keys(fields).length) { view.invalid(fields); return; }
    const query = editing ? `mutation($caseId:ID!,$id:ID!,$input:ActuationInput!,$version:Int!){updateActuation(caseId:$caseId,id:$id,input:$input,expectedVersion:$version){${ACT_FIELDS}}}` : `mutation($caseId:ID!,$input:ActuationInput!){createActuation(caseId:$caseId,input:$input){${ACT_FIELDS}}}`;
    void view.save(query, { input, id: editing?.id, version: editing?.version }, () => { setForm(false); setEditing(null); setInput({ type: '', date: '', description: '' }); });
  }
  return <section aria-labelledby="actuations-heading" className="al-admin-form">
    <div className="al-toolbar"><h2 id="actuations-heading">Cronologia juridica</h2>{view.writable && !form && <button className="al-button" disabled={view.busy || view.uncertain} onClick={() => start()}>Registrar actuacion</button>}<button className="al-button al-button--secondary" disabled={view.busy || !view.online} onClick={consult}>Actualizar actuaciones</button></div>
    <RecordNotices view={view} props={props} consult={consult} />
    <form onSubmit={event => { event.preventDefault(); view.setCursors([null]); setApplied({ ...filters }); }}><fieldset className="al-filter-grid" disabled={view.busy || form || !view.online}>
      <div className="al-field"><label htmlFor="actuations-type">Tipo</label><select className="al-input" id="actuations-type" value={filters.type} onChange={event => setFilters({ ...filters, type: event.target.value })}><option value="">Todos</option>{Object.entries(TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <TextField id="actuations-from" label="Desde" type="date" value={filters.fromDate} error={view.errors.fromDate} onChange={event => setFilters({ ...filters, fromDate: event.target.value })} />
      <TextField id="actuations-to" label="Hasta" type="date" value={filters.toDate} error={view.errors.toDate} onChange={event => setFilters({ ...filters, toDate: event.target.value })} />
      <div className="al-toolbar"><button className="al-button" disabled={view.page === null && !view.readFeedback}>Filtrar actuaciones</button><button type="button" className="al-button al-button--secondary" onClick={() => { setFilters(EMPTY_FILTER); setApplied({ ...EMPTY_FILTER }); view.setCursors([null]); }}>Limpiar filtros</button></div>
    </fieldset></form>
    {view.online && !view.readFeedback && (!view.page ? <p role="status">Cargando actuaciones...</p> : view.page.items.length === 0 ? <p>Sin actuaciones que coincidan.</p> : <>
      <ol className="al-record-list" aria-label="Actuaciones del expediente">{view.page.items.map(item => <li key={item.id}><div className="al-toolbar"><time dateTime={item.date}>{formatCivilDate(item.date)}</time><strong>{TYPES[item.type]}</strong>{view.writable && <button className="al-button al-button--secondary" disabled={view.busy || view.uncertain || form} onClick={() => start(item)}>Corregir actuacion</button>}</div><p className="al-record-text">{item.description}</p></li>)}</ol>
      <RecordPagination view={view} editing={form} label="Actuaciones" />
    </>)}
    {form && <form className="al-admin-form" onSubmit={submit}><h3 ref={heading} tabIndex={-1}>{editing ? 'Corregir actuacion' : 'Registrar actuacion'}</h3><fieldset disabled={view.busy || view.uncertain || !view.writable}>
      <div className="al-field"><label htmlFor="actuation-type">Tipo (obligatorio)</label><select className="al-input" id="actuation-type" value={input.type} required aria-invalid={Boolean(view.errors.type)} aria-describedby={view.errors.type ? 'actuation-type-error' : undefined} onChange={event => setInput({ ...input, type: event.target.value })}><option value="" disabled>Selecciona un tipo</option>{Object.entries(TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{view.errors.type && <p className="al-field-error" id="actuation-type-error">{view.errors.type}</p>}</div>
      <TextField id="actuation-date" label="Fecha del hecho en Bolivia" required type="date" value={input.date} error={view.errors.date} onChange={event => setInput({ ...input, date: event.target.value })} />
      <div className="al-field"><label htmlFor="actuation-description">Descripcion del hecho juridico (obligatorio)</label><textarea className="al-input" id="actuation-description" required rows={5} maxLength={10000} value={input.description} aria-invalid={Boolean(view.errors.description)} aria-describedby={view.errors.description ? 'actuation-description-error' : undefined} onChange={event => setInput({ ...input, description: event.target.value })} />{view.errors.description && <p className="al-field-error" id="actuation-description-error">{view.errors.description}</p>}</div>
      <button className="al-button" type="submit">{view.pending ? 'Guardando...' : 'Guardar actuacion'}</button>
    </fieldset><button type="button" className="al-button al-button--secondary" disabled={view.busy} onClick={() => { setForm(false); view.reset(); }}>Cancelar actuacion</button></form>}
  </section>;
}
function Notes(props: Props) {
  const [search, setSearch] = useState(''), [applied, setApplied] = useState('');
  const view = useRecords<Note>(props, 'privateNotes', NOTE_FIELDS, applied);
  const [form, setForm] = useState(false), [editing, setEditing] = useState<Note | null>(null), [text, setText] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (form) heading.current?.focus(); }, [form]);
  function consult() { setForm(false); setEditing(null); view.consult(); }
  function start(item?: Note) { setEditing(item ?? null); setText(item?.text ?? ''); view.reset(); setForm(true); }
  function submit(event: FormEvent) {
    event.preventDefault(); if (!text.trim()) { view.invalid({ text: 'Este campo es obligatorio.' }); return; }
    const query = editing ? `mutation($caseId:ID!,$id:ID!,$input:PrivateNoteInput!,$version:Int!){updatePrivateNote(caseId:$caseId,id:$id,input:$input,expectedVersion:$version){${NOTE_FIELDS}}}` : `mutation($caseId:ID!,$input:PrivateNoteInput!){createPrivateNote(caseId:$caseId,input:$input){${NOTE_FIELDS}}}`;
    void view.save(query, { input: { text }, id: editing?.id, version: editing?.version }, () => { setForm(false); setEditing(null); setText(''); });
  }
  return <section aria-labelledby="private-notes-heading" className="al-admin-form">
    <div className="al-toolbar"><h2 id="private-notes-heading">Notas personales (privadas)</h2>{view.writable && !form && <button className="al-button" disabled={view.busy || view.uncertain} onClick={() => start()}>Registrar nota privada</button>}<button className="al-button al-button--secondary" disabled={view.busy || !view.online} onClick={consult}>Actualizar notas</button></div>
    <RecordNotices view={view} props={props} consult={consult} />
    <form onSubmit={event => { event.preventDefault(); view.setCursors([null]); setApplied(search); view.consult(); }}><fieldset disabled={view.busy || form || !view.online}><TextField id="private-notes-search" label="Buscar en mis notas" value={search} autoComplete="off" error={view.errors.search} onChange={event => setSearch(event.target.value)} /><div className="al-toolbar"><button className="al-button">Buscar notas</button><button className="al-button al-button--secondary" type="button" onClick={() => { setSearch(''); setApplied(''); view.setCursors([null]); view.consult(); }}>Limpiar busqueda</button></div></fieldset></form>
    {view.online && !view.readFeedback && (!view.page ? <p role="status">Cargando notas...</p> : view.page.items.length === 0 ? <p>Sin notas que coincidan.</p> : <>
      <ul className="al-record-list" aria-label="Notas privadas del expediente">{view.page.items.map(item => <li key={item.id}><div className="al-toolbar"><time dateTime={item.date}>{formatEventDateTime(item.date)}</time>{view.writable && <button className="al-button al-button--secondary" disabled={view.busy || view.uncertain || form} onClick={() => start(item)}>Corregir nota</button>}</div><p className="al-record-text">{item.text}</p></li>)}</ul>
      <RecordPagination view={view} editing={form} label="Notas" />
    </>)}
    {form && <form className="al-admin-form" onSubmit={submit}><h3 ref={heading} tabIndex={-1}>{editing ? 'Corregir nota privada' : 'Registrar nota privada'}</h3><fieldset disabled={view.busy || view.uncertain || !view.writable}>
      <div className="al-field"><label htmlFor="private-note-text">Texto privado (obligatorio)</label><textarea className="al-input" id="private-note-text" required rows={7} maxLength={20000} autoComplete="off" spellCheck={false} value={text} aria-invalid={Boolean(view.errors.text)} aria-describedby={view.errors.text ? 'private-note-text-error' : undefined} onChange={event => setText(event.target.value)} />{view.errors.text && <p className="al-field-error" id="private-note-text-error">{view.errors.text}</p>}</div>
      <button className="al-button" type="submit">{view.pending ? 'Guardando...' : 'Guardar nota privada'}</button>
    </fieldset><button type="button" className="al-button al-button--secondary" disabled={view.busy} onClick={() => { setForm(false); view.reset(); }}>Cancelar nota</button></form>}
  </section>;
}
export default function CaseRecords(props: Props) { return <><Actuations {...props} /><Notes {...props} /></>; }