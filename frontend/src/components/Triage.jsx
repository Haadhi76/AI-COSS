import { useMemo, useState } from 'react';
import MessageCard from './MessageCard.jsx';
import { GridSkeleton } from './SkeletonLoader.jsx';

const FILTERS = ['All', 'Decide', 'Delegate', 'Ignore'];

export default function Triage({ items, loading, onSelect, selectedId }) {
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    const list = filter === 'All' ? items : items.filter(m => m.category === filter);
    return [...list].sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0));
  }, [items, filter]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="skeleton h-10 w-72 rounded-xl" />
          <div className="skeleton h-4 w-24" />
        </div>
        <GridSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Triage filter"
          className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-card"
        >
          {FILTERS.map(tab => {
            const isActive = filter === tab;
            const count =
              tab === 'All' ? items.length : items.filter(m => m.category === tab).length;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(tab)}
                className={`cursor-pointer px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Sorted by urgency · {filtered.length} of {items.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm">
            Nothing in this bucket. Try another filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
          {filtered.map(m => (
            <MessageCard
              key={m.id}
              message={m}
              selected={selectedId === m.id}
              onClick={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
