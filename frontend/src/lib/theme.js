export const channelTone = {
  email: 'bg-indigo-50 text-brand-600',
  slack: 'bg-violet-50 text-violet-600',
  whatsapp: 'bg-emerald-50 text-emerald-600',
};

export const categoryPill = {
  Decide: 'bg-amber-50 text-amber-700 border-amber-100',
  Delegate: 'bg-sky-50 text-sky-700 border-sky-100',
  Ignore: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function departmentColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return { background: `hsl(${hue}, 70%, 95%)`, color: `hsl(${hue}, 50%, 30%)` };
}

export function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
