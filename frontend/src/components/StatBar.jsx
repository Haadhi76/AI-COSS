import { Inbox, AlertTriangle, UserCheck, Flag } from 'lucide-react';

function Stat({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-600 bg-slate-100',
    indigo: 'text-brand-600 bg-brand-50',
    amber: 'text-amber-700 bg-amber-50',
    sky: 'text-sky-700 bg-sky-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-card min-w-0">
      <span className={`p-1.5 rounded-lg ${tones[tone]}`}>
        <Icon size={14} />
      </span>
      <span className="text-[11px] uppercase tracking-wide font-bold text-slate-500 whitespace-nowrap">
        {label}
      </span>
      <span className="text-base font-bold text-slate-900 tabular-nums ml-auto">
        {value}
      </span>
    </div>
  );
}

export default function StatBar({ counts, title }) {
  return (
    <header className="bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate pl-10 md:pl-0">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Wednesday, 18 March 2026 · 13:02 GMT
          </p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <Stat icon={Inbox} label="Total" value={counts.total} tone="slate" />
          <Stat icon={AlertTriangle} label="Decide" value={counts.decide} tone="amber" />
          <Stat icon={UserCheck} label="Delegate" value={counts.delegate} tone="sky" />
          <Stat icon={Flag} label="Flagged" value={counts.flagged} tone="red" />
        </div>
      </div>
    </header>
  );
}
