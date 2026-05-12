import { LayoutDashboard, Inbox, Flag, Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';

const TABS = [
  { id: 'briefing', label: 'Daily Briefing', icon: LayoutDashboard },
  { id: 'triage', label: 'Triage', icon: Inbox },
  { id: 'flags', label: 'Flags', icon: Flag },
];

export default function Sidebar({ active, onChange, counts }) {
  const [open, setOpen] = useState(false);

  const NavItems = (
    <nav className="space-y-1.5 flex-1" aria-label="Primary">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        const badge =
          id === 'triage' ? counts.decide : id === 'flags' ? counts.flagged : null;
        return (
          <button
            key={id}
            onClick={() => {
              onChange(id);
              setOpen(false);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`group w-full cursor-pointer flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors duration-200 ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="font-medium text-sm">{label}</span>
            {badge != null && badge > 0 && (
              <span
                className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  id === 'flags'
                    ? 'bg-red-500 text-white'
                    : isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 cursor-pointer bg-slate-900 text-white p-2.5 rounded-xl shadow-md"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static z-50 md:z-auto top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col p-5 transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-[15px] text-white tracking-tight">
                Chief of Staff
              </p>
              <p className="text-[11px] text-slate-400 font-medium">AI Briefing</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden cursor-pointer p-1.5 text-slate-400 hover:text-white"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {NavItems}

        <div className="mt-auto pt-5 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold">
              CE
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">CEO Office</p>
              <p className="text-[11px] text-slate-500">March 18, 2026</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
