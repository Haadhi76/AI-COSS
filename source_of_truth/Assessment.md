Developer Assessment
AI Chief of Staff

OVERVIEW
A CEO receives 20+ communications every morning across email, Slack, and WhatsApp. They need an AI
system that processes everything, filters the noise, delegates what can be delegated, and surfaces only the
decisions that require their attention.
Your task is to build this system.
DATA
messages.json — 20 incoming communications from a single morning.
DELIVERABLES
A working system with a web UI that produces:
Triage
Every message classified as:
• Ignore — no CEO involvement needed
• Delegate — assign to the right person with a drafted handoff
• Decide — the CEO must act personally
For each: which category and why, and a drafted response.
Flags
Anything the CEO should know about.
Daily Briefing
One page the CEO reads in under 2 minutes.
TECHNICAL REQUIREMENTS
• LLM API (Claude, OpenAI, or equivalent)
• Web UI
• Code on GitHub with a README