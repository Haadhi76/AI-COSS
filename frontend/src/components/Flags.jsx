import { ShieldAlert, ArrowUpRight, Mail, MessageSquare, Phone } from 'lucide-react';
import { GridSkeleton } from './SkeletonLoader.jsx';

const channelIcons = {
  email: Mail,
  slack: MessageSquare,
  whatsapp: Phone,
};

const severityTone = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-amber-500 text-white',
};

export default function Flags({ items, loading, onSelect }) {
  if (loading) return <GridSkeleton rows={2} />;

  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center">
          <ShieldAlert className="text-emerald-600" size={20} />
        </div>
        <p className="font-semibold text-slate-800">No active flags</p>
        <p className="text-sm text-slate-500 mt-1">
          Claude found no security risks or production incidents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
        <ShieldAlert className="text-red-600 mt-0.5 shrink-0" size={20} />
        <div>
          <p className="font-semibold text-red-900 text-sm">
            {items.length} item{items.length === 1 ? '' : 's'} flagged for immediate review
          </p>
          <p className="text-red-700/80 text-xs mt-1">
            Critical = action within the hour. High = action today. Open each card for context
            and a proposed response.
          </p>
        </div>
      </div>

      <div className="space-y-3 pb-8">
        {items.map(m => {
          const Icon = channelIcons[m.channel] ?? Mail;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className="group w-full cursor-pointer text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:border-red-200 hover:shadow-md transition-all duration-200 flex items-start gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      severityTone[m.flag_severity] ?? severityTone.Critical
                    }`}
                  >
                    {m.flag_severity ?? 'Critical'}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Icon size={11} />
                    {m.channel}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {m.from.split('<')[0].trim()}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 text-sm leading-snug">
                  {m.reasoning}
                </p>
                {m.subject && (
                  <p className="text-xs text-slate-500 mt-1.5 truncate">{m.subject}</p>
                )}
              </div>
              <ArrowUpRight
                className="text-slate-300 group-hover:text-red-500 transition-colors shrink-0"
                size={18}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
