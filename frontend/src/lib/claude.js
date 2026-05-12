// Claude API wrapper. Used in the next pass once the UI is in place.
// Pattern (per CLAUDE.md):
//   POST https://api.anthropic.com/v1/messages
//   model: "claude-sonnet-4-20250514"
//   max_tokens: 2000
//   Returns JSON only — no markdown fences.
//
// The API key comes from VITE_ANTHROPIC_API_KEY at build time. Calling from
// the browser is fine for the demo but exposes the key in the bundle — for
// production this should go through a thin proxy.

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

const headers = () => ({
  'content-type': 'application/json',
  'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
});

async function callClaude(prompt, { maxTokens = 2000 } = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  // Strip any accidental code fences before parsing.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

export async function triageMessages(messages) {
  const prompt = `You are an AI Chief of Staff for a CEO. Triage the following ${messages.length} messages.

For each message, decide:
- category: one of "Decide" (CEO must personally choose), "Delegate" (a direct report can handle), or "Ignore" (noise, FYI, superseded, or personal).
- urgency: integer 1-5 (5 = critical, requires action within the hour).
- flagged: true if this is a security risk OR a production incident OR a deal-breaking decision; false otherwise.
- severity: "Critical" or "High" — only set when flagged is true.
- summary: ONE sentence (<= 140 chars) describing the message and the ask.
- reasoning: 1-3 sentences explaining the categorization. Be specific. Reference other messages by id when they supersede or relate.
- draft: a short proposed response the CEO can edit and send. For "Ignore" category use "No response needed." or similar. For personal messages, say "Personal — handle directly."

Return ONLY a JSON array — no markdown, no preamble. Schema per item:
{ "id": number, "category": "Decide"|"Delegate"|"Ignore", "urgency": 1-5, "flagged": boolean, "severity": "Critical"|"High"|null, "summary": string, "reasoning": string, "draft": string }

Messages:
${JSON.stringify(messages, null, 2)}`;

  return callClaude(prompt, { maxTokens: 4000 });
}

export async function generateBriefing(messages, triage) {
  const prompt = `You are an AI Chief of Staff. Produce a concise daily briefing the CEO can read in under 2 minutes.

Return ONLY a JSON object — no markdown, no preamble. Schema:
{
  "greeting": string,
  "headline": string (2-3 sentences, the big picture for the day),
  "decisions": [{ "id": number, "title": string, "detail": string, "severity": "Critical"|"High"|"Medium" }],
  "delegated": [{ "id": number, "title": string, "detail": string }],
  "watch":     [{ "id": number, "title": string, "detail": string }],
  "quickWins": [{ "id": number, "title": string, "detail": string }]
}

Constraints:
- Decisions: only items the CEO must personally decide TODAY. Max 4.
- Delegated: things already routed to a direct report. Max 4.
- Watch items: things to keep an eye on but no action today. Max 3.
- Quick wins: <2-min acknowledgements / appreciations / closures. Max 3.
- Every title <= 80 chars. Every detail <= 160 chars. No filler.

Source messages:
${JSON.stringify(messages, null, 2)}

Triage output:
${JSON.stringify(triage, null, 2)}`;

  return callClaude(prompt, { maxTokens: 2000 });
}
