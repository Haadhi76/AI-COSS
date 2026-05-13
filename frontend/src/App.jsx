import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import StatBar from './components/StatBar.jsx';
import Briefing from './components/Briefing.jsx';
import Triage from './components/Triage.jsx';
import Flags from './components/Flags.jsx';
import MessageFlyout from './components/MessageFlyout.jsx';
import { messages } from './lib/messages.js';
import { triageMessages, generateBriefing } from './lib/claude.js';

const TITLES = {
  briefing: 'Morning Briefing',
  triage: 'Communications Triage',
  flags: 'Risk Flags',
};

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 animate-fade-in"
    >
      <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-900 text-sm">Couldn't reach the backend.</p>
        <p className="text-red-700/80 text-xs mt-1 break-words">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg transition-colors shrink-0"
      >
        <RotateCw size={12} />
        Retry
      </button>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState('briefing');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const triageResult = await triageMessages(messages);
      setTriage(triageResult);
      const briefingResult = await generateBriefing(messages, triageResult);
      setBriefing(briefingResult);
    } catch (e) {
      setError(e?.message ?? 'Unknown error');
      setTriage([]);
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Stitch raw messages with their triage verdict for downstream views.
  const enriched = useMemo(() => {
    if (!triage.length) return [];
    const byId = new Map(triage.map(t => [t.id, t]));
    return messages
      .map(m => ({ ...m, ...(byId.get(m.id) ?? {}) }))
      .filter(m => m.category);
  }, [triage]);

  const counts = useMemo(
    () => ({
      total: messages.length,
      decide: enriched.filter(m => m.category === 'Decide').length,
      delegate: enriched.filter(m => m.category === 'Delegate').length,
      flagged: enriched.filter(m => m.flagged).length,
      ignore: enriched.filter(m => m.category === 'Ignore').length,
    }),
    [enriched],
  );

  const openMessage = id => {
    const m = enriched.find(x => x.id === id);
    if (m) setSelected(m);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar active={active} onChange={setActive} counts={counts} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StatBar counts={counts} title={TITLES[active]} />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
            {error && <ErrorBanner message={error} onRetry={load} />}

            {active === 'briefing' && (
              <Briefing
                briefing={briefing}
                loading={loading}
                onJumpToTriage={() => setActive('triage')}
                onOpenMessage={openMessage}
                noiseCount={counts.ignore}
              />
            )}
            {active === 'triage' && (
              <Triage
                items={enriched}
                loading={loading}
                onSelect={setSelected}
                selectedId={selected?.id}
              />
            )}
            {active === 'flags' && (
              <Flags
                items={enriched.filter(m => m.flagged)}
                loading={loading}
                onSelect={setSelected}
              />
            )}
          </div>
        </div>
      </main>

      <MessageFlyout message={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
