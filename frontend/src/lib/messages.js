// Raw inbox feed for the CEO. 20 messages across email / slack / whatsapp.
// Kept inline (per CLAUDE.md "messages.json or inline const") so the bundle
// is self-contained and Vite doesn't need a JSON import loader rule.
export const messages = [
  {
    id: 1,
    channel: 'email',
    from: 'Sarah Chen <sarah.chen@meridianventures.com>',
    to: 'ceo@company.com',
    subject: 'Follow-up: Series B timeline',
    timestamp: '2026-03-18T08:12:00Z',
    body: "Hi,\n\nGreat catching up last week. As discussed, we'd like to move forward with the due diligence process. Can we lock in a meeting this Thursday at 2pm to go through the financials? I'll have our analysts on the call as well.\n\nWould also appreciate the updated revenue projections by Wednesday if possible.\n\nBest,\nSarah",
  },
  {
    id: 2,
    channel: 'slack',
    from: 'tom.bradley',
    channel_name: '#engineering',
    timestamp: '2026-03-18T08:34:00Z',
    body: 'heads up - the API migration is about 60% done. should be wrapped by friday. no blockers right now but flagging that we might need an extra day if the auth refactor takes longer than expected.',
  },
  {
    id: 3,
    channel: 'whatsapp',
    from: 'James (COO)',
    timestamp: '2026-03-18T08:45:00Z',
    body: "Morning. Quick one - can we push the board deck review to next week? I'm still waiting on the Q1 numbers from finance and don't want to present half-baked figures.",
  },
  {
    id: 4,
    channel: 'email',
    from: 'noreply@seczure-verify.com',
    to: 'ceo@company.com',
    subject: 'URGENT: Unusual login detected on your account',
    timestamp: '2026-03-18T09:01:00Z',
    body: "We detected an unusual sign-in to your account from an unrecognized device in Lagos, Nigeria. If this wasn't you, please verify your identity immediately by clicking the link below to secure your account.\n\nVerify Now: https://seczure-verify.com/auth/reset?token=8f3k2j\n\nIf you do not verify within 24 hours, your account will be permanently suspended.\n\nSecurity Team",
  },
  {
    id: 5,
    channel: 'slack',
    from: 'lisa.park',
    channel_name: '#product',
    timestamp: '2026-03-18T09:15:00Z',
    body: "FYI the Horizon project demo went well with the client yesterday. They're happy with the direction and want to see the next iteration in two weeks. No changes requested.",
  },
  {
    id: 6,
    channel: 'email',
    from: 'David Morrison <david.m@company.com>',
    to: 'ceo@company.com',
    subject: 'Horizon project - concerns',
    timestamp: '2026-03-18T09:22:00Z',
    body: "Hey,\n\nWanted to flag something about Horizon. I was on the client call yesterday and I think we're overselling the timeline. The client thinks we'll have the full platform ready in 6 weeks but realistically we're looking at 10-12 weeks minimum given the current resourcing. Lisa presented it as on track but I don't think that's accurate.\n\nThink we need to have an honest conversation internally before the next client touchpoint.\n\nDavid",
  },
  {
    id: 7,
    channel: 'whatsapp',
    from: 'Mum',
    timestamp: '2026-03-18T09:30:00Z',
    body: "Hi love, just checking if you're still coming for dinner on Sunday? Dad's making his lasagne. Let me know so I can get the shopping in. Also your sister says hi and wants to know if you can bring that wine from last time xx",
  },
  {
    id: 8,
    channel: 'email',
    from: 'Rachel Kim <rachel.kim@techstaffing.io>',
    to: 'ceo@company.com',
    subject: 'Candidate shortlist for VP Engineering role',
    timestamp: '2026-03-18T09:45:00Z',
    body: "Hi,\n\nAs discussed, please find attached the shortlist of 4 candidates for the VP Engineering position. All have been pre-screened and are available for interviews starting next week.\n\nI'd recommend prioritising Candidate A (ex-Stripe) and Candidate C (ex-Datadog) based on your requirements. Happy to set up 30-min intro calls whenever works.\n\nLet me know how you'd like to proceed.\n\nBest,\nRachel",
  },
  {
    id: 9,
    channel: 'slack',
    from: 'tom.bradley',
    channel_name: '#engineering',
    timestamp: '2026-03-18T10:05:00Z',
    body: 'update on the API migration - just found a dependency issue with the payment service. going to need to pause and figure this out. might push the timeline back to next wednesday. will keep you posted.',
  },
  {
    id: 10,
    channel: 'whatsapp',
    from: 'James (COO)',
    timestamp: '2026-03-18T10:20:00Z',
    body: "Actually ignore my earlier message about pushing the board deck. Just spoke to finance and they can get me preliminary numbers by tomorrow. Let's keep the original Thursday slot. Also can you confirm we have the investor meeting at 2pm Thursday? Sarah from Meridian is expecting us.",
  },
  {
    id: 11,
    channel: 'email',
    from: 'newsletter@techdigest.com',
    to: 'ceo@company.com',
    subject: "This week in AI: 5 trends you can't ignore",
    timestamp: '2026-03-18T10:30:00Z',
    body: "Good morning,\n\nThis week's roundup covers the latest in AI regulation, new funding rounds, and why every CEO should be paying attention to agentic workflows.\n\n1. EU AI Act enforcement begins...\n2. Anthropic raises another $2B...\n3. Why agents are replacing dashboards...\n4. The hidden cost of AI technical debt...\n5. Interview: How one startup cut costs 40% with AI ops...\n\nRead the full newsletter at techdigest.com/weekly\n\nUnsubscribe",
  },
  {
    id: 12,
    channel: 'slack',
    from: 'priya.sharma',
    channel_name: '#sales',
    timestamp: '2026-03-18T10:45:00Z',
    body: 'closed Northwind deal!! 120k ARR, 2 year contract. they want onboarding to start april 1st. @tom.bradley can eng support the integration timeline?',
  },
  {
    id: 13,
    channel: 'whatsapp',
    from: 'Alex (Head of People)',
    timestamp: '2026-03-18T11:00:00Z',
    body: "hey so um yeah I wanted to talk to you about something, it's not super urgent or anything but basically I had a chat with a couple of the engineering team yesterday and there's some grumbling about the new hybrid policy, like people feel it was kind of sprung on them without much consultation you know, and I think maybe we should address it before it becomes a bigger thing, oh and also completely separately I need your sign-off on the new benefits package by end of day Friday because the provider needs confirmation before the 21st or we lose the rate, anyway let me know when you have 5 mins to chat about the hybrid thing",
  },
  {
    id: 14,
    channel: 'email',
    from: 'Mark Zhang <mark.z@company.com>',
    to: 'ceo@company.com',
    subject: 'Quick update - marketing Q2 plan',
    timestamp: '2026-03-18T11:15:00Z',
    body: "Hi,\n\nJust wanted to let you know the Q2 marketing plan is finalised and the team is executing. No decisions needed from your end right now - just keeping you in the loop.\n\nHighlights: launching the new brand campaign in April, increasing paid spend by 20%, and testing two new channels (podcast sponsorships and LinkedIn thought leadership).\n\nWill share the full deck at next month's all-hands.\n\nMark",
  },
  {
    id: 15,
    channel: 'email',
    from: 'Laura Singh <laura.s@company.com>',
    to: 'ceo@company.com',
    subject: 'RE: Thursday meeting',
    timestamp: '2026-03-18T11:30:00Z',
    body: 'Hi,\n\nConfirming the leadership team sync is booked for Thursday at 2pm in the main boardroom. Agenda: Q1 review, hiring update, and Horizon project status.\n\nPlease let me know if you need anything added to the agenda.\n\nThanks,\nLaura',
  },
  {
    id: 16,
    channel: 'slack',
    from: 'tom.bradley',
    channel_name: '#engineering',
    timestamp: '2026-03-18T11:45:00Z',
    body: "update on the payment service dependency - it's worse than I thought. the issue affects live transactions, not just the migration. we're seeing intermittent failures on checkout for about 3% of users right now. need a decision on whether to roll back the partial migration or push through a hotfix. rolling back is safer but sets us back 2 weeks. hotfix is faster but risky. need an answer in the next hour.",
  },
  {
    id: 17,
    channel: 'email',
    from: 'David Morrison <david.m@company.com>',
    to: 'ceo@company.com',
    subject: 'RE: Horizon project - update',
    timestamp: '2026-03-18T12:00:00Z',
    body: "Hey,\n\nFollowing up on my earlier email. I spoke to Lisa and we've aligned. She agrees the 6-week timeline was optimistic. We're going to present a revised 10-week timeline to the client at the next touchpoint and frame it as a phased delivery (MVP at 6 weeks, full platform at 10).\n\nSo this is handled - no action needed from you on this anymore.\n\nDavid",
  },
  {
    id: 18,
    channel: 'whatsapp',
    from: 'Sarah Chen (Meridian Ventures)',
    timestamp: '2026-03-18T12:15:00Z',
    body: "Hi - just checking in on Thursday. I realise 2pm might clash with your internal meetings. Happy to do 10am instead if that's easier? Let me know. Also just to flag, our partners meeting is the following Monday so ideally we'd have the revenue projections before Thursday's call.",
  },
  {
    id: 19,
    channel: 'slack',
    from: 'priya.sharma',
    channel_name: '#sales',
    timestamp: '2026-03-18T12:30:00Z',
    body: "bit of an issue with the Northwind deal I announced earlier. their legal team just came back and said they can't sign the 2-year term. they want 1 year with an option to renew. that drops the deal to 60k ARR. do we accept or push back? they're expecting an answer by end of day.",
  },
  {
    id: 20,
    channel: 'email',
    from: 'Laura Singh <laura.s@company.com>',
    to: 'ceo@company.com',
    subject: 'RE: Thursday meeting - room change',
    timestamp: '2026-03-18T12:45:00Z',
    body: "Hi,\n\nSmall update - the main boardroom is booked for a client visit on Thursday afternoon. I've moved the leadership sync to 3pm in the small meeting room instead. Updated calendar invite sent.\n\nThanks,\nLaura",
  },
];

