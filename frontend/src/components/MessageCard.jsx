import { Mail, MessageSquare, Phone, Inbox, ShieldAlert, AlertTriangle } from 'lucide-react';

const channelIcons = {
  email: Mail,
  slack: MessageSquare,
  whatsapp: Phone,
};

const channelTone = {
  email: 'bg-indigo-50 text-brand-600',
  slack: 'bg-violet-50 text-violet-600',
  whatsapp: 'bg-emerald-50 text-emerald-600',
};

const categoryPill = {
  Decide: 'bg-amber-50 text-amber-700 border-amber-100',
  Delegate: 'bg-sky-50 text-sky-700 border-sky-100',
  Ignore: 'bg-slate-100 text-slate-500 border-slate-200',
};

function UrgencyMeter({ value }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Urgency ${value} of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= value
              ? value >= 4
                ? 'bg-red-500'
                : value >= 3
                ? 'bg-amber-500'
                : 'bg-slate-400'
              : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function departmentColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return { background: `hsl(${hue}, 70%, 95%)`, color: `hsl(${hue}, 50%, 30%)` };
}

export default function MessageCard({ message, selected, onClick }) {
  const Icon = channelIcons[message.channel] ?? Inbox;
  const tone = channelTone[message.channel] ?? 'bg-slate-100 text-slate-500';

  return (
    <button
      onClick={() => onClick(message)}
      className={`group relative w-full text-left cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
        selected
          ? 'bg-brand-50/40 border-brand-300 ring-2 ring-brand-500/20 shadow-card'
          : 'bg-white border-slate-200 shadow-card hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {message.flagged && (
        <span
          aria-hidden
          className="absolute top-0 left-0 h-full w-1 bg-red-500 rounded-l-2xl"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`p-2 rounded-lg ${tone}`}>
            {message.flagged ? <ShieldAlert size={16} /> : <Icon size={16} />}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-[13.5px] truncate">
              {message.from.split('<')[0].trim()}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {message.subject ?? message.channel_name ?? message.channel}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wide ${
            categoryPill[message.category] ?? categoryPill.Ignore
          }`}
        >
          {message.category}
        </span>
        {message.department && (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide"
            style={departmentColor(message.department)}
          >
            {message.department}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
        {message.reasoning ?? message.body}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <UrgencyMeter value={message.urgency ?? 1} />
          <span className="text-[11px] text-slate-400 font-medium tabular-nums">
            {formatTime(message.timestamp)}
          </span>
        </div>
        {message.flagged && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
            <AlertTriangle size={12} />
            {message.flag_severity ?? 'Critical'}
          </span>
        )}
      </div>
    </button>
  );
}
