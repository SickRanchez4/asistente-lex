import { useEffect, useState } from 'react';
import { AgentSelect, StatusNotice } from './ui';
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
  const [selectedId, setSelectedId] = useState('');
  const selected = agents.find(agent => agent.id === selectedId);
  return <section aria-labelledby="available-agents-heading" className="al-admin-form">
    <div className="al-toolbar"><h2 id="available-agents-heading">Agentes juridicos</h2>
      <button className="al-button al-button--secondary" type="button" title="Actualizar agentes" aria-label="Actualizar agentes" onClick={refresh}>&#8635;</button>
    </div>
    {loading && <p role="status">Cargando agentes...</p>}
    {feedback && <StatusNotice feedback={feedback} onRetry={refresh} />}
    {agents.length > 0 && <>
      <AgentSelect id="available-agent" label="Agente" value={selectedId} onChange={event => setSelectedId(event.target.value)}
        options={agents.map(agent => ({ id: agent.id, name: `${agent.name} / ${agent.specialty}`, available: agent.enabled }))} />
      {selected && !selected.enabled && <p className="al-notice" role="status">{selected.unavailableReason} Selecciona explicitamente otro agente habilitado.</p>}
      {agents.every(agent => !agent.enabled) && <p className="al-notice" role="alert">No hay agentes habilitados. No se pueden crear expedientes ni enviar nuevas preguntas.</p>}
    </>}
  </section>;
}