// Mocked Claude triage output. Mirrors the schema the real Claude call will
// return (id, category, reasoning, draft, urgency, flagged, summary, severity).
// Replace with the live response from src/lib/claude.js in the next pass.
export const mockTriage = [
  {
    id: 16,
    category: 'Decide',
    urgency: 5,
    flagged: true,
    severity: 'Critical',
    summary: 'Live checkout failing for 3% of users — needs hotfix vs rollback call within the hour.',
    reasoning:
      'Production incident impacting revenue. Tom needs a directional call (hotfix vs rollback) inside an hour. Rollback costs ~2 weeks of migration progress; hotfix is faster but carries deployment risk. This is the single highest-priority item in the inbox.',
    draft:
      "Tom — go with the hotfix, but stage it: deploy to 10% of traffic first, monitor for 30 min, then roll forward. If error rate doesn't drop below 0.5% in that window, roll back the migration. I want a status update every 30 min until checkout is green. Loop in Priya — Northwind onboarding kicks off April 1 and we can't have checkout flaky.",
  },
  {
    id: 4,
    category: 'Decide',
    urgency: 5,
    flagged: true,
    severity: 'Critical',
    summary: 'Phishing attempt impersonating account security — do not click; report and forward to IT.',
    reasoning:
      "Classic phishing pattern: spoofed sender domain ('seczure-verify.com'), fake urgency, suspicious link, threat of account suspension. Not a legitimate security alert. Should be reported, not actioned.",
    draft:
      'Do not click. Forward this email to security@company.com and delete. Confirm with IT that MFA is enforced on the CEO account and rotate the password as a precaution.',
  },
  {
    id: 19,
    category: 'Decide',
    urgency: 4,
    flagged: false,
    summary: 'Northwind wants 1yr instead of 2yr — ARR drops from 120k to 60k. Need EOD answer.',
    reasoning:
      'Material commercial decision. Halving the contract term meaningfully changes the deal economics and forecast. Pushing back risks losing the logo entirely; accepting sets a precedent for future renewals.',
    draft:
      'Counter: 18-month term with a 10% discount on year one if they pre-pay. That gets us past the renewal-risk window without halving ARR. If they refuse, accept the 1-year but ring-fence onboarding hours and require a quarterly business review clause.',
  },
  {
    id: 1,
    category: 'Decide',
    urgency: 4,
    flagged: false,
    summary: "Meridian's Sarah wants Thursday lock-in + revenue projections by Wednesday.",
    reasoning:
      'Series B due diligence is on the critical path. Sarah has now sent two messages (#1 email, #18 WhatsApp) about Thursday timing and projections, and her partners meeting is the following Monday — missing this window costs us a cycle.',
    draft:
      "Sarah — let's do 10am Thursday, that works better with the internal meetings. I'll have the updated revenue projections to you by EOD Wednesday. Can you send the analyst list ahead of time so we know who's on the call?",
  },
  {
    id: 18,
    category: 'Decide',
    urgency: 4,
    flagged: false,
    summary: 'Sarah Chen offering 10am Thursday alternative — needs confirmation. Same thread as #1.',
    reasoning:
      "WhatsApp follow-up to message #1. She's flagging her Monday partners meeting as the hard deadline for the projections. Treat as the same decision as #1.",
    draft: "Confirmed — 10am Thursday. Projections by EOD Wednesday. I'll send a calendar invite shortly.",
  },
  {
    id: 10,
    category: 'Decide',
    urgency: 3,
    flagged: false,
    summary: 'James reversed earlier ask — board deck stays Thursday. Needs confirmation on 2pm investor slot.',
    reasoning:
      'James (#10) supersedes his own earlier message (#3). He needs the 2pm Thursday slot confirmed for the Meridian call — but note that conflicts with Sarah moving to 10am (#18) and the leadership sync moving to 3pm (#20). Resolve the calendar.',
    draft:
      "James — Meridian is now 10am Thursday (Sarah's request), and Laura moved the leadership sync to 3pm. Your 2pm slot is clear for the board deck prep. Send the preliminary Q1 numbers as soon as finance hands them over.",
  },
  {
    id: 13,
    category: 'Delegate',
    urgency: 4,
    flagged: false,
    summary: 'Alex: hybrid-policy grumbling + benefits sign-off needed by Friday.',
    reasoning:
      'Two unrelated items bundled. (a) Hybrid pushback is a people-management issue — Alex should run discovery and come back with a proposal. (b) Benefits sign-off has a hard external deadline (provider needs confirmation before 21 March or we lose the rate).',
    draft:
      "Alex — two things. (1) On hybrid: please do 1:1s with 4-5 engineers this week, summarise the specific friction points, and bring me a 1-page proposal by Monday. (2) Send me the benefits package summary today — I'll review and sign off before EOD Thursday so you have the buffer for the provider.",
  },
  {
    id: 8,
    category: 'Delegate',
    urgency: 3,
    flagged: false,
    summary: 'VP Eng shortlist ready — Rachel recommends Candidates A (Stripe) and C (Datadog).',
    reasoning:
      'Standard hiring funnel step. The screening can be delegated to James (COO) for the initial culture/operator screen before CEO time is invested.',
    draft:
      'Rachel — please set up 30-min intros with Candidate A and Candidate C for next week. Cc James — James, please take the first round and shortlist who I should meet.',
  },
  {
    id: 12,
    category: 'Delegate',
    urgency: 3,
    flagged: false,
    summary: 'Priya closed Northwind — but see #19, terms are now in flux.',
    reasoning:
      'Originally a win to acknowledge and delegate integration planning. Now coupled to #19 (term renegotiation) — hold celebration until commercial terms settle.',
    draft:
      "Priya — great work on the close. Hold off on the @tom.bradley integration ask until we resolve the term issue (see your 12:30 update). Once locked, ping Tom with the onboarding date and I'll back you on resourcing.",
  },
  {
    id: 3,
    category: 'Ignore',
    urgency: 2,
    flagged: false,
    summary: 'Superseded by #10 — James no longer wants to push the board deck.',
    reasoning: 'James reversed this request in message #10. No action needed.',
    draft: 'No response needed — superseded.',
  },
  {
    id: 17,
    category: 'Ignore',
    urgency: 2,
    flagged: false,
    summary: 'Horizon timeline now aligned with David and Lisa — phased 6/10-week delivery.',
    reasoning:
      "David's earlier concern (#6) is resolved internally. He explicitly says no action needed. Worth a one-line ack.",
    draft: "Good — thanks for handling it. Keep me posted on the client's reaction to the phased framing.",
  },
  {
    id: 6,
    category: 'Ignore',
    urgency: 2,
    flagged: false,
    summary: 'Resolved by #17 — Horizon timeline issue handled by David + Lisa.',
    reasoning: "Superseded by message #17. Don't act on the original concern.",
    draft: 'No response needed — handled in follow-up #17.',
  },
  {
    id: 20,
    category: 'Ignore',
    urgency: 2,
    flagged: false,
    summary: 'Leadership sync moved to 3pm Thursday — calendar already updated.',
    reasoning: 'Pure logistics. Calendar invite updated automatically.',
    draft: 'No response needed.',
  },
  {
    id: 15,
    category: 'Ignore',
    urgency: 1,
    flagged: false,
    summary: 'Leadership sync confirmed — superseded by #20 (3pm move).',
    reasoning: 'Confirmation of meeting now moved per #20.',
    draft: 'No response needed.',
  },
  {
    id: 9,
    category: 'Ignore',
    urgency: 2,
    flagged: false,
    summary: 'API migration dependency update — superseded by the critical incident in #16.',
    reasoning: 'Same thread as #16, which is the load-bearing message.',
    draft: 'No response needed — see #16.',
  },
  {
    id: 2,
    category: 'Ignore',
    urgency: 1,
    flagged: false,
    summary: 'API migration on track at 60% — no decision needed.',
    reasoning: 'FYI update from engineering. Status info only.',
    draft: 'No response needed.',
  },
  {
    id: 5,
    category: 'Ignore',
    urgency: 1,
    flagged: false,
    summary: 'Horizon demo went well — but see #6/#17 for the real timeline picture.',
    reasoning: 'Optimistic FYI. The fuller picture is in David and Lisa\'s follow-up thread.',
    draft: 'No response needed.',
  },
  {
    id: 14,
    category: 'Ignore',
    urgency: 1,
    flagged: false,
    summary: 'Mark explicitly says no decision needed on Q2 marketing.',
    reasoning: 'Sender explicitly flagged this as FYI. Respect that signal.',
    draft: 'No response needed.',
  },
  {
    id: 7,
    category: 'Ignore',
    urgency: 1,
    flagged: false,
    summary: 'Personal — dinner Sunday + wine request from sister.',
    reasoning: 'Personal message. Surface but do not draft a work response.',
    draft: 'Personal — handle directly.',
  },
  {
    id: 11,
    category: 'Ignore',
    urgency: 1,
    flagged: false,
    summary: 'Tech Digest newsletter — no action.',
    reasoning: 'Marketing newsletter. Filterable noise.',
    draft: 'No response needed.',
  },
];

