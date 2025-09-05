const { chatWithAI } = require('./ai');
const fs = require('fs');
const path = require('path');
const { loadAiTemplate: loadAiTemplateFromI18n } = require('./i18n');
const { fetchJsonWithRetries: fetchJsonWithRetriesUtil } = require('./utils/jsonRepair');
function loadAiTemplate(language = 'English') { return loadAiTemplateFromI18n(language); }

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
    // Use centralized JSON repair/parse helper for robust parsing and automated repair
    const userContent = `User asked: ${lastUserText || ''}\nSuspect replied: ${reply}`;
    let parsed = null;
    try {
      parsed = await fetchJsonWithRetriesUtil({
        system,
        user: userContent,
        options: { temperature: 0.1, top_p: 0.2, max_tokens: 220 },
        schemaExample: `{ "clues": [ { "type": "weapon", "note": "Kitchen Knife found near suspect X", "strength": "medium" } ] }`,
        language,
        retries: 1,
        partName: 'clues',
        callAI: async ({ system: sys, messages: msgs, options: opts }) => await chatWithAI({ system: sys, messages: msgs, options: opts }),
        recentRepliesArray: null
      });
    } catch (err) {
      return [];
    }
    const clues = Array.isArray(parsed?.clues) ? parsed.clues : [];
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
