import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  AlertTriangle, 
  UserCheck, 
  Coffee, 
  ChevronRight, 
  Mail, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  ArrowUpRight,
  X
} from 'lucide-react';

// Raw data provided in the JSON
const rawMessages = [
  { id: 1, channel: "email", from: "Sarah Chen <sarah.chen@meridianventures.com>", subject: "Follow-up: Series B timeline", timestamp: "2026-03-18T08:12:00Z", body: "Hi,\n\nGreat catching up last week. As discussed, we'd like to move forward with the due diligence process. Can we lock in a meeting this Thursday at 2pm to go through the financials? I'll have our analysts on the call as well.\n\nWould also appreciate the updated revenue projections by Wednesday if possible.\n\nBest,\nSarah" },
  { id: 2, channel: "slack", from: "tom.bradley", channel_name: "#engineering", timestamp: "2026-03-18T08:34:00Z", body: "heads up - the API migration is about 60% done. should be wrapped by friday. no blockers right now but flagging that we might need an extra day if the auth refactor takes longer than expected." },
  { id: 3, channel: "whatsapp", from: "James (COO)", timestamp: "2026-03-18T08:45:00Z", body: "Morning. Quick one - can we push the board deck review to next week? I'm still waiting on the Q1 numbers from finance and don't want to present half-baked figures." },
  { id: 4, channel: "email", from: "Security Team", subject: "URGENT: Unusual login detected", timestamp: "2026-03-18T09:01:00Z", body: "We detected an unusual sign-in to your account from Lagos, Nigeria. Verify immediately: https://seczure-verify.com/auth/reset?token=8f3k2j" },
  { id: 5, channel: "slack", from: "lisa.park", channel_name: "#product", timestamp: "2026-03-18T09:15:00Z", body: "FYI the Horizon project demo went well with the client yesterday. They're happy with the direction and want to see the next iteration in two weeks." },
  { id: 6, channel: "email", from: "David Morrison", subject: "Horizon project - concerns", timestamp: "2026-03-18T09:22:00Z", body: "Hey, Wanted to flag something about Horizon. I think we're overselling the timeline. 10-12 weeks min, not 6." },
  { id: 7, channel: "whatsapp", from: "Mum", timestamp: "2026-03-18T09:30:00Z", body: "Hi love, just checking if you're still coming for dinner on Sunday? Dad's making his lasagne." },
  { id: 8, channel: "email", from: "Rachel Kim", subject: "Candidate shortlist: VP Eng", timestamp: "2026-03-18T09:45:00Z", body: "Shortlist of 4 candidates for VP Engineering is ready. Recommend A and C. Set up calls?" },
  { id: 9, channel: "slack", from: "tom.bradley", timestamp: "2026-03-18T10:05:00Z", body: "update on API migration - dependency issue found. Pushing timeline to next Wed." },
  { id: 10, channel: "whatsapp", from: "James (COO)", timestamp: "2026-03-18T10:20:00Z", body: "Actually keep original Thursday slot for board deck. Also confirm investor meeting 2pm Thursday?" },
  { id: 11, channel: "email", from: "Tech Digest", subject: "This week in AI: 5 trends", timestamp: "2026-03-18T10:30:00Z", body: "Newsletter content regarding AI regulation and agentic workflows..." },
  { id: 12, channel: "slack", from: "priya.sharma", timestamp: "2026-03-18T10:45:00Z", body: "closed Northwind deal!! 120k ARR, 2 year contract." },
  { id: 13, channel: "whatsapp", from: "Alex (Head of People)", timestamp: "2026-03-18T11:00:00Z", body: "Team grumbling about hybrid policy. Need chat. Also need sign-off on benefits package by Friday." },
  { id: 14, channel: "email", from: "Mark Zhang", subject: "Q2 Marketing Plan", timestamp: "2026-03-18T11:15:00Z", body: "Marketing plan finalized. No decisions needed from you right now." },
  { id: 15, channel: "email", from: "Laura Singh", subject: "Leadership sync", timestamp: "2026-03-18T11:30:00Z", body: "Leadership sync booked Thursday 2pm. Q1 review, hiring, Horizon status." },
  { id: 16, channel: "slack", from: "tom.bradley", timestamp: "2026-03-18T11:45:00Z", body: "CRITICAL: Payment service failing for 3% of users. Roll back (2 weeks loss) or hotfix (risky)? Need answer now." },
  { id: 17, channel: "email", from: "David Morrison", subject: "Horizon project - handled", timestamp: "2026-03-18T12:00:00Z", body: "Spoke to Lisa. Aligned on 10-week timeline. No action needed from you." },
  { id: 18, channel: "whatsapp", from: "Sarah Chen", timestamp: "2026-03-18T12:15:00Z", body: "Can we move Thursday to 10am? Also need revenue projections before the call." },
  { id: 19, channel: "slack", from: "priya.sharma", timestamp: "2026-03-18T12:30:00Z", body: "Northwind issue: They want 1 year instead of 2. Drops ARR to 60k. Accept or push back?" },
  { id: 20, channel: "email", from: "Laura Singh", subject: "Room change", timestamp: "2026-03-18T12:45:00Z", body: "Leadership sync moved to 3pm in small room. Invite updated." }
];

