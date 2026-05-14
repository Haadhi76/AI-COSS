// Thin client to the FastAPI backend. The Anthropic API key never reaches
// the browser — it lives in the backend's .env file.

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000';

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Backend ${path} returned ${res.status}: ${errText}`);
  }
  return res.json();
}

async function patchJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Backend ${path} returned ${res.status}: ${errText}`);
  }
  return res.json();
}

export async function triageMessages(messages) {
  const data = await postJson('/api/triage', { messages });
  return data.triage;
}

export async function generateBriefing(messages, triage) {
  return postJson('/api/briefing', { messages, triage });
}

export async function getTodayBriefing(messages, { force = false } = {}) {
  const path = force ? '/api/briefing/today?force=true' : '/api/briefing/today';
  return postJson(path, { messages });
}

export async function setCompletion(messageId, completed) {
  return patchJson('/api/briefing/today/completion', {
    message_id: messageId,
    completed,
  });
}

export async function setOverride(messageId, category) {
  return patchJson('/api/briefing/today/override', {
    message_id: messageId,
    category,
  });
}
