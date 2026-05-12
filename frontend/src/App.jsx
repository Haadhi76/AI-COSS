import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import StatBar from './components/StatBar.jsx';
import Briefing from './components/Briefing.jsx';
import Triage from './components/Triage.jsx';
import Flags from './components/Flags.jsx';
import MessageFlyout from './components/MessageFlyout.jsx';
import { messages, mockTriage, mockBriefing } from './lib/messages.js';

const TITLES = {
  briefing: 'Morning Briefing',
  triage: 'Communications Triage',
  flags: 'Risk Flags',
};

export default function App() {
  const [active, setActive] = useState('briefing');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState([]);
  const [briefing, setBriefing] = useState(null);

  // Simulate the Claude round-trip so skeletons get exercised. The real
  // calls in lib/claude.js will replace this in the next pass.
  useEffect(() => {
    const t = setTimeout(() => {
      setTriage(mockTriage);
      setBriefing(mockBriefing);
      setLoading(false);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  // Stitch raw messages with their triage verdict for downstream views.
  const enriched = useMemo(() => {
    if (!triage.length) return [];
    const byId = new Map(triage.map(t => [t.id, t]));
    return messages
      .map(m => ({ ...m, ...(byId.get(m.id) ?? {}) }))
      .filter(m => m.category); // drop any not yet processed
  }, [triage]);

  const counts = useMemo(
    () => ({
      total: messages.length,
      decide: enriched.filter(m => m.category === 'Decide').length,
      delegate: enriched.filter(m => m.category === 'Delegate').length,
      flagged: enriched.filter(m => m.flagged).length,
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
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full">
            {active === 'briefing' && (
              <Briefing
                briefing={briefing}
                loading={loading}
                onJumpToTriage={() => setActive('triage')}
                onOpenMessage={openMessage}
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