// Briefing snapshot — same schema as the live Claude briefing endpoint.
export const mockBriefing = {
  greeting: 'Good morning, CEO.',
  headline:
    "20 messages, 11 filtered as noise. Two critical items need you in the next hour: a checkout outage and a phishing attempt. Meridian's Series B is the strategic anchor for the day.",
  decisions: [
    {
      id: 16,
      title: 'Payment service incident — call hotfix vs rollback',
      detail: '3% of checkouts failing. Tom needs a decision within the hour.',
      severity: 'Critical',
    },
    {
      id: 19,
      title: 'Northwind term change — accept 1yr at 60k or push back?',
      detail: 'Halves ARR. EOD response expected.',
      severity: 'High',
    },
    {
      id: 1,
      title: 'Meridian Series B — Thursday lock-in + revenue projections',
      detail: 'Sarah offered 10am alternative (#18). Partners meeting is the following Monday.',
      severity: 'High',
    },
  ],
  delegated: [
    {
      id: 13,
      title: 'Hybrid policy pushback → Alex',
      detail: 'Discovery 1:1s with 4-5 engineers, proposal back Monday.',
    },
    {
      id: 13,
      title: 'Benefits package sign-off',
      detail: 'Hard deadline before 21 March to keep the rate. Review by Thursday EOD.',
    },
    {
      id: 8,
      title: 'VP Eng intro screens → James',
      detail: 'Candidates A and C first; James does culture pass before CEO time.',
    },
  ],
  watch: [
    {
      id: 17,
      title: 'Horizon client reframing to phased 6/10-week delivery',
      detail: "David & Lisa aligned internally. Watch for client's reaction at next touchpoint.",
    },
    {
      id: 10,
      title: 'Thursday calendar collisions',
      detail: 'Meridian moving to 10am, leadership sync to 3pm. Board deck prep clear at 2pm.',
    },
  ],
  quickWins: [
    {
      id: 12,
      title: 'Acknowledge Priya — Northwind close',
      detail: 'Recognise the win even while the term issue resolves.',
    },
    {
      id: 17,
      title: 'One-line thanks to David',
      detail: 'He handled the Horizon timeline concern without escalation.',
    },
  ],
};
