import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import StatBar from './components/StatBar.jsx';
import Briefing from './components/Briefing.jsx';
import Triage from './components/Triage.jsx';
import Flags from './components/Flags.jsx';
import MessageFlyout from './components/MessageFlyout.jsx';
import { messages } from './lib/messages.js';
import { getTodayBriefing, setCompletion, setOverride } from './lib/api.js';

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
  const [today, setToday] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getTodayBriefing(messages);
      setToday(row);
    } catch (e) {
      setError(e?.message ?? 'Unknown error');
      setToday(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const triage = today?.triage ?? [];
  const overrides = today?.overrides ?? {};
  const completedIds = today?.completed_ids ?? [];
  const daySummary = today?.day_summary ?? null;
  const sourceMessages = today?.messages ?? messages;
  const briefing = today
    ? { sections: today.sections, generated_at: today.generated_at }
    : null;

  const enriched = useMemo(() => {
    if (!triage.length) return [];
    const byId = new Map(triage.map(t => [t.id, t]));
    return sourceMessages
      .map(m => {
        const t = byId.get(m.id);
        if (!t) return null;
        const override = overrides[String(m.id)];
        return { ...m, ...t, category: override ?? t.category, overridden: !!override };
      })
      .filter(Boolean);
  }, [triage, overrides, sourceMessages]);

  const counts = useMemo(
    () => ({
      total: sourceMessages.length,
      decide: enriched.filter(m => m.category === 'Decide').length,
      delegate: enriched.filter(m => m.category === 'Delegate').length,
      flagged: enriched.filter(m => m.flagged).length,
      ignore: enriched.filter(m => m.category === 'Ignore').length,
    }),
    [enriched, sourceMessages],
  );

  const openMessage = id => {
    const m = enriched.find(x => x.id === id);
    if (m) setSelected(m);
  };

  const toggleCompletion = async messageId => {
    if (!today) return;
    const isCurrentlyDone = completedIds.includes(messageId);
    const snapshot = today;
    const optimistic = {
      ...today,
      completed_ids: isCurrentlyDone
        ? completedIds.filter(id => id !== messageId)
        : [...completedIds, messageId],
    };
    setToday(optimistic);
    try {
      const updated = await setCompletion(messageId, !isCurrentlyDone);
      setToday(updated);
    } catch (e) {
      setToday(snapshot);
      setError(e?.message ?? 'Failed to update completion');
    }
  };

  const applyOverride = async (messageId, category) => {
    if (!today) return;
    const snapshot = today;
    const nextOverrides = { ...overrides };
    if (category === null) delete nextOverrides[String(messageId)];
    else nextOverrides[String(messageId)] = category;
    setToday({ ...today, overrides: nextOverrides });
    try {
      const updated = await setOverride(messageId, category);
      setToday(updated);
      const t = (updated.triage ?? []).find(x => x.id === messageId);
      const override = (updated.overrides ?? {})[String(messageId)];
      if (t) {
        setSelected(prev =>
          prev?.id === messageId
            ? { ...prev, ...t, category: override ?? t.category, overridden: !!override }
            : prev,
        );
      }
    } catch (e) {
      setToday(snapshot);
      setError(e?.message ?? 'Failed to update category');
    }
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
                completedIds={completedIds}
                daySummary={daySummary}
                onToggle={toggleCompletion}
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

      <MessageFlyout
        message={selected}
        onClose={() => setSelected(null)}
        onOverride={applyOverride}
      />
    </div>
  );
}
