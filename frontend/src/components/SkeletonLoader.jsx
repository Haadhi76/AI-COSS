export function CardSkeleton() {
  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-2 w-20" />
        </div>
        <div className="skeleton h-5 w-16 rounded-md" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-2.5 w-full" />
        <div className="skeleton h-2.5 w-11/12" />
        <div className="skeleton h-2.5 w-8/12" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="skeleton h-2 w-16" />
        <div className="skeleton h-6 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function BriefingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-7 bg-white rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="skeleton h-6 w-1/2" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-9/12" />
        </div>
      </div>
      {[1, 2].map(i => (
        <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-card space-y-3">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ rows = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
