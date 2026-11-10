import { useEffect, useState } from 'react';
import { StatusNotice } from './ui';
import { RefreshCw } from 'lucide-react';
import { GraphqlFailure, requestGraphql } from '../../shared/graphql';
import { feedbackForError, type Feedback } from '../../shared/presentation';

export interface AvailableAgent { id: string; name: string; specialty: string; enabled: boolean; unavailableReason: string | null }

export function useAvailableAgents() {
  const [agents, setAgents] = useState<AvailableAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    let active = true;
    let reading = false;
    const controller = new AbortController();
    async function read() {
      if (reading) return;
      reading = true;
      try {
        const data = await requestGraphql<{ availableAgents: AvailableAgent[] }>('{availableAgents{id name specialty enabled unavailableReason}}', {}, controller.signal);
        if (active) { setAgents(data.availableAgents); setFeedback(null); }
      } catch (error) {
        if (active) {
          setAgents([]);
          const base = feedbackForError(error instanceof GraphqlFailure && error.category === 'UNAUTHENTICATED' ? 'unauthenticated' : 'unavailable');
          setFeedback({ ...base, message: error instanceof GraphqlFailure ? error.message : base.message });
        }
      } finally { reading = false; if (active) setLoading(false); }
    }
    void read();
    const refresh = () => { if (!document.hidden) void read(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('al-agents-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 30000);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('al-agents') : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      active = false; controller.abort(); window.clearInterval(interval); channel?.close();
      window.removeEventListener('focus', refresh); window.removeEventListener('al-agents-changed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refreshVersion]);
  return { agents, loading, feedback, refresh: () => setRefreshVersion(value => value + 1) };
}

export default function AgentCatalog() {
  const { agents, loading, feedback, refresh } = useAvailableAgents();
  return <section aria-labelledby="available-agents-heading" className="al-agent-catalog" aria-busy={loading}>
    <div className="al-section-heading"><h2 id="available-agents-heading">Agentes jurídicos</h2>
      <button className="al-button al-button--secondary al-icon-button" type="button" title="Actualizar agentes" aria-label="Actualizar agentes" disabled={loading} onClick={refresh}><RefreshCw className="al-icon" aria-hidden="true" /></button>
    </div>
    {loading && <p role="status">Cargando agentes...</p>}
    {feedback && <StatusNotice feedback={feedback} onRetry={refresh} />}
    {!loading && !feedback && agents.length === 0 && <StatusNotice feedback={{ kind: 'empty', title: 'Sin agentes disponibles', message: 'No hay agentes en el catálogo en este momento.' }} />}
    {agents.length > 0 && <>
      <ul className="al-agent-list">{agents.map(agent => <li key={agent.id}>
        <div><strong>{agent.name}</strong><p>{agent.specialty}</p>{!agent.enabled && <p>{agent.unavailableReason ?? 'Agente deshabilitado'}</p>}</div>
        <span className="al-badge" data-state={agent.enabled ? 'enabled' : 'disabled'}>{agent.enabled ? 'Disponible' : 'No disponible'}</span>
      </li>)}</ul>
      {agents.every(agent => !agent.enabled) && <p className="al-notice" role="alert">No hay agentes habilitados. No se pueden crear expedientes ni enviar nuevas preguntas.</p>}
    </>}
  </section>;
}