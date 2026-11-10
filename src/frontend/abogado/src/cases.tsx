import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { formatEventDateTime } from '../../shared/formats';
import { feedbackForError, type Feedback, type CaseState } from '../../shared/presentation';
import { AgentSelect, ConfirmationDialog, ReadOnlyNotice, StatusNotice, TextField } from './ui';
import { useAvailableAgents } from './agents';
import Participants from './participants';

type State = 'OPEN' | 'CLOSED' | 'ARCHIVED';
type Action = 'CLOSE' | 'REOPEN' | 'ARCHIVE' | 'UNARCHIVE';
interface Input { code: string; title: string; description: string; area: string; initialAgentId: string }
interface CaseFile extends Omit<Input, 'description'> { id: string; description: string | null; state: State; version: number; archiving: boolean }
interface Transition { id: string; previousState: State; newState: State; date: string; authorId: string; version: number }
interface Page<T> { items: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
const FIELDS = 'id code title description area initialAgentId state version archiving';
const EMPTY: Input = { code: '', title: '', description: '', area: '', initialAgentId: '' };
const FILTERS = { state: '', area: '', code: '', title: '' };
const STATES: Record<State, CaseState> = { OPEN: 'Abierto', CLOSED: 'Cerrado', ARCHIVED: 'Archivado' };
const ACTIONS: Record<Action, string> = { CLOSE: 'Cerrar expediente', REOPEN: 'Reabrir expediente', ARCHIVE: 'Archivar expediente', UNARCHIVE: 'Desarchivar expediente' };
function values(item: CaseFile): Input { return { code: item.code, title: item.title, description: item.description ?? '', area: item.area, initialAgentId: item.initialAgentId }; }
function failure(error: unknown): Feedback {
  const category = error instanceof GraphqlFailure ? error.category : 'SERVICE_UNAVAILABLE';
  const base = feedbackForError(category === 'PARTIAL_FAILURE' ? 'partial' : category === 'UNAUTHENTICATED' ? 'unauthenticated'
    : category === 'FORBIDDEN' ? 'forbidden' : category === 'NOT_FOUND' ? 'not-found' : category === 'CONFLICT' ? 'conflict' : category === 'VALIDATION' ? 'validation' : 'unavailable');
  return { ...base, message: error instanceof GraphqlFailure ? error.message : base.message };
}

function History({ id, revision }: { id: string; revision: number }) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<Page<Transition> | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [refresh, setRefresh] = useState(0);
  const after = cursors[cursors.length - 1];
  useEffect(() => {
    let active = true;
    const controller = new AbortController(); setPage(null); setFeedback(null);
    requestGraphql<{ caseHistory: Page<Transition> }>('query($id:ID!,$after:String){caseHistory(id:$id,first:25,after:$after){items{id previousState newState date authorId version}pageInfo{hasNextPage endCursor}}}', { id, after }, controller.signal)
      .then(data => { if (active) setPage(data.caseHistory); }).catch(error => { if (active) setFeedback(failure(error)); });
    return () => { active = false; controller.abort(); };
  }, [id, revision, after, refresh]);
  return <section aria-labelledby="case-history-heading" className="al-admin-form">
    <h2 id="case-history-heading">Historial de estados</h2>
    {feedback ? <StatusNotice feedback={feedback} onRetry={() => setRefresh(value => value + 1)} /> : !page ? <p role="status">Cargando historial...</p> : page.items.length === 0 ? <p>Sin transiciones registradas.</p> : <>
      <div className="al-table-scroll"><table className="al-table"><thead><tr><th>Anterior</th><th>Nuevo</th><th>Fecha</th><th>Autor</th></tr></thead>
        <tbody>{page.items.map(item => <tr key={item.id}><td>{STATES[item.previousState]}</td><td>{STATES[item.newState]}</td><td>{formatEventDateTime(item.date)}</td><td>{item.authorId}</td></tr>)}</tbody>
      </table></div>
      <div className="al-toolbar"><button className="al-button al-button--secondary" disabled={cursors.length === 1} onClick={() => setCursors(previous => previous.slice(0, -1))}>Anterior</button>
        <span>Pagina {cursors.length}</span><button className="al-button al-button--secondary" disabled={!page.pageInfo.hasNextPage} onClick={() => setCursors(previous => [...previous, page.pageInfo.endCursor])}>Siguiente</button></div>
    </>}
  </section>;
}

