const { chatWithAI } = require('./ai');
const fs = require('fs');
const path = require('path');

function loadAiTemplate(language = 'English') {
  try {
    const name = String(language || 'English');
    const file = path.resolve(__dirname, 'locales', 'ai', `${name}.json`);
    if (fs.existsSync(file)) {
      const txt = fs.readFileSync(file, 'utf8');
      return JSON.parse(txt);
    }
  } catch (_) {}
  return null;
}

// Ask AI to summarize only meaningful clues; returns [{ type, note }]
async function extractMeaningfulClues({ reply, lastUserText, suspect, scenario, language }) {
  try {
    const weaponsList = (scenario.weapons || []).map(w => w.name).join(', ');
    const suspectsList = (scenario.suspects || []).map(s => s.name).join(', ');
    const tpl = loadAiTemplate(language) || {};
    const langInstr = tpl.clues_system_prefix || (language && String(language).toLowerCase() !== 'english'
      ? `Return extracted clues and their notes in ${language}.`
      : `Return extracted clues and their notes in English.`);
    const system = `You are an expert detective's note-taker. ${langInstr} Extract ONLY meaningful, case-advancing clues (facts) from the suspect's latest reply.
Return STRICT JSON:
{ "clues": Array<{ type: "time"|"alibi"|"witness"|"weapon"|"contradiction"|"motive"|"location"|"admission"|"knowledge", note: string, strength: "low"|"medium"|"high" }> }
Rules:
- Include clues only if they substantially help solve the case (medium/high). Ignore vague, generic, or non-actionable info.
- Prefer bigger hints: summarized contradictions, concrete time ranges, who can verify an alibi, proximity to weapons, physical evidence handling, and motive specifics tied to actions.
- When extracting a weapon clue, include which weapon (by name) and any linkage (found on/near whom) if hinted; match even partial mentions (e.g., "knife" implies "Kitchen Knife (K-15)" if context fits).
- Use the suspect's reply and the last user question for context. If no meaningful clues, return { "clues": [] }.
Context:
- Weapons: ${weaponsList}
- Suspects: ${suspectsList}
- Current suspect: ${suspect.name}`;
  const content = `User asked: ${lastUserText || ''}\nSuspect replied: ${reply}`;
    const res = await chatWithAI({
      system,
      messages: [{ role: 'user', content }],
      options: { temperature: 0.1, top_p: 0.2, max_tokens: 220 }
    });
    let payload = res.message?.content || '';
    let json;
    try {
      json = JSON.parse(payload);
    } catch (_) {
      const first = payload.indexOf('{');
      const last = payload.lastIndexOf('}');
      if (first >= 0 && last > first) {
        const maybe = payload.slice(first, last + 1);
        json = JSON.parse(maybe);
      } else {
        return [];
      }
    }
    const clues = Array.isArray(json?.clues) ? json.clues : [];
    return clues
      .filter(c => c && typeof c.note === 'string' && /^(medium|high)$/i.test(c.strength || ''))
      .map(c => {
        // Ensure the note is a compact summary of a larger hint.
        let note = c.note.trim();
        if (note.length < 40) {
          note = `${note} (meaningful summary)`;
        }
        return { type: String(c.type || 'knowledge').toLowerCase(), note };
      });
  } catch (_) {
    return [];
  }
}

module.exports = { extractMeaningfulClues };
