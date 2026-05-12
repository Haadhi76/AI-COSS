You are building an AI Chief of Staff web application for a CEO.
The project folder is INNATEAI. A reference UI exists in dashboard.jsx — use it
as structural inspiration but upgrade it significantly.

TECH STACK
- React (Vite), Tailwind CSS, Lucide icons
- Claude Sonnet API (claude-sonnet-4-20250514) for all AI logic
- No backend — API calls go directly from the frontend

DATA
- Messages are defined in a messages.json file (or inline in a const)
- Use the 20 messages already in dashboard.jsx as the dataset

WHAT TO BUILD

1. App shell
   - Dark sidebar with three tabs: Daily Briefing / Triage / Flags
   - Stat bar at top: total messages, # Decide, # Delegate, # Flagged
   - Responsive layout, min 375px wide

2. Triage tab
   - On load, call the Claude API with all 20 messages
   - Claude must return a JSON array. Each item contains:
       id, category (Ignore | Delegate | Decide), reasoning, draft, urgency (1-5), flagged (bool)
   - Render cards sorted by urgency descending
   - Filter buttons: All / Decide / Delegate / Ignore
   - Click a card → right-side flyout showing:
       full message body, AI reasoning, editable draft response, Approve & Send button

3. Flags tab
   - Show only messages where flagged = true
   - Each flag has a severity badge (Critical / High) and a one-line summary from Claude

4. Daily Briefing tab
   - Call Claude to produce a structured daily briefing the CEO reads in < 2 min
   - Sections: Top Decisions Needed · Delegated Actions · Watch Items · Quick Wins
   - Render as a clean readable card, not a wall of text

CLAUDE API CALL PATTERN (use this exact model string)
  POST https://api.anthropic.com/v1/messages
  model: "claude-sonnet-4-20250514"
  max_tokens: 2000
  The API key is handled by the environment — do NOT hardcode it.
  Always instruct Claude to return only valid JSON (no markdown fences).

DESIGN SYSTEM
  Style: Executive Dashboard (clean, data-dense, trustworthy)
  Primary accent: Indigo (#6366f1)
  Background: Slate-50 / Slate-900 for sidebar
  Cards: white with subtle border and shadow
  Flags: red accent
  Loading states: skeleton loaders while Claude responds
  Typography: Inter or system-ui, clear hierarchy

DELIVERABLES
  src/
    App.jsx          — main shell + routing
    components/
      Triage.jsx
      Flags.jsx
      Briefing.jsx
      MessageFlyout.jsx
    lib/
      claude.js      — all Claude API calls
      messages.js    — raw message data
  README.md          — setup + run instructions

Start by generating the design system with the ui-ux-pro-max skill, then build
component by component. Show me the file structure first before writing any code.