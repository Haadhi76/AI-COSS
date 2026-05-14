import { Sparkles } from 'lucide-react';

export default function DayWrapped({ bullets }) {
  if (!bullets || bullets.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 rounded-2xl border border-emerald-200 shadow-card p-7 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Sparkles size={18} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
          Day Wrapped
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-4">
        Everything for today is done.
      </h2>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
