import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { feedbackForError, type CaseState, type Feedback } from '../../shared/presentation';
import { ConfirmationDialog, StatusNotice, TextField } from './ui';

type Role = 'REPRESENTED_PERSON' | 'COUNTERPARTY' | 'WITNESS' | 'REPRESENTATIVE' | 'OTHER';
interface Selection { id: string; type: 'NATURAL' | 'LEGAL'; displayName: string }
interface Participant { id: string; person: Selection; role: Role; detail: string | null; version: number }
interface Page<T> { items: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
const FIELDS = 'id person{id type displayName} role detail version';
const ROLES: Record<Role, string> = { REPRESENTED_PERSON: 'Persona defendida o representada', COUNTERPARTY: 'Contraparte', WITNESS: 'Testigo', REPRESENTATIVE: 'Representante', OTHER: 'Otro' };
function failure(error: unknown): Feedback {
  const category = error instanceof GraphqlFailure ? error.category : 'SERVICE_UNAVAILABLE';
  const base = feedbackForError(category === 'UNAUTHENTICATED' ? 'unauthenticated' : category === 'FORBIDDEN' ? 'forbidden' : category === 'NOT_FOUND' ? 'not-found' : category === 'CONFLICT' ? 'conflict' : category === 'VALIDATION' ? 'validation' : 'unavailable');
  return { ...base, message: error instanceof GraphqlFailure ? error.message : base.message };
}

function PersonPicker({ selected, onSelect, disabled }: { selected: Selection | null; onSelect: (person: Selection) => void; disabled: boolean }) {
  const [name, setName] = useState(''), [applied, setApplied] = useState('');
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<Page<Selection> | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null), [refresh, setRefresh] = useState(0);
  const after = cursors[cursors.length - 1];
  useEffect(() => {
    let active = true; const controller = new AbortController(); setPage(null); setFeedback(null);
    requestGraphql<{ personSelections: Page<Selection> }>('query($filter:PersonFilter,$after:String){personSelections(first:25,filter:$filter,after:$after){items{id type displayName}pageInfo{hasNextPage endCursor}}}', { filter: applied.trim() ? { name: applied } : {}, after }, controller.signal)
      .then(data => { if (active) setPage(data.personSelections); }).catch(error => { if (active) setFeedback(failure(error)); });
    return () => { active = false; controller.abort(); };
  }, [applied, after, refresh]);
  return <section aria-labelledby="participant-person-heading">
    <h3 id="participant-person-heading">Persona registrada</h3>
    <form onSubmit={event => { event.preventDefault(); setCursors([null]); setApplied(name); setRefresh(value => value + 1); }}>
      <fieldset disabled={disabled}><TextField id="participant-person-search" label="Nombre o razon social" value={name} onChange={event => setName(event.target.value)} />
        <button className="al-button al-button--secondary" type="submit">Buscar personas</button></fieldset>
    </form>
    {selected && <p role="status">Persona seleccionada: <strong>{selected.displayName}</strong></p>}
    {feedback ? <StatusNotice feedback={feedback} onRetry={() => setRefresh(value => value + 1)} /> : !page ? <p role="status">Cargando personas...</p> : page.items.length === 0 ? <p>Sin personas que coincidan. <a href="/abogado/personas">Personas</a></p> : <>
      <div className="al-table-scroll"><table className="al-table"><caption>Personas de mi cuenta</caption><thead><tr><th>Persona</th><th>Tipo</th></tr></thead><tbody>{page.items.map(person => <tr key={person.id}><td><label className="al-participant-choice"><input type="radio" name="participant-person" checked={selected?.id === person.id} disabled={disabled} onChange={() => onSelect(person)} />{person.displayName}</label></td><td>{person.type === 'NATURAL' ? 'Natural' : 'Juridica'}</td></tr>)}</tbody></table></div>
      <div className="al-toolbar"><button type="button" className="al-button al-button--secondary" disabled={disabled || cursors.length === 1} onClick={() => setCursors(previous => previous.slice(0, -1))}>Personas anteriores</button><span>Pagina {cursors.length}</span><button type="button" className="al-button al-button--secondary" disabled={disabled || !page.pageInfo.hasNextPage} onClick={() => setCursors(previous => [...previous, page.pageInfo.endCursor])}>Personas siguientes</button></div>
    </>}
  </section>;
}

