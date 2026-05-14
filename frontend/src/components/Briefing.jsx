import {
  Coffee,
  AlertTriangle,
  UserCheck,
  Eye,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Inbox,
  ShieldAlert,
} from 'lucide-react';
import { BriefingSkeleton } from './SkeletonLoader.jsx';
import DayWrapped from './DayWrapped.jsx';
import { channelTone, categoryPill, departmentColor } from '../lib/theme.js';
import { channelIcons } from './MessageCard.jsx';

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

function reroutedSections(briefing, messages) {
  const sections = briefing.sections ?? [];
  const byId = new Map((messages ?? []).map(m => [m.id, m]));
  const buckets = new Map(sections.map(s => [s.title, []]));

  for (const section of sections) {
    for (const item of section.items ?? []) {
      const meta = byId.get(item.message_id);
      if (!meta) { buckets.get(section.title).push(item); continue; }
      if (meta.category === 'Ignore') continue;
      if (meta.overridden) {
        if (meta.category === 'Decide') buckets.get('Top Decisions Needed')?.push(item);
        else if (meta.category === 'Delegate') buckets.get('Delegated Actions')?.push(item);
        else buckets.get(section.title)?.push(item);
      } else {
        buckets.get(section.title).push(item);
      }
    }
  }
  return sections.map(s => ({ ...s, items: buckets.get(s.title) ?? [] }));
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

function Section({ icon: Icon, title, accent, items, messages, completedSet, onOpen, onToggle, checkable }) {
  const pending = checkable ? items.filter(i => !completedSet.has(i.message_id)) : items;
  const completed = checkable ? items.filter(i => completedSet.has(i.message_id)) : [];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </span>
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
        <span className="ml-auto text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {pending.map(item => (
          <Row
            key={`p-${item.message_id}`}
            item={item}
            messageMeta={messages?.find(m => m.id === item.message_id)}
            onOpen={onOpen}
            onToggle={onToggle}
            checked={false}
            checkable={checkable}
          />
        ))}
        {completed.length > 0 && (
          <li className="px-6 py-2 bg-slate-50 border-t border-dashed border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Done · {completed.length}
          </li>
        )}
        {completed.map(item => (
          <Row
            key={`d-${item.message_id}`}
            item={item}
            messageMeta={messages?.find(m => m.id === item.message_id)}
            onOpen={onOpen}
            onToggle={onToggle}
            checked={true}
            checkable={checkable}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({ item, messageMeta, onOpen, onToggle, checked, checkable }) {
  const ChannelIcon = messageMeta ? (channelIcons[messageMeta.channel] ?? Inbox) : null;
  const tone = messageMeta ? (channelTone[messageMeta.channel] ?? 'bg-slate-100 text-slate-500') : '';

  return (
    <li
      className={`group flex items-start gap-3 px-6 py-3.5 transition-colors duration-200 ${
        checked ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50'
      }`}
    >
      {checkable && (
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item.message_id)}
          aria-label={`Mark "${item.summary}" complete`}
          className="mt-1 cursor-pointer"
        />
      )}
      <button
        onClick={() => onOpen(item.message_id)}
        className="flex-1 min-w-0 cursor-pointer text-left"
      >
        <p
          className={`font-semibold text-sm ${
            checked ? 'text-slate-500 line-through' : 'text-slate-900'
          }`}
        >
          {item.summary}
        </p>
        <p
          className={`text-xs mt-1 leading-relaxed ${
            checked ? 'text-slate-400 line-through' : 'text-slate-500'
          }`}
        >
          {item.action}
        </p>
        
        {messageMeta && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`p-1 rounded-md ${tone}`}>
              {messageMeta.flagged ? <ShieldAlert size={12} /> : <ChannelIcon size={12} />}
            </span>
            <span
              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wide ${
                categoryPill[messageMeta.category] ?? categoryPill.Ignore
              }`}
            >
              {messageMeta.category}
            </span>
            {messageMeta.department && (
              <span
                className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                style={departmentColor(messageMeta.department)}
              >
                {messageMeta.department}
              </span>
            )}
            {messageMeta.flagged && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600 ml-auto">
                <AlertTriangle size={12} />
                {messageMeta.flag_severity ?? 'Critical'}
              </span>
            )}
          </div>
        )}
      </button>
      <ArrowUpRight
        size={16}
        className="text-slate-300 group-hover:text-brand-500 mt-0.5 shrink-0 transition-colors"
      />
    </li>
  );
}

export default function Briefing({
  briefing,
  messages,
  loading,
  onJumpToTriage,
  onOpenMessage,
  noiseCount = 0,
  completedIds = [],
  daySummary = null,
  onToggle = () => {},
}) {
  if (loading || !briefing) return <BriefingSkeleton />;

  const effective = { ...briefing, sections: reroutedSections(briefing, messages) };
  const decisions = itemsByTitle(effective, SECTION_TITLES.decisions);
  const delegated = itemsByTitle(effective, SECTION_TITLES.delegated);
  const watch = itemsByTitle(effective, SECTION_TITLES.watch);
  const quickWins = itemsByTitle(effective, SECTION_TITLES.quickWins);
  const stamp = formatGeneratedAt(briefing.generated_at);
  const completedSet = new Set(completedIds);

  return (
    <div className="space-y-6 animate-fade-in">
      {daySummary && <DayWrapped bullets={daySummary.bullets} />}

      {!daySummary && (
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
      )}

      <Section
        icon={AlertTriangle}
        title={SECTION_TITLES.decisions}
        accent="bg-amber-50 text-amber-700"
        items={decisions}
        messages={messages}
        completedSet={completedSet}
        onOpen={onOpenMessage}
        onToggle={onToggle}
        checkable
      />

      <Section
        icon={UserCheck}
        title={SECTION_TITLES.delegated}
        accent="bg-sky-50 text-sky-700"
        items={delegated}
        messages={messages}
        completedSet={completedSet}
        onOpen={onOpenMessage}
        onToggle={onToggle}
        checkable
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          icon={Eye}
          title={SECTION_TITLES.watch}
          accent="bg-slate-100 text-slate-700"
          items={watch}
          messages={messages}
          completedSet={completedSet}
          onOpen={onOpenMessage}
          onToggle={onToggle}
          checkable={false}
        />

        <Section
          icon={Sparkles}
          title={SECTION_TITLES.quickWins}
          accent="bg-emerald-50 text-emerald-700"
          items={quickWins}
          messages={messages}
          completedSet={completedSet}
          onOpen={onOpenMessage}
          onToggle={onToggle}
          checkable
        />
      </div>
    </div>
  );
}
