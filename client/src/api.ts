export async function generateScenario() {
  const res = await fetch('/api/scenario', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to generate scenario');
  return data.scenario;
}

export async function chat(system: string | undefined, messages: Array<{ role: 'user'|'assistant', content: string }>, options?: any) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, options }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Chat failed');
  return data;
}

export async function extractClues(payload: { reply: string, lastUserText: string, suspect: any, scenario: any }) {
  const res = await fetch('/api/extract-clues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Clue extraction failed');
  return data.clues as Array<{ type: string, note: string }>
}
