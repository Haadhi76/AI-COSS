import { useEffect, useState } from 'react';
import {
  X,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
  Sparkles,
  Send,
  RotateCcw,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

const channelIcons = {
  email: Mail,
  slack: MessageSquare,
  whatsapp: Phone,
};

const channelLabels = {
  email: 'Email',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
};

const categoryTone = {
  Decide: 'bg-amber-50 text-amber-700 border-amber-100',
  Delegate: 'bg-sky-50 text-sky-700 border-sky-100',
  Ignore: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function MessageFlyout({ message, onClose }) {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setDraft(message?.draft ?? '');
    setSent(false);
  }, [message?.id]);

  // ESC closes the flyout
  useEffect(() => {
    if (!message) return;
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [message, onClose]);

  if (!message) return null;

  const Icon = channelIcons[message.channel] ?? Inbox;
  const fromName = message.from.split('<')[0].trim();
  const fromAddress = message.from.match(/<([^>]+)>/)?.[1] ?? message.channel_name ?? '';

  const handleApprove = () => {
    setSent(true);
    setTimeout(onClose, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flyout-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <aside className="relative w-full sm:max-w-xl h-full bg-white shadow-flyout flex flex-col animate-slide-in-right">
        {/* Header */}
        <header className="px-6 py-5 border-b border-slate-200 flex items-start gap-3 shrink-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              message.flagged ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
            }`}
          >
            {message.flagged ? <ShieldAlert size={20} /> : <Icon size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="flyout-title" className="font-bold text-slate-900 text-base truncate">
              {fromName}
            </h2>
            <p className="text-xs text-slate-500 truncate">{fromAddress}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                <Icon size={10} />
                {channelLabels[message.channel] ?? message.channel}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                  categoryTone[message.category]
                }`}
              >
                {message.category}
              </span>
              {message.flagged && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1">
                  <AlertTriangle size={10} />
                  {message.severity ?? 'Critical'}
                </span>
              )}
              <span className="text-[10px] text-slate-400 ml-auto">ID #{message.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-6">
          {/* Message body */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              {message.subject ?? 'Message'}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {message.body}
            </div>
          </section>

          {/* AI reasoning */}
          <section className="bg-brand-50/40 border border-brand-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={14} className="text-brand-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-700">
                AI Triage Reasoning
              </p>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">{message.reasoning}</p>
          </section>

          {/* Editable draft */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Proposed Response
              </p>
              <button
                onClick={() => setDraft(message.draft ?? '')}
                className="cursor-pointer text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <RotateCcw size={11} />
                Reset to AI draft
              </button>
            </div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={Math.min(12, Math.max(5, Math.ceil((draft?.length ?? 0) / 60)))}
              className="w-full text-sm leading-relaxed text-slate-800 bg-white border border-slate-300 rounded-2xl p-4 focus:border-brand-500 transition-colors resize-y"
              aria-label="Editable draft response"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Edit freely. Approve & Send routes to the original channel (
              {channelLabels[message.channel] ?? message.channel}).
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="cursor-pointer flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleApprove}
            disabled={sent || !draft.trim()}
            className="cursor-pointer flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {sent ? 'Sent ✓' : (
              <>
                Approve &amp; Send
                <Send size={14} />
              </>
            )}
          </button>
        </footer>
      </aside>
    </div>
  );
}