export default function Cases() {
  const [mode, setMode] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [filters, setFilters] = useState(FILTERS), [applied, setApplied] = useState(FILTERS);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<Page<CaseFile> | null>(null), [item, setItem] = useState<CaseFile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState<Input>({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false);
  const [revision, setRevision] = useState(0), [archive, setArchive] = useState<CaseFile | null>(null);
  const mutation = useRef<AbortController | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const catalog = useAvailableAgents();
  const after = cursors[cursors.length - 1], editing = mode === 'create' || mode === 'edit';
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => { heading.current?.focus(); }, [mode]);
  useEffect(() => {
    if (mode !== 'list' && mode !== 'detail') return;
    let active = true; const controller = new AbortController();
    setLoading(true); setFeedback(null); setPage(null); setItem(null); setUncertain(false);
    const query = mode === 'list' ? `query($filter:CaseFilter,$after:String){cases(first:25,filter:$filter,after:$after){items{${FIELDS}}pageInfo{hasNextPage endCursor}}}` : `query($id:ID!){caseFile(id:$id){${FIELDS}}}`;
    requestGraphql<{ cases?: Page<CaseFile>; caseFile?: CaseFile }>(query, mode === 'list' ? { filter: Object.fromEntries(Object.entries(applied).filter(([, value]) => value.trim() !== '')), after } : { id: selectedId }, controller.signal)
      .then(data => { if (active) { if (mode === 'list') setPage(data.cases!); else { setItem(data.caseFile!); setInput(values(data.caseFile!)); } } })
      .catch(error => { if (active) setFeedback(failure(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [mode, applied, after, selectedId, revision]);
  function showList() { setErrors({}); setUncertain(false); setMode('list'); setRevision(value => value + 1); }
  function open(id: string) { setSelectedId(id); setErrors({}); setMode('detail'); setRevision(value => value + 1); }
  function create() { setSelectedId(null); setItem(null); setInput({ ...EMPTY }); setFeedback(null); setErrors({}); setUncertain(false); setLoading(false); setMode('create'); }
  function rejected(error: unknown) {
    setFeedback(failure(error));
    setErrors(error instanceof GraphqlFailure ? Object.fromEntries(error.fields.map(field => [field.field, field.message])) : {});
    setUncertain(!(error instanceof GraphqlFailure) || error.uncertain || ['CONFLICT', 'PARTIAL_FAILURE'].includes(error.category));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (mutation.current || uncertain) return;
    const fields = Object.fromEntries((['code', 'title', 'area', 'initialAgentId'] as const).filter(key => !input[key].trim()).map(key => [key, 'Este campo es obligatorio.']));
    setErrors(fields); if (Object.keys(fields).length) { setFeedback(feedbackForError('validation')); return; }
    const controller = new AbortController(); mutation.current = controller; setPending(true); setFeedback(null);
    try {
      const data = await requestGraphql<{ createCase?: CaseFile; updateCase?: CaseFile }>(mode === 'create'
        ? `mutation($input:CaseInput!){createCase(input:$input){${FIELDS}}}` : `mutation($id:ID!,$input:CaseInput!,$expectedVersion:Int!){updateCase(id:$id,input:$input,expectedVersion:$expectedVersion){${FIELDS}}}`,
      { input, id: selectedId, expectedVersion: item?.version }, controller.signal);
      if (!controller.signal.aborted) { const saved = data.createCase ?? data.updateCase!; setSelectedId(saved.id); setMode('detail'); setRevision(value => value + 1); }
    } catch (error) { if (!controller.signal.aborted) rejected(error); }
    finally { mutation.current = null; if (!controller.signal.aborted) setPending(false); }
  }
  async function change(action: Action, snapshot: CaseFile) {
    if (mutation.current || uncertain) return;
    const controller = new AbortController(); mutation.current = controller; setPending(true); setFeedback(null);
    try {
      const data = await requestGraphql<{ transitionCase: CaseFile }>(`mutation($id:ID!,$action:CaseAction!,$expectedVersion:Int!,$confirmed:Boolean!){transitionCase(id:$id,action:$action,expectedVersion:$expectedVersion,confirmConversationDeletion:$confirmed){${FIELDS}}}`,
        { id: snapshot.id, action, expectedVersion: snapshot.version, confirmed: action === 'ARCHIVE' }, controller.signal);
      if (!controller.signal.aborted) { setItem(data.transitionCase); setFeedback({ kind: 'success', title: 'Estado actualizado', message: `El expediente esta ${STATES[data.transitionCase.state]}.` }); }
    } catch (error) {
      if (!controller.signal.aborted) {
        rejected(error);
        if (action === 'ARCHIVE' && (!(error instanceof GraphqlFailure) || error.category === 'SERVICE_UNAVAILABLE')) {
          setFeedback({ kind: 'unconfirmed', title: 'Archivo no confirmado', message: 'Las conversaciones pueden haberse eliminado de forma irreversible. Consulta el estado; si sigue Cerrado con archivo pendiente, reintenta el archivo. No se desbloquean preguntas ni reapertura hasta resolverlo.' });
        }
      }
    }
    finally { mutation.current = null; if (!controller.signal.aborted) { setPending(false); setArchive(null); } }
  }
  const agentUnchanged = mode === 'edit' && input.initialAgentId === item?.initialAgentId;
  const agentEnabled = catalog.agents.some(agent => agent.id === input.initialAgentId && agent.enabled);
  function textField(key: 'code' | 'title', label: string) {
    return <TextField id={`case-${key}`} label={label} value={input[key]} required error={errors[key]} onChange={event => setInput(previous => ({ ...previous, [key]: event.target.value }))} />;
  }
  return <section aria-labelledby="cases-heading">
    <div className="al-toolbar"><h1 id="cases-heading" ref={heading} tabIndex={-1}>{mode === 'list' ? 'Expedientes' : mode === 'create' ? 'Abrir expediente' : mode === 'edit' ? 'Editar expediente' : 'Ficha de expediente'}</h1>
      {mode === 'list' ? <button className="al-button" onClick={create}>Abrir expediente</button> : <button className="al-button al-button--secondary" disabled={pending} onClick={showList}>Volver al listado</button>}
    </div>
    {feedback && <StatusNotice feedback={feedback} onRetry={!editing && !uncertain && !pending ? () => setRevision(value => value + 1) : undefined} />}
    {uncertain && <div className="al-toolbar"><p>Consulta el estado vigente antes de repetir la operacion.</p><button className="al-button al-button--secondary" disabled={pending} onClick={() => selectedId ? open(selectedId) : showList()}>Consultar estado</button></div>}
    {loading && !editing && <p role="status">Cargando expedientes...</p>}
    {mode === 'list' && <>
      <form className="al-filter-grid" onSubmit={event => { event.preventDefault(); setCursors([null]); setApplied({ ...filters }); }}>
        <div className="al-field"><label htmlFor="cases-state">Estado</label><select className="al-input" id="cases-state" value={filters.state} onChange={event => setFilters({ ...filters, state: event.target.value })}><option value="">Todos</option>{Object.entries(STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        <div className="al-field"><label htmlFor="cases-area">Area</label><select className="al-input" id="cases-area" value={filters.area} onChange={event => setFilters({ ...filters, area: event.target.value })}><option value="">Todas</option><option value="CIVIL">Civil</option><option value="PENAL">Penal</option></select></div>
        <TextField id="cases-code" label="Codigo" value={filters.code} onChange={event => setFilters({ ...filters, code: event.target.value })} />
        <TextField id="cases-title" label="Titulo" value={filters.title} onChange={event => setFilters({ ...filters, title: event.target.value })} />
        <div className="al-toolbar"><button className="al-button" disabled={loading}>Buscar</button><button type="button" className="al-button al-button--secondary" onClick={() => { setFilters(FILTERS); setApplied({ ...FILTERS }); setCursors([null]); }}>Limpiar</button></div>
      </form>
      {page?.items.length === 0 && <StatusNotice feedback={{ kind: 'empty', title: 'Sin expedientes', message: 'No hay expedientes que coincidan con los filtros.' }} />}
      {page && page.items.length > 0 && <>
        <div className="al-table-scroll"><table className="al-table"><caption>Expedientes de mi cuenta</caption><thead><tr><th>Codigo</th><th>Titulo</th><th>Area</th><th>Estado</th><th>Ficha</th></tr></thead><tbody>{page.items.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.title}</td><td>{row.area === 'CIVIL' ? 'Civil' : 'Penal'}</td><td>{STATES[row.state]}{row.archiving ? ' / Archivo pendiente' : ''}</td><td><button className="al-button al-button--secondary" onClick={() => open(row.id)}>Consultar</button></td></tr>)}</tbody></table></div>
        <div className="al-toolbar"><button className="al-button al-button--secondary" disabled={cursors.length === 1 || loading} onClick={() => setCursors(previous => previous.slice(0, -1))}>Anterior</button><span>Pagina {cursors.length}</span><button className="al-button al-button--secondary" disabled={!page.pageInfo.hasNextPage || loading} onClick={() => setCursors(previous => [...previous, page.pageInfo.endCursor])}>Siguiente</button></div>
      </>}
    </>}
    {editing && <form className="al-admin-form" onSubmit={save}>
      <fieldset disabled={pending}><legend>Datos del expediente</legend>
        {textField('code', 'Codigo interno')}{textField('title', 'Titulo')}
        <div className="al-field"><label htmlFor="case-description">Descripcion</label><textarea className="al-input" id="case-description" rows={5} maxLength={10000} value={input.description} aria-invalid={Boolean(errors.description)} onChange={event => setInput(previous => ({ ...previous, description: event.target.value }))} />{errors.description && <p className="al-field-error">{errors.description}</p>}</div>
        <div className="al-field"><label htmlFor="case-area">Area (obligatorio)</label><select className="al-input" id="case-area" required value={input.area} aria-invalid={Boolean(errors.area)} onChange={event => setInput(previous => ({ ...previous, area: event.target.value }))}><option value="" disabled>Selecciona un area</option><option value="CIVIL">Civil</option><option value="PENAL">Penal</option></select>{errors.area && <p className="al-field-error">{errors.area}</p>}</div>
        {catalog.loading && <p role="status">Cargando agentes...</p>}
        {catalog.feedback && <StatusNotice feedback={catalog.feedback} onRetry={catalog.refresh} />}
        <AgentSelect id="case-agent" label="Agente inicial (obligatorio)" value={input.initialAgentId} options={catalog.agents.map(agent => ({ id: agent.id, name: agent.name, available: agent.enabled }))} onChange={event => setInput(previous => ({ ...previous, initialAgentId: event.target.value }))} />
        {errors.initialAgentId && <p className="al-field-error">{errors.initialAgentId}</p>}
        {!agentUnchanged && !agentEnabled && <p className="al-notice">Selecciona un agente habilitado para guardar.</p>}
        <div className="al-toolbar"><button className="al-button" disabled={pending || uncertain || (!agentUnchanged && (!agentEnabled || catalog.loading))}>{pending ? 'Guardando...' : 'Guardar expediente'}</button>
          <button type="button" className="al-button al-button--secondary" disabled={pending} onClick={() => selectedId ? open(selectedId) : showList()}>Cancelar</button></div>
      </fieldset>
    </form>}
    {mode === 'detail' && item && !loading && <>
      <ReadOnlyNotice state={STATES[item.state]} />
      {item.archiving && <p className="al-notice" role="status">Archivo pendiente de confirmacion. Nuevas preguntas y reapertura bloqueadas; reintenta el archivo para resolverlo.</p>}
      <dl className="al-case-details"><dt>Codigo interno</dt><dd>{item.code}</dd><dt>Titulo</dt><dd>{item.title}</dd><dt>Descripcion</dt><dd className="al-case-description">{item.description ?? 'Sin descripcion'}</dd><dt>Area</dt><dd>{item.area === 'CIVIL' ? 'Civil' : 'Penal'}</dd><dt>Agente inicial</dt><dd>{catalog.agents.find(agent => agent.id === item.initialAgentId)?.name ?? item.initialAgentId}</dd><dt>Estado</dt><dd>{STATES[item.state]}</dd></dl>
      <div className="al-toolbar">
        <button className="al-button al-button--secondary" disabled={pending} onClick={() => open(item.id)}>Actualizar ficha</button>
        {item.state === 'OPEN' && <button className="al-button" disabled={pending || uncertain} onClick={() => { setInput(values(item)); setErrors({}); setFeedback(null); setMode('edit'); }}>Editar expediente</button>}
        {(item.state === 'OPEN' ? ['CLOSE'] as const : item.state === 'CLOSED' ? ['REOPEN', 'ARCHIVE'] as const : ['UNARCHIVE'] as const).map(action => <button key={action} className={`al-button ${action === 'ARCHIVE' ? 'al-button--danger' : 'al-button--secondary'}`} disabled={pending || uncertain || (item.archiving && action !== 'ARCHIVE')} onClick={() => action === 'ARCHIVE' ? setArchive(item) : void change(action, item)}>{item.archiving && action === 'ARCHIVE' ? 'Reintentar archivo' : ACTIONS[action]}</button>)}
      </div>
      <Participants key={item.id} caseId={item.id} state={STATES[item.state]} pending={pending || uncertain} onRefreshCase={() => open(item.id)} />
      <History key={`${item.id}:${item.version}`} id={item.id} revision={revision} />
    </>}
    <ConfirmationDialog id="case-archive-confirmation" open={archive !== null} title="Archivar expediente" consequences="Se eliminaran de forma irreversible todas las conversaciones, sus intercambios y estados. Desarchivar no las recupera. Los participantes, actuaciones y documentos no se eliminan." confirmLabel="Eliminar conversaciones y archivar" pending={pending} onCancel={() => setArchive(null)} onConfirm={() => { if (archive) void change('ARCHIVE', archive); }} />
  </section>;
}