// Pre-processed AI Logic for Triage
const processMessages = (msgs) => {
  return msgs.map(m => {
    let category = "Ignore";
    let flag = false;
    let reasoning = "";
    let draft = "";
    let urgency = 0;

    if (m.id === 4 || m.id === 16) {
      category = "Decide";
      flag = true;
      urgency = 5;
      reasoning = m.id === 4 ? "Critical security threat: Unauthorized login attempt." : "Production outage: Payment failure impacting 3% of users.";
      draft = m.id === 4 ? "Immediate action: Reset all admin credentials and enable force-logout." : "Go with the hotfix. Risk is lower than 2 weeks of payment failures.";
    } else if ([1, 3, 10, 18, 19].includes(m.id)) {
      category = "Decide";
      urgency = 4;
      reasoning = "Strategic financial or scheduling decision required.";
      draft = m.id === 19 ? "Push back for 18 months minimum. 60k is too low for the onboarding effort." : "Confirm 10am Thursday. Send the projections draft to James first.";
    } else if ([8, 13].includes(m.id)) {
      category = "Delegate";
      urgency = 3;
      reasoning = "Operational or HR matters that can be managed by department heads.";
      draft = m.id === 8 ? "James, please handle the initial screen for Candidate A and C. Report back Friday." : "Alex, gather the specific hybrid concerns and present a proposal next Monday.";
    } else {
      category = "Ignore";
      urgency = 1;
      reasoning = "Routine update, personal message, or already resolved.";
      draft = "No response needed.";
    }

    return { ...m, category, flag, reasoning, draft, urgency };
  });
};

const processedMessages = processMessages(rawMessages);

