import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { feedbackForError, type Feedback } from '../../shared/presentation';
import { StatusNotice, TextField } from './ui';

type PersonType = 'NATURAL' | 'LEGAL';
interface PersonInput {
  type: PersonType; firstNames: string; lastNames: string; businessName: string;
  documentType: string; documentNumber: string; issuingCountry: string; phone: string; email: string; address: string;
}
interface Person extends Omit<PersonInput, 'firstNames' | 'lastNames' | 'businessName' | 'documentType' | 'documentNumber' | 'issuingCountry' | 'phone' | 'email' | 'address'> {
  id: string; displayName: string; firstNames: string | null; lastNames: string | null; businessName: string | null;
  documentType: string | null; documentNumber: string | null; issuingCountry: string | null;
  phone: string | null; email: string | null; address: string | null;
}
interface Page { items: Person[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
const FIELDS = 'id type displayName firstNames lastNames businessName documentType documentNumber issuingCountry phone email address';
const EMPTY: PersonInput = { type: 'NATURAL', firstNames: '', lastNames: '', businessName: '', documentType: '', documentNumber: '', issuingCountry: '', phone: '', email: '', address: '' };
const EMPTY_FILTER = { name: '', type: '', document: '' };
const DOCUMENT_FIELDS = ['documentType', 'documentNumber', 'issuingCountry'] as const;
const LABELS: Record<Exclude<keyof PersonInput, 'type'>, string> = {
  firstNames: 'Nombres', lastNames: 'Apellidos', businessName: 'Razon social', documentType: 'Tipo de documento',
  documentNumber: 'Numero de documento', issuingCountry: 'Pais emisor', phone: 'Telefono', email: 'Correo electronico', address: 'Domicilio',
};
function formValues(person: Person): PersonInput {
  return Object.fromEntries(Object.keys(EMPTY).map(key => [key, person[key as keyof PersonInput] ?? ''])) as unknown as PersonInput;
}
function validation(input: PersonInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = input.type === 'NATURAL' ? ['firstNames', 'lastNames'] as const : ['businessName'] as const;
  for (const key of required) if (!input[key].trim()) errors[key] = 'Este campo es obligatorio.';
  if (DOCUMENT_FIELDS.some(key => input[key].trim())) for (const key of DOCUMENT_FIELDS) if (!input[key].trim()) errors[key] = 'Completa los tres campos de identificacion.';
  return errors;
}
function failure(error: unknown): Feedback {
  const category = error instanceof GraphqlFailure ? error.category : 'SERVICE_UNAVAILABLE';
  const base = feedbackForError(category === 'UNAUTHENTICATED' ? 'unauthenticated' : category === 'FORBIDDEN' ? 'forbidden'
    : category === 'NOT_FOUND' ? 'not-found' : category === 'VALIDATION' ? 'validation' : category === 'CONFLICT' ? 'conflict' : 'unavailable');
  return { ...base, message: error instanceof GraphqlFailure ? error.message : base.message };
}

export default function People() {
  const [mode, setMode] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [filters, setFilters] = useState(EMPTY_FILTER);
  const [applied, setApplied] = useState(EMPTY_FILTER);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<Page | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState<PersonInput>({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [version, setVersion] = useState(0);
  const mutation = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const after = cursors[cursors.length - 1];

  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => { heading.current?.focus(); }, [mode]);
  useEffect(() => {
    if (mode !== 'list' && mode !== 'detail') return;
    let active = true;
    const controller = new AbortController();
    setLoading(true); setFeedback(null); setPage(null); setPerson(null);
    const query = mode === 'list' ? `query($filter:PersonFilter,$after:String){people(first:25,after:$after,filter:$filter){items{${FIELDS}} pageInfo{hasNextPage endCursor}}}`
      : `query($id:ID!){person(id:$id){${FIELDS}}}`;
    const variables = mode === 'list' ? { filter: Object.fromEntries(Object.entries(applied).filter(([, value]) => value.trim() !== '')), after }
      : { id: selectedId };
    requestGraphql<{ people?: Page; person?: Person }>(query, variables, controller.signal).then(data => {
      if (!active) return;
      if (mode === 'list') setPage(data.people!); else { setPerson(data.person!); setInput(formValues(data.person!)); }
    }).catch(error => { if (active) setFeedback(failure(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [mode, applied, after, selectedId, version]);

  function showList() { setFeedback(null); setUncertain(false); setErrors({}); setMode('list'); setVersion(value => value + 1); }
  function startCreate() {
    setSelectedId(null); setPerson(null); setInput({ ...EMPTY }); setFeedback(null); setErrors({}); setUncertain(false); setLoading(false); setMode('create');
  }
  function open(id: string) { setSelectedId(id); setErrors({}); setUncertain(false); setMode('detail'); setVersion(value => value + 1); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (mutation.current || uncertain) return;
    const fields = validation(input); setErrors(fields); setFeedback(null);
    if (Object.keys(fields).length) { setFeedback(feedbackForError('validation')); return; }
    const controller = new AbortController(); mutation.current = controller; setPending(true);
    const payload = { ...input, ...(input.type === 'NATURAL' ? { businessName: null } : { firstNames: null, lastNames: null }) };
    try {
      const data = await requestGraphql<{ createPerson?: Person; updatePerson?: Person }>(mode === 'create'
        ? `mutation($input:PersonInput!){createPerson(input:$input){${FIELDS}}}`
        : `mutation($id:ID!,$input:PersonInput!){updatePerson(id:$id,input:$input){${FIELDS}}}`, { input: payload, id: selectedId }, controller.signal);
      if (controller.signal.aborted) return;
      const saved = data.createPerson ?? data.updatePerson!;
      setSelectedId(saved.id); setPerson(saved); setInput(formValues(saved)); setMode('detail');
    } catch (error) {
      if (controller.signal.aborted) return;
      setFeedback(failure(error));
      if (error instanceof GraphqlFailure) { setErrors(Object.fromEntries(error.fields.map(field => [field.field, field.message]))); setUncertain(error.uncertain); }
      else setUncertain(true);
    } finally { mutation.current = null; if (!controller.signal.aborted) setPending(false); }
  }
  function field(key: Exclude<keyof PersonInput, 'type'>, required = false) {
    return <TextField key={key} id={`person-${key}`} label={LABELS[key]} value={input[key]} required={required} error={errors[key]}
      onChange={event => { setInput(previous => ({ ...previous, [key]: event.target.value })); setErrors(previous => ({ ...previous, [key]: '' })); }} />;
  }
  const editing = mode === 'create' || mode === 'edit';
  return <section aria-labelledby="people-heading">
    <div className="al-toolbar al-people-heading">
      <h1 id="people-heading" ref={heading} tabIndex={-1}>{mode === 'list' ? 'Personas' : mode === 'create' ? 'Registrar persona' : mode === 'edit' ? 'Editar ficha' : 'Ficha de persona'}</h1>
      {mode === 'list' ? <button className="al-button" type="button" onClick={startCreate}>Registrar persona</button>
        : <button className="al-button al-button--secondary" type="button" disabled={pending} onClick={showList}>Volver al listado</button>}
    </div>
    {feedback && <StatusNotice feedback={feedback} onRetry={!editing ? () => setVersion(value => value + 1) : undefined} />}
    {mode === 'list' && <>
      <form className="al-filter-grid al-people-filters" onSubmit={event => { event.preventDefault(); setCursors([null]); setApplied({ ...filters }); }}>
        <TextField id="people-name" label="Nombre o razon social" value={filters.name} onChange={event => setFilters({ ...filters, name: event.target.value })} />
        <div className="al-field"><label htmlFor="people-type">Tipo de persona</label><select className="al-input" id="people-type" value={filters.type} onChange={event => setFilters({ ...filters, type: event.target.value })}>
          <option value="">Todos</option><option value="NATURAL">Natural</option><option value="LEGAL">Juridica</option>
        </select></div>
        <TextField id="people-document" label="Numero de documento" value={filters.document} onChange={event => setFilters({ ...filters, document: event.target.value })} />
        <div className="al-toolbar"><button className="al-button" type="submit" disabled={loading}>Buscar</button>
          <button className="al-button al-button--secondary" type="button" onClick={() => { setFilters(EMPTY_FILTER); setApplied({ ...EMPTY_FILTER }); setCursors([null]); }}>Limpiar</button></div>
      </form>
      {page?.items.length === 0 && <StatusNotice feedback={{ kind: 'empty', title: 'Sin personas', message: 'No hay personas que coincidan con los filtros.' }} />}
      {page && page.items.length > 0 && <div className="al-table-scroll"><table className="al-table"><caption className="al-muted">Personas de mi cuenta</caption><thead><tr><th scope="col">Nombre o razon social</th><th scope="col">Tipo</th><th scope="col">Identificacion</th><th scope="col">Ficha</th></tr></thead>
        <tbody>{page.items.map(item => <tr key={item.id}><td>{item.displayName}</td><td>{item.type === 'NATURAL' ? 'Natural' : 'Juridica'}</td>
          <td>{item.documentType ? `${item.documentType} / ${item.documentNumber} / ${item.issuingCountry}` : 'Sin identificacion'}</td>
          <td><button className="al-button al-button--secondary" type="button" aria-label={`Ver ficha de ${item.displayName}`} onClick={() => open(item.id)}>Ver ficha</button></td></tr>)}</tbody></table></div>}
      {page && <div className="al-toolbar"><button className="al-button al-button--secondary" type="button" disabled={cursors.length === 1 || loading} onClick={() => setCursors(previous => previous.slice(0, -1))}>Anterior</button>
        <span>Pagina {cursors.length}</span><button className="al-button al-button--secondary" type="button" disabled={!page.pageInfo.hasNextPage || loading} onClick={() => setCursors(previous => [...previous, page.pageInfo.endCursor])}>Siguiente</button>
        <button className="al-button al-button--secondary" type="button" title="Actualizar listado" aria-label="Actualizar listado" disabled={loading} onClick={() => setVersion(value => value + 1)}>&#8635;</button></div>}
    </>}
    {loading && <p role="status">Cargando personas...</p>}
    {mode === 'detail' && person && <div className="al-person-detail">
      <h2>{person.displayName}</h2><dl className="al-admin-data"><dt>Tipo de persona</dt><dd>{person.type === 'NATURAL' ? 'Natural' : 'Juridica'}</dd>
        {Object.entries(LABELS).filter(([key]) => person.type === 'NATURAL' ? key !== 'businessName' : !['firstNames', 'lastNames'].includes(key)).map(([key, label]) =>
          <div className="al-person-fact" key={key}><dt>{label}</dt><dd>{person[key as keyof PersonInput] || 'No informado'}</dd></div>)}</dl>
      <button className="al-button" type="button" onClick={() => { setInput(formValues(person)); setFeedback(null); setMode('edit'); }}>Editar ficha</button>
    </div>}
    {editing && <form className="al-person-form" noValidate onSubmit={event => void save(event)}>
      <fieldset disabled={pending}>
        <legend className="al-person-legend">Datos de la persona</legend>
        <div className="al-field"><label htmlFor="person-type">Tipo de persona (obligatorio)</label><select id="person-type" className="al-input" value={input.type}
          onChange={event => { setInput(previous => ({ ...previous, type: event.target.value as PersonType })); setErrors({}); }}>
          <option value="NATURAL">Natural</option><option value="LEGAL">Juridica</option></select></div>
        <div className="al-grid">{input.type === 'NATURAL' ? <>{field('firstNames', true)}{field('lastNames', true)}</> : field('businessName', true)}</div>
        <h2>Identificacion</h2><div className="al-grid">{DOCUMENT_FIELDS.map(key => field(key, DOCUMENT_FIELDS.some(part => Boolean(input[part].trim()))))}</div>
        <h2>Contacto</h2><div className="al-grid">{field('phone')}{field('email')}</div>{field('address')}
        {uncertain && <p className="al-notice" role="alert">Resultado no confirmado. El guardado queda bloqueado; vuelve al listado y comprueba la ficha antes de repetirlo.</p>}
        <div className="al-toolbar"><button className="al-button" type="submit" disabled={pending || uncertain} aria-busy={pending}>{pending ? 'Guardando...' : 'Guardar persona'}</button>
          <button className="al-button al-button--secondary" type="button" disabled={pending} onClick={() => { if (selectedId) open(selectedId); else showList(); }}>Cancelar</button></div>
      </fieldset>
    </form>}
  </section>;
}