import {
  Coffee,
  AlertTriangle,
  UserCheck,
  Eye,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { BriefingSkeleton } from './SkeletonLoader.jsx';

const SECTION_TITLES = {
  decisions: 'Top Decisions Needed',
  delegated: 'Delegated Actions',
  watch: 'Watch Items',
  quickWins: 'Quick Wins',
};

function itemsByTitle(briefing, title) {
  const section = briefing.sections?.find(s => s.title === title);
  return section?.items ?? [];
}

function formatGeneratedAt(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Section({ icon: Icon, title, accent, count, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </span>
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
        <span className="ml-auto text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
          {count}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

function Row({ item, onOpen }) {
  return (
    <li>
      <button
        onClick={() => onOpen(item.message_id)}
        className="group w-full cursor-pointer text-left flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors duration-200"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">{item.summary}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.action}</p>
        </div>
        <ArrowUpRight
          size={16}
          className="text-slate-300 group-hover:text-brand-500 mt-0.5 shrink-0 transition-colors"
        />
      </button>
    </li>
  );
}

export default function Briefing({
  briefing,
  loading,
  onJumpToTriage,
  onOpenMessage,
  noiseCount = 0,
}) {
  if (loading || !briefing) return <BriefingSkeleton />;

  const decisions = itemsByTitle(briefing, SECTION_TITLES.decisions);
  const delegated = itemsByTitle(briefing, SECTION_TITLES.delegated);
  const watch = itemsByTitle(briefing, SECTION_TITLES.watch);
  const quickWins = itemsByTitle(briefing, SECTION_TITLES.quickWins);
  const stamp = formatGeneratedAt(briefing.generated_at);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero card */}
      <section className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-card p-7">
        <div
          aria-hidden
          className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-brand-100 to-transparent rounded-full blur-2xl opacity-70"
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coffee size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              AI Briefing{stamp ? ` · ${stamp}` : ''}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
            Good morning, CEO.
          </h2>
          <p className="text-slate-600 text-[15px] leading-relaxed max-w-3xl">
            {decisions.length} decision{decisions.length === 1 ? '' : 's'} need you today,
            {' '}{delegated.length} already routed to direct reports,
            {' '}{watch.length} to watch, and {quickWins.length} quick win
            {quickWins.length === 1 ? '' : 's'}.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={onJumpToTriage}
              className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors duration-200"
            >
              Open Triage
              <ChevronRight size={16} />
            </button>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl">
              <Sparkles size={14} className="text-brand-500" />
              Filtered {noiseCount} noise item{noiseCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </section>

      {/* Four sections */}
      <Section
        icon={AlertTriangle}
        title={SECTION_TITLES.decisions}
        accent="bg-amber-50 text-amber-700"
        count={decisions.length}
      >
        {decisions.map((item, i) => (
          <Row key={`d-${i}`} item={item} onOpen={onOpenMessage} />
        ))}
      </Section>

      <Section
        icon={UserCheck}
        title={SECTION_TITLES.delegated}
        accent="bg-sky-50 text-sky-700"
        count={delegated.length}
      >
        {delegated.map((item, i) => (
          <Row key={`g-${i}`} item={item} onOpen={onOpenMessage} />
        ))}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          icon={Eye}
          title={SECTION_TITLES.watch}
          accent="bg-slate-100 text-slate-700"
          count={watch.length}
        >
          {watch.map((item, i) => (
            <Row key={`w-${i}`} item={item} onOpen={onOpenMessage} />
          ))}
        </Section>

        <Section
          icon={Sparkles}
          title={SECTION_TITLES.quickWins}
          accent="bg-emerald-50 text-emerald-700"
          count={quickWins.length}
        >
          {quickWins.map((item, i) => (
            <Row key={`q-${i}`} item={item} onOpen={onOpenMessage} />
          ))}
        </Section>
      </div>
    </div>
  );
}