export default function App() {
  const [activeTab, setActiveTab] = useState('briefing');
  const [triageFilter, setTriageFilter] = useState('All');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const stats = useMemo(() => ({
    total: processedMessages.length,
    decide: processedMessages.filter(m => m.category === 'Decide').length,
    delegate: processedMessages.filter(m => m.category === 'Delegate').length,
    flags: processedMessages.filter(m => m.flag).length,
  }), []);

  const filteredMessages = processedMessages.filter(m => 
    triageFilter === 'All' ? true : m.category === triageFilter
  ).sort((a, b) => b.urgency - a.urgency);

  const renderIcon = (channel) => {
    switch(channel) {
      case 'email': return <Mail size={16} />;
      case 'slack': return <MessageSquare size={16} />;
      case 'whatsapp': return <Phone size={16} />;
      default: return <Inbox size={16} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 hidden md:flex">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <UserCheck size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Chief of Staff</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('briefing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'briefing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Daily Briefing</span>
          </button>
          <button 
            onClick={() => setActiveTab('triage')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Inbox size={20} />
            <span className="font-medium">Triage Center</span>
            {stats.decide > 0 && <span className="ml-auto bg-red-500 text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold">{stats.decide}</span>}
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
            <div>
              <p className="text-sm font-semibold">CEO Office</p>
              <p className="text-xs text-slate-500">March 18, 2026</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Summary */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'briefing' ? "Morning Briefing" : "Communications Triage"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={12} /> {stats.flags} Critical Flags
              </span>
              <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                <Clock size={12} /> 20 Total Messages
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'briefing' ? (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
              {/* Executive Summary Card */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Coffee className="text-orange-500" /> Good Morning, CEO.
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  You have <span className="font-bold text-indigo-600">20 new messages</span>. 
                  I've filtered out 11 items of noise. There are <span className="font-bold text-red-600">7 decisions</span> requiring your attention, including 2 high-risk alerts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Critical Risks</p>
                    <p className="text-sm text-slate-700">Payment failure (3% users) and a security breach attempt detected.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Fundraising</p>
                    <p className="text-sm text-slate-700">Sarah from Meridian is pushing for a Thursday lock-in and revenue numbers.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Operations</p>
                    <p className="text-sm text-slate-700">Horizon project timeline is aligned. Northwind deal is at risk of term change.</p>
                  </div>
                </div>
              </section>

              {/* Priority Actions */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">Priority Actions</h3>
                  <button onClick={() => setActiveTab('triage')} className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:underline">
                    View Triage <ChevronRight size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  {processedMessages.filter(m => m.category === 'Decide' && m.urgency >= 4).map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => { setActiveTab('triage'); setSelectedMessage(m); }}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${m.flag ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                          {m.flag ? <ShieldAlert size={20} /> : renderIcon(m.channel)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{m.from.split('<')[0]}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{m.subject || m.body}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${m.flag ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {m.flag ? 'Urgent' : 'Decision'}
                        </span>
                        <ArrowUpRight size={20} className="text-slate-300 group-hover:text-indigo-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto">
              {/* Triage Header */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex p-1 bg-slate-200 rounded-xl">
                  {['All', 'Decide', 'Delegate', 'Ignore'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setTriageFilter(tab)}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${triageFilter === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <p className="text-slate-500 text-sm">Showing {filteredMessages.length} items</p>
              </div>

              {/* Message Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-10">
                {filteredMessages.map(m => (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMessage(m)}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden ${selectedMessage?.id === m.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                    {m.flag && <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 -rotate-45 translate-x-12 -translate-y-12"></div>}
                    
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${m.category === 'Decide' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {renderIcon(m.channel)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{m.from.split('<')[0]}</h4>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: #{m.id}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                        m.category === 'Decide' ? 'bg-orange-100 text-orange-700' : 
                        m.category === 'Delegate' ? 'bg-blue-100 text-blue-700' : 
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {m.category}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 italic leading-relaxed">
                      "{m.body.substring(0, 100)}..."
                    </p>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.flag && <AlertTriangle size={14} className="text-red-500" />}
                        <span className="text-xs font-semibold text-slate-400">{m.timestamp.split('T')[1].substring(0, 5)} AM</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 rounded-full hover:bg-slate-200 text-slate-400"><X size={16} /></button>
                        <button className="p-2 rounded-full hover:bg-indigo-100 text-indigo-500"><CheckCircle2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Action Overlay (Flyout) */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <header className="p-6 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedMessage.flag ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {selectedMessage.flag ? <ShieldAlert size={28} /> : renderIcon(selectedMessage.channel)}
                </div>
                <div>
                  <h3 className="font-bold text-xl">{selectedMessage.from.split('<')[0]}</h3>
                  <p className="text-xs text-slate-400">{selectedMessage.from}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Message Content */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Incoming Communication</p>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <LayoutDashboard size={18} className="text-indigo-600" />
                  <p className="font-bold text-indigo-900">AI Triage Reasoning</p>
                </div>
                <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                  {selectedMessage.reasoning}
                </p>
              </div>

              {/* Action Draft */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proposed Action / Handoff</p>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">Editable</span>
                </div>
                <div className="bg-white border-2 border-indigo-500/20 p-6 rounded-2xl shadow-sm">
                  <p className="text-slate-800 italic leading-relaxed">
                    {selectedMessage.draft}
                  </p>
                </div>
              </div>
            </div>

            <footer className="p-6 border-t bg-slate-50 flex gap-4 shrink-0">
              <button className="flex-1 py-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                Edit Draft
              </button>
              <button className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                Approve & Send <ArrowRight size={18} />
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}