export default function Participants({ caseId, state, pending: parentPending, onRefreshCase }: { caseId: string; state: CaseState; pending: boolean; onRefreshCase: () => void }) {
  const [page, setPage] = useState<Page<Participant> | null>(null), [caseState, setCaseState] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [mode, setMode] = useState<'list' | 'link' | 'edit'>('list');
  const [selected, setSelected] = useState<Selection | null>(null), [editing, setEditing] = useState<Participant | null>(null);
  const [role, setRole] = useState<Role | ''>(''), [detail, setDetail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null), [readFeedback, setReadFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [refresh, setRefresh] = useState(0);
  const [removing, setRemoving] = useState<Participant | null>(null);
  const mutation = useRef<AbortController | null>(null), formHeading = useRef<HTMLHeadingElement>(null);
  const after = cursors[cursors.length - 1], writable = state === 'Abierto' && caseState === 'OPEN', busy = pending || parentPending;
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => { if (mode !== 'list') formHeading.current?.focus(); }, [mode]);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setPage(null); setReadFeedback(null); setCaseState(null);
    requestGraphql<{ participants: Page<Participant>; caseEligibility: { state: string } }>(`query($caseId:ID!,$after:String){participants(caseId:$caseId,first:25,after:$after){items{${FIELDS}}pageInfo{hasNextPage endCursor}}caseEligibility(id:$caseId){state}}`, { caseId, after }, controller.signal)
      .then(data => { if (active) { setPage(data.participants); setCaseState(data.caseEligibility.state); setUncertain(false); } })
      .catch(error => { if (active) setReadFeedback(failure(error)); });
    return () => { active = false; controller.abort(); };
  }, [caseId, state, after, refresh]);
  function consult() { setMode('list'); setEditing(null); setRemoving(null); setFeedback(null); setErrors({}); setRefresh(value => value + 1); }
  function start(item?: Participant) {
    setEditing(item ?? null); setSelected(item?.person ?? null); setRole(item?.role ?? ''); setDetail(item?.detail ?? ''); setErrors({}); setFeedback(null); setMode(item ? 'edit' : 'link');
  }
  async function mutate(remove?: Participant) {
    if (mutation.current || !writable || uncertain || parentPending) return;
    const fields: Record<string, string> = {};
    if (!remove) { if (!selected) fields.personId = 'Selecciona una persona.'; if (!role) fields.role = 'Selecciona un rol.'; if (role === 'OTHER' && !detail.trim()) fields.detail = 'Describe el rol Otro.'; }
    setErrors(fields); if (Object.keys(fields).length) { setFeedback(feedbackForError('validation')); return; }
    const controller = new AbortController(); mutation.current = controller; setPending(true); setFeedback(null);
    try {
      const query = remove ? 'mutation($caseId:ID!,$id:ID!,$version:Int!){unlinkParticipant(caseId:$caseId,id:$id,expectedVersion:$version){id removed}}'
        : editing ? `mutation($caseId:ID!,$id:ID!,$version:Int!,$input:ParticipantInput!){updateParticipant(caseId:$caseId,id:$id,expectedVersion:$version,input:$input){${FIELDS}}}`
          : `mutation($caseId:ID!,$personId:ID!,$input:ParticipantInput!){linkParticipant(caseId:$caseId,personId:$personId,input:$input){${FIELDS}}}`;
      await requestGraphql(query, { caseId, id: remove?.id ?? editing?.id, version: remove?.version ?? editing?.version, personId: selected?.id, input: { role, detail: role === 'OTHER' ? detail : null } }, controller.signal);
      if (!controller.signal.aborted) { setMode('list'); setEditing(null); setSelected(null); setRemoving(null); setCursors([null]); setRefresh(value => value + 1); setFeedback({ kind: 'success', title: remove ? 'Participacion retirada' : 'Participacion guardada', message: remove ? 'La persona y sus servicios se conservan.' : 'El rol contextual se guardo en este expediente.' }); }
    } catch (error) {
      if (!controller.signal.aborted) {
        setFeedback(failure(error)); setRemoving(null);
        if (error instanceof GraphqlFailure) { setErrors(Object.fromEntries(error.fields.map(field => [field.field, field.message]))); setUncertain(error.uncertain || error.category === 'CONFLICT' || error.category === 'NOT_FOUND'); } else setUncertain(true);
      }
    } finally { mutation.current = null; if (!controller.signal.aborted) setPending(false); }
  }
  function save(event: FormEvent) { event.preventDefault(); void mutate(); }
  return <section aria-labelledby="participants-heading" className="al-admin-form">
    <div className="al-toolbar"><h2 id="participants-heading">Participantes</h2>{mode === 'list' && writable && <button className="al-button" disabled={busy || uncertain} onClick={() => start()}>Vincular persona</button>}
      <button className="al-button al-button--secondary" disabled={busy} onClick={consult}>Actualizar participantes</button></div>
    {(state !== 'Abierto' || (caseState !== null && caseState !== 'OPEN')) && <p className="al-notice" role="status">Participantes de solo lectura: el expediente no esta Abierto.</p>}
    {feedback && <StatusNotice feedback={feedback} />}
    {uncertain && <div className="al-toolbar"><p>Resultado no confirmado o datos desactualizados. Consulta el estado antes de repetir.</p><button className="al-button al-button--secondary" disabled={busy} onClick={consult}>Consultar participantes</button><button className="al-button al-button--secondary" disabled={busy} onClick={onRefreshCase}>Consultar expediente</button></div>}
    {readFeedback ? <StatusNotice feedback={readFeedback} onRetry={!busy ? consult : undefined} /> : !page ? <p role="status">Cargando participantes...</p> : page.items.length === 0 ? <p>Sin participantes vinculados.</p> : <>
      <div className="al-table-scroll"><table className="al-table"><caption>Participantes del expediente</caption><thead><tr><th>Persona</th><th>Rol</th><th>Detalle</th>{writable && <th>Acciones</th>}</tr></thead><tbody>{page.items.map(item => <tr key={item.id}><td>{item.person.displayName}</td><td>{ROLES[item.role]}</td><td>{item.detail ?? 'Sin detalle'}</td>{writable && <td><div className="al-toolbar"><button className="al-button al-button--secondary" disabled={busy || uncertain || mode !== 'list'} onClick={() => start(item)}>Cambiar rol</button><button className="al-button al-button--danger" disabled={busy || uncertain || mode !== 'list'} onClick={() => setRemoving(item)}>Desvincular</button></div></td>}</tr>)}</tbody></table></div>
      <div className="al-toolbar"><button className="al-button al-button--secondary" disabled={busy || mode !== 'list' || cursors.length === 1} onClick={() => setCursors(previous => previous.slice(0, -1))}>Participantes anteriores</button><span>Pagina {cursors.length}</span><button className="al-button al-button--secondary" disabled={busy || mode !== 'list' || !page.pageInfo.hasNextPage} onClick={() => setCursors(previous => [...previous, page.pageInfo.endCursor])}>Participantes siguientes</button></div>
    </>}
    {mode !== 'list' && <div className="al-admin-form">
      <h3 ref={formHeading} tabIndex={-1}>{mode === 'link' ? 'Vincular persona' : 'Cambiar rol'}</h3>
      {mode === 'link' ? <PersonPicker selected={selected} onSelect={person => { setSelected(person); setErrors(previous => ({ ...previous, personId: '' })); }} disabled={busy || uncertain || !writable} /> : <p>{selected?.displayName}</p>}
      {errors.personId && <p className="al-field-error" role="alert">{errors.personId}</p>}
      <form onSubmit={save}><fieldset disabled={busy || uncertain || !writable}>
        <div className="al-field"><label htmlFor="participant-role">Rol (obligatorio)</label><select className="al-input" id="participant-role" required value={role} aria-invalid={Boolean(errors.role)} onChange={event => { setRole(event.target.value as Role); setDetail(''); }}><option value="" disabled>Selecciona un rol</option>{Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{errors.role && <p className="al-field-error">{errors.role}</p>}</div>
        {role === 'OTHER' && <TextField id="participant-detail" label="Descripcion del rol Otro" required value={detail} error={errors.detail} onChange={event => setDetail(event.target.value)} />}
        <button className="al-button" type="submit" disabled={busy || uncertain || !writable}>{pending ? 'Guardando...' : 'Guardar participacion'}</button>
      </fieldset></form>
      <button className="al-button al-button--secondary" disabled={busy} onClick={() => { setMode('list'); setFeedback(null); setErrors({}); }}>Cancelar edicion</button>
    </div>}
    <ConfirmationDialog id="participant-unlink" open={removing !== null} title="Desvincular participante" consequences="Se retirara solo la participacion de este expediente. La ficha de la persona y sus servicios se conservan." confirmLabel="Desvincular" pending={pending} onCancel={() => setRemoving(null)} onConfirm={() => { if (removing) void mutate(removing); }} />
  </section>;
}