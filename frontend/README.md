# Chief of Staff — AI Briefing (Frontend)

A React + Vite + Tailwind dashboard that gives a CEO a Daily Briefing, a Triage
inbox, and a Flags view powered by Claude Sonnet 4. This pass ships the full UI
shell with mocked AI output; live Claude calls land in the next pass.

## Stack

- Vite + React 18
- Tailwind CSS (Inter font)
- Lucide icons
- Claude Sonnet API (`claude-sonnet-4-20250514`) — wrapper in `src/lib/claude.js`

## Setup

```powershell
cd frontend
npm install
copy .env.example .env       # then paste your VITE_ANTHROPIC_API_KEY
npm run dev
```

App boots at <http://localhost:5173>.

## Structure

```
src/
  App.jsx                 main shell + routing between the 3 tabs
  main.jsx                React mount point
  index.css               Tailwind layers + skeleton shimmer + focus rings
  components/
    Sidebar.jsx           dark rail, 3 tabs, mobile drawer
    StatBar.jsx           Total / Decide / Delegate / Flagged
    Briefing.jsx          hero + 4 sections (Decisions, Delegated, Watch, Quick Wins)
    Triage.jsx            filter pills (All/Decide/Delegate/Ignore) + card grid
    Flags.jsx             flagged-only list with severity badges
    MessageCard.jsx       reusable card (channel icon, urgency meter, flag rail)
    MessageFlyout.jsx     right-side drawer: body, reasoning, editable draft
    SkeletonLoader.jsx    shimmer placeholders while Claude responds
  lib/
    messages.js           20 messages + mock triage + mock briefing
    claude.js             real Claude API wrapper (used next pass)
```

## What's mocked vs live

- `App.jsx` reads `mockTriage` and `mockBriefing` from `lib/messages.js` after a
  short artificial delay so skeletons get exercised.
- `lib/claude.js` already has the production-shaped `triageMessages()` and
  `generateBriefing()` calls. To go live: swap the `useEffect` in `App.jsx` to
  call them, keep the loading state, and surface errors in a toast.

## Design tokens

| Token | Value | Use |
|---|---|---|
| `--brand` | `#6366f1` (indigo-500) | primary accent, active tab, focus ring |
| sidebar bg | `slate-900` | nav rail |
| app bg | `slate-50` | canvas |
| card | white + `border-slate-200` + `shadow-card` | data containers |
| flag | `red-500/600` | security + production incidents |
| Decide / Delegate / Ignore | amber / sky / slate | category pills |

Typography is Inter, loaded via `<link>` in `index.html` with a system fallback
stack defined in `tailwind.config.js`.

## Accessibility

- Focus rings on all interactive elements (`:focus-visible` rule in `index.css`).
- `aria-current`, `role="tablist"`/`role="tab"`, `aria-modal` on the flyout.
- `prefers-reduced-motion` short-circuits animations.
- ESC closes the flyout. Backdrop click closes it.
- Responsive down to 375px (sidebar collapses to a slide-in drawer).
