import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { formatEventDateTime } from '../../shared/formats';
import { feedbackForError, type Feedback } from '../../shared/presentation';
import { useAvailableAgents } from './agents';
import { AgentSelect, StatusNotice } from './ui';

interface Agent { id: string; name: string }
interface Source { id: string; kind: 'CASE' | 'PDF'; label: string }
interface Exchange { id: string; question: string; answer: string; agent: Agent; occurredAt: string; sources: Source[] }
interface Summary { id: string; caseId: string; createdAt: string; activeAgent: Agent; version: number }
interface Conversation extends Summary { exchanges: Exchange[] }
interface Page { items: Summary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
interface Pdf { id: string; name: string; availability: string }
interface Props { caseId: string; initialAgentId: string; pending: boolean; onRefreshCase: () => void }
const SUMMARY = 'id caseId createdAt activeAgent{id name} version';
const DETAILS = `${SUMMARY} exchanges{id question answer agent{id name} occurredAt sources{id kind label}}`;
function failure(error: unknown): Feedback {
  const category = error instanceof GraphqlFailure ? error.category : 'SERVICE_UNAVAILABLE';
  const base = feedbackForError(category === 'VALIDATION' ? 'validation' : category === 'CONFLICT' ? 'conflict' : category === 'FORBIDDEN' ? 'forbidden' : category === 'UNAUTHENTICATED' ? 'unauthenticated' : category === 'NOT_FOUND' ? 'not-found' : 'unavailable');
  return { ...base, message: error instanceof GraphqlFailure ? error.message : base.message };
}

export default function CaseConversations(props: Props) {
  const catalog = useAvailableAgents();
  const [online, setOnline] = useState(navigator.onLine), [allowed, setAllowed] = useState(false);
  const [page, setPage] = useState<Page | null>(null), [conversation, setConversation] = useState<Conversation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null), [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null), [readError, setReadError] = useState<Feedback | null>(null);
  const [alternative, setAlternative] = useState(''), [selectedAgent, setSelectedAgent] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({}), [scope, setScope] = useState<'CASE' | 'PDF'>('CASE'), [documentId, setDocumentId] = useState('');
  const [pdfs, setPdfs] = useState<Pdf[]>([]), [pdfLoading, setPdfLoading] = useState(false), [pdfError, setPdfError] = useState<Feedback | null>(null);
  const operation = useRef<AbortController | null>(null), questionInput = useRef<HTMLTextAreaElement>(null);
  const after = cursors[cursors.length - 1], busy = pending || props.pending || loading;
  const initial = catalog.agents.find(agent => agent.id === props.initialAgentId);
  const activeEnabled = catalog.agents.some(agent => agent.id === conversation?.activeAgent.id && agent.enabled);
  const chosenEnabled = catalog.agents.some(agent => agent.id === selectedAgent && agent.enabled);
  const question = selectedId ? drafts[selectedId] ?? '' : '';

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); operation.current?.abort(); };
  }, []);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    setPage(null); setConversation(null); setAllowed(false); setReadError(null); setLoading(true);
    if (online) void (async () => {
      try {
        const eligibility = await requestGraphql<{ caseEligibility: { questionsAllowed: boolean } }>('query($id:ID!){caseEligibility(id:$id){questionsAllowed}}', { id: props.caseId }, controller.signal);
        if (!active) return;
        setAllowed(eligibility.caseEligibility.questionsAllowed);
        if (!eligibility.caseEligibility.questionsAllowed) return;
        const result = await requestGraphql<{ legalConversations: Page; legalConversation?: Conversation }>(
          `query($caseId:ID!,$after:String${selectedId ? ',$id:ID!' : ''}){legalConversations(caseId:$caseId,first:25,after:$after){items{${SUMMARY}}pageInfo{hasNextPage endCursor}}${selectedId ? `legalConversation(caseId:$caseId,id:$id){${DETAILS}}` : ''}}`,
          { caseId: props.caseId, after, ...(selectedId ? { id: selectedId } : {}) }, controller.signal);
        if (active) { setPage(result.legalConversations); setConversation(result.legalConversation ?? null); setSelectedAgent(result.legalConversation?.activeAgent.id ?? ''); setUncertain(false); }
      } catch (error) { if (active) setReadError(failure(error)); }
      finally { if (active) setLoading(false); }
    })();
    else setLoading(false);
    return () => { active = false; controller.abort(); };
  }, [props.caseId, selectedId, after, refresh, online]);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setPdfs([]); setPdfError(null); setPdfLoading(false);
    if (scope === 'PDF' && selectedId && online && allowed) void (async () => {
      setPdfLoading(true);
      try {
        let cursor: string | null = null; const items: Pdf[] = [], seen = new Set<string>();
        do {
          const result: { caseFiles: { items: Pdf[]; pageInfo: Page['pageInfo'] } } = await requestGraphql('query($caseId:ID!,$after:String){caseFiles(caseId:$caseId,first:100,after:$after,filter:{format:PDF}){items{id name availability}pageInfo{hasNextPage endCursor}}}', { caseId: props.caseId, after: cursor }, controller.signal);
          items.push(...result.caseFiles.items.filter(item => item.availability === 'AVAILABLE'));
          if (items.length > 1000) throw new GraphqlFailure('VALIDATION', 'Demasiados PDF para el contexto seguro. No se ocultaron fuentes silenciosamente.');
          cursor = result.caseFiles.pageInfo.hasNextPage ? result.caseFiles.pageInfo.endCursor : null;
          if (cursor && seen.has(cursor)) throw new GraphqlFailure('SERVICE_UNAVAILABLE', 'No se pudo completar la lista de PDF.');
          if (cursor) seen.add(cursor);
        } while (cursor);
        if (active) setPdfs(items);
      } catch (error) { if (active) setPdfError(failure(error)); }
      finally { if (active) setPdfLoading(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [props.caseId, selectedId, online, allowed, scope, refresh]);

  function consult() { setFeedback(null); catalog.refresh(); setRefresh(value => value + 1); }
  async function perform(query: string, variables: Record<string, unknown>, key: string, onConfirmed?: () => void, ai = false) {
    if (operation.current || !online || !allowed || busy || uncertain) return;
    const controller = new AbortController(); operation.current = controller; setPending(true); setFeedback(null);
    try {
      const result = await requestGraphql<Record<string, Conversation>>(query, { caseId: props.caseId, ...variables }, controller.signal, ai ? 60000 : 12000);
      if (!controller.signal.aborted) { setSelectedId(result[key].id); setConversation(result[key]); setSelectedAgent(result[key].activeAgent.id); setCursors([null]); setRefresh(value => value + 1); onConfirmed?.(); }
    } catch (error) {
      if (!controller.signal.aborted) { setFeedback(failure(error)); setUncertain(!(error instanceof GraphqlFailure) || error.uncertain || ['CONFLICT', 'NOT_FOUND'].includes(error.category)); }
    } finally { operation.current = null; if (!controller.signal.aborted) setPending(false); }
  }
  function send(event: FormEvent) {
    event.preventDefault(); if (!conversation || !question.trim()) return;
    const id = conversation.id;
    void perform(`mutation($caseId:ID!,$id:ID!,$input:LegalQuestionInput!){askLegalQuestion(caseId:$caseId,id:$id,input:$input){${DETAILS}}}`,
      { id, input: { question, expectedVersion: conversation.version, scope, ...(scope === 'PDF' ? { documentId } : {}) } }, 'askLegalQuestion',
      () => { setDrafts(previous => ({ ...previous, [id]: '' })); questionInput.current?.focus(); }, true);
  }
  return <section className="al-admin-form" aria-labelledby="case-chat-heading">
    <div className="al-toolbar"><h2 id="case-chat-heading">Asistencia juridica IA</h2><button className="al-button al-button--secondary" disabled={pending || props.pending || !online} onClick={consult}>Actualizar chat</button></div>
    <p className="al-notice">Orientacion juridica para Bolivia. Las respuestas requieren revision profesional.</p>
    {!online && <p role="status">Sin conexion. Chat remoto no disponible.</p>}
    {feedback && <StatusNotice feedback={feedback} />}{readError && <StatusNotice feedback={readError} onRetry={!busy && online ? consult : undefined} />}
    {uncertain && <div className="al-toolbar"><p>Consulta el historial antes de repetir. La pregunta permanece en la entrada.</p><button className="al-button al-button--secondary" disabled={pending || props.pending || !online} onClick={consult}>Consultar conversacion</button><button className="al-button al-button--secondary" disabled={pending || props.pending || !online} onClick={props.onRefreshCase}>Consultar expediente</button></div>}
    {online && loading && <p role="status">Cargando conversaciones...</p>}
    {online && !loading && !readError && !allowed && <p role="status">El expediente Archivado o con archivo pendiente no admite chat.</p>}
    {online && allowed && !readError && <>
      {catalog.feedback && <StatusNotice feedback={catalog.feedback} onRetry={catalog.refresh} />}
      {catalog.loading && <p role="status">Cargando agentes...</p>}
      {catalog.agents.length > 0 && catalog.agents.every(agent => !agent.enabled) && <p className="al-notice" role="alert">No hay agentes habilitados. No se puede iniciar ni enviar una consulta.</p>}
      <fieldset disabled={busy || uncertain || catalog.loading}>
        {!initial?.enabled && initial && <><p className="al-notice">El agente inicial {initial.name} esta deshabilitado. Elige explicitamente otro habilitado; no se cambia el expediente.</p><AgentSelect id="chat-alternative" label="Agente alternativo para nueva conversacion" value={alternative} options={catalog.agents.map(agent => ({ id: agent.id, name: agent.name, available: agent.enabled }))} onChange={event => setAlternative(event.target.value)} /></>}
        <button className="al-button" disabled={!initial || (!initial.enabled && !catalog.agents.some(agent => agent.id === alternative && agent.enabled))} onClick={() => void perform(`mutation($caseId:ID!,$agentId:ID){startLegalConversation(caseId:$caseId,agentId:$agentId){${DETAILS}}}`, { agentId: initial?.enabled ? null : alternative }, 'startLegalConversation')}>Nueva conversacion</button>
      </fieldset>
      <div className="al-chat-layout"><div>
        <h3>Conversaciones</h3>
        {page?.items.length === 0 && <p>Sin conversaciones.</p>}
        {page && <><ul className="al-record-list" aria-label="Conversaciones del expediente">{page.items.map(item => <li key={item.id}><time dateTime={item.createdAt}>{formatEventDateTime(item.createdAt)}</time><p className="al-record-text">{item.id.slice(0, 8)} · {item.activeAgent.name}</p><button className="al-button al-button--secondary" disabled={busy} aria-current={selectedId === item.id ? 'true' : undefined} onClick={() => { setFeedback(null); setSelectedId(item.id); setRefresh(value => value + 1); }}>Abrir conversacion</button></li>)}</ul><div className="al-toolbar"><button className="al-button al-button--secondary" disabled={busy || cursors.length === 1} onClick={() => setCursors(previous => previous.slice(0, -1))}>Chats anteriores</button><button className="al-button al-button--secondary" disabled={busy || !page.pageInfo.hasNextPage} onClick={() => setCursors(previous => [...previous, page.pageInfo.endCursor])}>Chats siguientes</button></div></>}
      </div><div className="al-chat-conversation">
        {conversation && <>
          <h3>Conversacion {conversation.id.slice(0, 8)}</h3><p>Agente activo: {conversation.activeAgent.name}</p>
          <form onSubmit={event => { event.preventDefault(); void perform(`mutation($caseId:ID!,$id:ID!,$agentId:ID!,$version:Int!){changeConversationAgent(caseId:$caseId,id:$id,agentId:$agentId,expectedVersion:$version){${DETAILS}}}`, { id: conversation.id, agentId: selectedAgent, version: conversation.version }, 'changeConversationAgent'); }}><fieldset disabled={busy || uncertain || catalog.loading}><AgentSelect id="chat-agent" label="Agente de esta conversacion" value={selectedAgent} options={catalog.agents.map(agent => ({ id: agent.id, name: agent.name, available: agent.enabled }))} onChange={event => setSelectedAgent(event.target.value)} /><button className="al-button al-button--secondary" disabled={!chosenEnabled || selectedAgent === conversation.activeAgent.id}>Cambiar agente</button></fieldset></form>
          {!activeEnabled && !catalog.loading && <p className="al-notice">El agente activo esta deshabilitado. Cambia explicitamente a otro habilitado para una nueva pregunta.</p>}
          {conversation.exchanges.length === 0 ? <p>Sin intercambios.</p> : <ol className="al-record-list" aria-label="Historial de conversacion">{conversation.exchanges.map(exchange => <li key={exchange.id}><h4>Pregunta</h4><p className="al-chat-text">{exchange.question}</p><h4>{exchange.agent.name}</h4><time dateTime={exchange.occurredAt}>{formatEventDateTime(exchange.occurredAt)}</time><p className="al-chat-text">{exchange.answer}</p>{exchange.sources.length > 0 && <><h4>Fuentes utilizadas</h4><ul>{exchange.sources.map(source => <li key={source.id} className="al-chat-text">{source.kind === 'PDF' ? 'PDF' : 'Expediente'}: {source.label}</li>)}</ul></>}</li>)}</ol>}
          <form onSubmit={send}><fieldset disabled={busy || uncertain || !activeEnabled || catalog.loading}>
            <fieldset className="al-toolbar"><legend>Alcance de analisis</legend><label><input type="radio" name="chat-scope" value="CASE" checked={scope === 'CASE'} onChange={() => setScope('CASE')} /> Expediente completo</label><label><input type="radio" name="chat-scope" value="PDF" checked={scope === 'PDF'} onChange={() => setScope('PDF')} /> PDF</label></fieldset>
            {scope === 'PDF' && <div className="al-field"><label htmlFor="chat-pdf">PDF del expediente (obligatorio)</label><select className="al-input" id="chat-pdf" required value={documentId} onChange={event => setDocumentId(event.target.value)}><option value="" disabled>Selecciona un PDF</option>{documentId && !pdfs.some(item => item.id === documentId) && <option value={documentId} disabled>Documento seleccionado no disponible</option>}{pdfs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{pdfLoading && <p role="status">Cargando PDF...</p>}{pdfError && <StatusNotice feedback={pdfError} />}{!pdfLoading && !pdfError && pdfs.length === 0 && <p>Sin PDF disponibles.</p>}</div>}
            <div className="al-field"><label htmlFor="chat-question">Pregunta (obligatoria)</label><textarea className="al-input" ref={questionInput} id="chat-question" rows={5} maxLength={8000} required value={question} onChange={event => setDrafts(previous => ({ ...previous, [conversation.id]: event.target.value }))} /></div>
            <button className="al-button" disabled={!question.trim() || (scope === 'PDF' && (!documentId || pdfLoading || Boolean(pdfError) || !pdfs.some(item => item.id === documentId)))}>{pending ? 'Consultando...' : 'Enviar pregunta'}</button>
          </fieldset></form>
        </>}
        {pending && <p role="status">Operacion en curso. Aun no hay respuesta confirmada.</p>}
      </div></div>
    </>}
  </section>;
}