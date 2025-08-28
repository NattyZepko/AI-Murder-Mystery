const API_BASE = (import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.API_BASE)) || (window && (window as any).API_BASE) || '';

export async function generateScenario(language?: string) {
  const res = await fetch(`${API_BASE}/api/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  });
  // Read response text and try to parse JSON; preserve raw body for diagnostics
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch (_) { data = text; }
  if (!res.ok) {
    const err: any = new Error((data && data.error) ? data.error : (typeof data === 'string' ? data : 'Failed to generate scenario'));
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data.scenario;
}

export async function chat(system: string | undefined, messages: Array<{ role: 'user' | 'assistant', content: string }>, options?: any) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, options }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Chat failed');
  return data;
}

export async function extractClues(payload: { reply: string, lastUserText: string, suspect: any, scenario: any, language?: string }) {
  const res = await fetch(`${API_BASE}/api/extract-clues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Clue extraction failed');
  return data.clues as Array<{ type: string, note: string }>
}

// Send a non-blocking client-side failure log to the server for persistence.
export async function logClientFailure(payload: any) {
  try {
    // fire-and-forget; server will write to samples/
    await fetch(`${API_BASE}/api/log-client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) { /* ignore logging errors */ }
}
