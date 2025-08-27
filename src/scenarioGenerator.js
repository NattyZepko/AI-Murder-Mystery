// Scenario generation logic via Ollama
const { chatWithAI } = require('./ai');
const { logScenario, logEvent } = require('./logger');
const { getRecentSettings, sanitizeWeaponName, fisherYates, pickFew } = require('./scenarioGenerator.helpers');

// getRecentSettings moved to helpers

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

async function generateScenario(opts = {}) {
                const { language = 'English' } = opts || {};
                const tpl = loadAiTemplate(language) || {};
                const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
                    ? `Produce all output (names, weapons, descriptions, and JSON fields) in ${language}. Do not include translations or English fallbacks.`
                    : `Produce all output in English.`);
                const system = `You are a scenario generator for a text-only murder mystery game.
${langInstr}
Return STRICT JSON conforming to this TypeScript type, no commentary:
{
    "title": string,
    "setting": string,
    "victim": { name: string, timeOfDeath: string, location?: string },
    "suspects": Array<{
        id: string,
        name: string,
        gender: string,
        age: number,
        mannerisms: string[],
        quirks?: string[],
        catchphrase?: string,
        backstory: string,
        relationshipToVictim: string,
        motive: string,
        alibi: string,
        alibiVerifiedBy: string[],
        knowledge: string[],
        contradictions: string[],
        isGuilty: boolean,
        persona: string
    }>,
    "weapons": Array<{ id: string, name: string, discoveredHints: string[], isMurderWeapon: boolean, foundOnSuspectId?: string | null, foundNearSuspectId?: string | null }>,
    "timeline": Array<{ time: string, summary: string, involvedSuspects: string[] }>,
    "relationships": Array<{ between: [string, string], type: "family"|"lovers"|"exes"|"friends"|"colleagues"|"rivals"|"enemies"|"secret-affair"|"mentor-mentee"|"sibling"|"parent-child", isSecret?: boolean, note?: string }>,
    "witnessedEvents": Array<{ time?: string, description: string, witnesses: string[], involves?: string[] }>,
    "truth": { guiltySuspectId: string, murderWeaponId: string, motiveCore: string, keyContradictions: string[] }
}
Rules:
- Setting: choose a novel, evocative locale that feels fresh and not overused. Set a moody tone. Do NOT use common staples like hotels, cruise ships or corporate offices.
- 5–7 suspects, 4–6 weapons, exactly one guilty suspect and one murder weapon.
- Provide victim.name and victim.timeOfDeath explicitly; keep them plausible and concise.
- Each suspect MUST include gender (e.g., "male", "female") and age (integer 20–75). Names should be varied and fit the setting.
- Personas: Make personalities more extreme and distinct (e.g., angry, bitter; grief-stricken; frantic and funny; icy and arrogant). Avoid stage directions and behavior descriptions; convey emotion through word choice. No asterisks or parenthetical actions.
- Quirks: Some suspects should have quirks (e.g., stutters, rhymes, guilt-ridden, repeats a common phrase like "I'll be damned"). Put brief notes in "quirks" and optionally a short and common "catchphrase" they sometimes say like "I'll be damned".
- Weapons: be creative and setting-specific. Prefer improvised or thematic items. Avoid cliché weapons such as "wrench", "letter opener", or "candlestick". Name each weapon concisely as a noun phrase ONLY—do not include stopwords or prepositions like "and", "or", "with", "of", "a", "an", "the", "in", "on", "at", "to", "for", "by", "from", "into", "over", "under", "above", "below", "near", "through", "off", "up", "down", "out", "about", "as". Use forms like "Kitchen Knife", "Glass Shard", "Tripod", "Statue Base" — avoid forms like "statue with base" or "piece of glass".
- Alibis: Innocent suspects can have verifiable alibis. Use the field "alibiVerifiedBy" with suspect IDs who can confirm. The guilty suspect must have NO verifiable alibi (set alibiVerifiedBy to []).
- Motives: Some suspects should have no motive (set "motive" to an empty string ""), while most others have motives. The guilty suspect must have a clear motive.
- Relationships: Include meaningful ties among suspects (family, lovers, exes, friends, rivals, enemies, mentor-mentee, etc.). At least one SECRET relationship (e.g., secret-affair) whose potential exposure could be a motive. Use the "relationships" list to define pairs.
- Witnessed events: Include 2–5 short entries where named witnesses saw relevant moments (for example: raised voices, someone near a weapon, a hushed argument, someone leaving a restricted area, you can come up with more). Use suspect IDs. These events should be relevant to the previous information, and should form a coherent story.
- Weapon proximity: Each weapon should be found ON a suspect or NEAR a suspect. The TRUE murder weapon MUST be found on/near the guilty suspect.
- Keep the timeline coherent and embed contradictions that implicate the guilty. Fit the events into the story.
- Output must be valid JSON only.
`;

    const recentSettings = getRecentSettings(8);
    const avoidLine = recentSettings.length
        ? `Avoid repeating or closely resembling these recent settings/themes: ${recentSettings.map(s => '"' + s + '"').join(', ')}.`
        : '';
    const user = `Generate a fresh, unique scenario in a surprising, evocative location. Prioritize novelty and diversity across runs.
${langInstr}
${avoidLine}
Use creative, setting-appropriate weapons. Avoid clichés like wrenches, letter openers, and candlesticks.
Name each weapon concisely with NO stopwords (no "and", "or", "with", "of", "a", "an", "the", etc.) and no prepositional phrases.
Ensure each suspect has a gender and age. Make personalities bold and distinct, some angry/sad/funny/rude/scared. Add quirks and a simple catchphrase for a few. Avoid stage directions and behavior descriptions; show emotion through word choice.`;

    const res = await chatWithAI({
        system,
        messages: [
            { role: 'user', content: user }
        ],
        // Encourage short outputs and faster sampling
    options: { temperature: 0.92, top_p: 0.95, max_tokens: 1800, response_mime_type: 'application/json' }
    });

    let scenario;
    let content = '';
    try {
        // ollama.chat returns { message: { role, content }, ... }
                content = res.message?.content ?? '';
                content = String(content).trim();
                // Strip code fences if present
                if (/^```/.test(content)) {
                        const firstNl = content.indexOf('\n');
                        if (firstNl !== -1) content = content.slice(firstNl + 1);
                        if (content.endsWith('```')) content = content.slice(0, -3);
                        content = content.trim();
                }
        try {
            scenario = JSON.parse(content);
        } catch (_inner) {
            // Fallback: attempt to extract a JSON object from the text
            const first = content.indexOf('{');
            const last = content.lastIndexOf('}');
            if (first >= 0 && last > first) {
                const maybe = content.slice(first, last + 1);
                                try {
                                    scenario = JSON.parse(maybe);
                                } catch (_inner2) {
                                    // Attempt a light sanitation: quote unquoted keys for a few common cases
                                    let fixed = maybe
                                        .replace(/(title)\s*:/g, '"title":')
                                        .replace(/(setting)\s*:/g, '"setting":')
                                        .replace(/(victim)\s*:/g, '"victim":')
                                        .replace(/(suspects)\s*:/g, '"suspects":')
                                        .replace(/(weapons)\s*:/g, '"weapons":')
                                        .replace(/(timeline)\s*:/g, '"timeline":')
                                        .replace(/(truth)\s*:/g, '"truth":');
                                    scenario = JSON.parse(fixed);
                                }
            } else {
                // Re-throw original parsing error so we can include the raw content below
                throw _inner;
            }
        }
    } catch (e) {
        // Attempt a single automated repair: ask the model to convert its previous reply into STRICT JSON only.
        try {
            const repairSystem = `You are a helpful JSON fixer. The user needs ONLY valid JSON that matches the previously given scenario schema. Do NOT add any explanation, headings, markdown, or code fences. Output ONLY the JSON object. Keys must remain in English; translate all textual VALUES into ${language}.`;
            const repairUser = `Here is the assistant's previous reply that failed to parse as JSON:\n---\n${String(content).slice(0,4000)}\n---\nPlease output only the corrected JSON object now.`;
            const repairRes = await chatWithAI({ system: repairSystem, messages: [{ role: 'user', content: repairUser }], options: { temperature: 0.0, top_p: 1.0, max_tokens: 2000, response_mime_type: 'application/json' } });
            let repaired = String(repairRes.message?.content || '').trim();
            if (/^```/.test(repaired)) {
                const firstNl = repaired.indexOf('\n');
                if (firstNl !== -1) repaired = repaired.slice(firstNl + 1);
                if (repaired.endsWith('```')) repaired = repaired.slice(0, -3);
                repaired = repaired.trim();
            }
            try {
                scenario = JSON.parse(repaired);
            } catch (_r2) {
                // If repair failed, include both original raw and repaired content in the error
                const raw = (typeof content !== 'undefined') ? String(content).slice(0, 2000) : '<no content captured>';
                const repTrunc = String(repaired || '<no repaired content>').slice(0, 2000);
                throw new Error('AI did not return valid JSON scenario after repair. Original parse error: ' + (e && e.message ? e.message : String(e)) + "\nRaw AI content (truncated):\n" + raw + "\nRepaired attempt (truncated):\n" + repTrunc);
            }
        } catch (repairErr) {
            // Surface repair error if it occurred
            throw new Error('AI did not return valid JSON scenario. ' + (e && e.message ? e.message : String(e)) + '\nRepair attempt failed: ' + (repairErr && repairErr.message ? repairErr.message : String(repairErr)));
        }
    }

    // Minimal validation
    if (!scenario.suspects || !Array.isArray(scenario.suspects) || scenario.suspects.length < 2) {
        throw new Error('Scenario malformed: missing suspects');
    }
    if (!scenario.weapons || !Array.isArray(scenario.weapons) || scenario.weapons.length < 2) {
        throw new Error('Scenario malformed: missing weapons');
    }
    if (!scenario.truth || typeof scenario.truth !== 'object') {
        throw new Error('Scenario malformed: missing truth');
    }
    // Ensure suspects have gender/age; if missing, fill with sane defaults. Also normalize new fields.
    try {
        const genders = ['male', 'female'];
        scenario.suspects.forEach(s => {
            if (!s || typeof s !== 'object') return;
            if (!s.gender || typeof s.gender !== 'string') {
                s.gender = genders[Math.floor(Math.random() * genders.length)];
            }
            if (typeof s.age !== 'number' || !Number.isFinite(s.age)) {
                s.age = Math.floor(22 + Math.random() * 43); // 22–65
            }
            if (!Array.isArray(s.alibiVerifiedBy)) {
                s.alibiVerifiedBy = [];
            }
            if (typeof s.motive !== 'string') {
                s.motive = '';
            }
            if (!Array.isArray(s.mannerisms)) s.mannerisms = [];
            if (!Array.isArray(s.quirks)) s.quirks = [];
            if (typeof s.catchphrase !== 'string') s.catchphrase = '';
        });
    } catch (_) {}

    // Default/normalize relationships & witnessed events arrays
    if (!Array.isArray(scenario.relationships)) scenario.relationships = [];
    if (!Array.isArray(scenario.witnessedEvents)) scenario.witnessedEvents = [];

    // Post-conditions to reinforce constraints
    try {
        let guiltyId = scenario.truth.guiltySuspectId;
        const suspects = Array.isArray(scenario.suspects) ? scenario.suspects : [];
        const suspectsById = Object.fromEntries((suspects || []).map(s => [s.id, s]));
        // If truth.guiltySuspectId missing/invalid, pick a suspect (prefer one flagged guilty)
        if (!guiltyId || !suspectsById[guiltyId]) {
            const firstFlagged = suspects.find(s => s && s.isGuilty);
            const fallback = firstFlagged || (suspects.length ? suspects[Math.floor(Math.random() * suspects.length)] : null);
            if (!fallback || !fallback.id) throw new Error('Scenario malformed: could not resolve a guilty suspect');
            guiltyId = fallback.id;
            scenario.truth.guiltySuspectId = guiltyId;
        }
        const guilty = suspectsById[guiltyId];
        // Align isGuilty flags to truth: exactly one guilty
        (suspects || []).forEach(s => { try { s.isGuilty = Boolean(s && s.id === guiltyId); } catch (_) {} });
        // Guilty: no verifiable alibi and has a motive
        if (guilty) {
            guilty.alibiVerifiedBy = [];
            if (!guilty.motive || !guilty.motive.trim()) {
                guilty.motive = scenario.truth.motiveCore || 'Personal grievance';
            }
        }
        // Ensure at least one innocent has no motive and/or a verifiable alibi
        const innocents = (scenario.suspects || []).filter(s => s.id !== guiltyId);
        if (innocents.length) {
            const hasVerifiable = innocents.some(s => Array.isArray(s.alibiVerifiedBy) && s.alibiVerifiedBy.length);
            if (!hasVerifiable && innocents.length >= 2) {
                // Make two innocents verify each other
                const a = innocents[0];
                const b = innocents[1];
                a.alibiVerifiedBy = [b.id];
                b.alibiVerifiedBy = [a.id];
            }
            const hasNoMotive = innocents.some(s => !s.motive || !s.motive.trim());
            if (!hasNoMotive) {
                innocents[0].motive = '';
            }
        }
        // Relationships: ensure at least 2 edges and at least one secret relationship
        try {
            const ids = (scenario.suspects || []).map(s => s.id);
            const ensureEdge = (a, b, type, isSecret = false, note = '') => {
                if (!a || !b || a === b) return;
                const exists = (scenario.relationships || []).some(r => Array.isArray(r?.between) && ((r.between[0] === a && r.between[1] === b) || (r.between[0] === b && r.between[1] === a)));
                if (!exists) scenario.relationships.push({ between: [a, b], type, isSecret, note });
            };
            if ((scenario.relationships || []).length < 2 && ids.length >= 3) {
                ensureEdge(ids[0], ids[1], 'rivals', false, 'Business competition turned personal.');
                ensureEdge(ids[1], ids[2], 'friends', false, 'Old friends with recent tension.');
            }
            // Secret affair that could be exposed
            const hasSecret = (scenario.relationships || []).some(r => r?.isSecret);
            if (!hasSecret && ids.length >= 2) {
                const a = ids[ids.length - 1];
                const b = ids[ids.length - 2];
                ensureEdge(a, b, 'secret-affair', true, 'A concealed relationship; exposure would be scandalous.');
                // If neither has a motive, hint that exposure could be a motive for one
                const one = suspectsById[a];
                if (one && (!one.motive || !one.motive.trim())) {
                    one.motive = 'To keep a secret relationship from being exposed.';
                }
            }
        } catch (_) {}

        // Witnessed events: ensure a few concrete entries
        try {
            const ids = (scenario.suspects || []).map(s => s.id);
            const names = Object.fromEntries((scenario.suspects || []).map(s => [s.id, s.name]));
            const sample = (arr, n) => {
                const copy = [...arr];
                const out = [];
                while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
                return out;
            };
            if ((scenario.witnessedEvents || []).length < 2 && ids.length >= 3) {
                scenario.witnessedEvents.push({
                    time: scenario.victim?.timeOfDeath || 'around the time of death',
                    description: `${names[ids[0]]} heard raised voices near a service corridor`,
                    witnesses: [ids[0]],
                    involves: [ids[1]]
                });
                const w2 = sample(ids, 3);
                scenario.witnessedEvents.push({
                    description: `${names[w2[0]]} saw ${names[w2[1]]} near a suspicious item`,
                    witnesses: [w2[0]],
                    involves: [w2[1]]
                });
            }
        } catch (_) {}
        // Weapon proximity: enforce fields and ensure murder weapon near/on guilty
        // Ensure murderWeaponId valid and align isMurderWeapon flags
        const weapons = Array.isArray(scenario.weapons) ? scenario.weapons : [];
        let murderWeapon = weapons.find(w => w && w.id === scenario.truth.murderWeaponId);
        if (!murderWeapon) {
            // Prefer any flagged as isMurderWeapon; else pick randomly
            murderWeapon = weapons.find(w => w && w.isMurderWeapon) || (weapons.length ? weapons[Math.floor(Math.random() * weapons.length)] : null);
            if (!murderWeapon || !murderWeapon.id) throw new Error('Scenario malformed: could not resolve a murder weapon');
            scenario.truth.murderWeaponId = murderWeapon.id;
        }
        // Align weapon flags to truth: exactly one isMurderWeapon
        (weapons || []).forEach(w => { try { w.isMurderWeapon = Boolean(w && w.id === scenario.truth.murderWeaponId); } catch (_) {} });
        if (murderWeapon) {
            if (!murderWeapon.foundOnSuspectId && !murderWeapon.foundNearSuspectId) {
                murderWeapon.foundNearSuspectId = guiltyId;
            }
            if (murderWeapon.foundOnSuspectId && murderWeapon.foundOnSuspectId !== guiltyId) {
                murderWeapon.foundOnSuspectId = guiltyId;
            }
            if (murderWeapon.foundNearSuspectId && murderWeapon.foundNearSuspectId !== guiltyId && !murderWeapon.foundOnSuspectId) {
                murderWeapon.foundNearSuspectId = guiltyId;
            }
        }
    // For other weapons, if missing proximity, assign randomly to suspects
        (scenario.weapons || []).forEach(w => {
            if (w.id === scenario.truth.murderWeaponId) return;
            if (!w.foundOnSuspectId && !w.foundNearSuspectId && scenario.suspects?.length) {
                const pick = scenario.suspects[Math.floor(Math.random() * scenario.suspects.length)].id;
                w.foundNearSuspectId = pick;
            }
        });
        // Fallback: sanitize weapon names to remove stopwords/prepositions (e.g., "from", "of", "with").
        (scenario.weapons || []).forEach(w => { try { w.name = sanitizeWeaponName(String(w.name || '')); } catch (_) {} });

        // Enrich: some suspects know about weapons not on/near them (adds investigative misdirection & context)
        try {
            const weaponsById = Object.fromEntries((scenario.weapons || []).map(w => [w.id, w]));
            const murderWeaponId = scenario.truth.murderWeaponId;
            (scenario.suspects || []).forEach(s => { if (!Array.isArray(s.knowledge)) s.knowledge = []; });
            const pickFew = (arr, n) => {
                const copy = [...arr];
                const out = [];
                while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
                return out;
            };
            // Build mapping of suspect -> weapons already linked (on/near)
            const linkedBySuspect = {};
            (scenario.weapons || []).forEach(w => {
                if (w.foundOnSuspectId) {
                    linkedBySuspect[w.foundOnSuspectId] = linkedBySuspect[w.foundOnSuspectId] || new Set();
                    linkedBySuspect[w.foundOnSuspectId].add(w.id);
                }
                if (w.foundNearSuspectId) {
                    linkedBySuspect[w.foundNearSuspectId] = linkedBySuspect[w.foundNearSuspectId] || new Set();
                    linkedBySuspect[w.foundNearSuspectId].add(w.id);
                }
            });
            // For each weapon, let 1-2 other random suspects gain generic knowledge entries
            (scenario.weapons || []).forEach(w => {
                const candidates = (scenario.suspects || []).filter(s => !(linkedBySuspect[s.id] && linkedBySuspect[s.id].has(w.id)));
                if (candidates.length < 2) return;
                const num = Math.random() < 0.5 ? 1 : 2; // 50% one, else two
                pickFew(candidates, num).forEach(holder => {
                    const already = holder.knowledge.find(k => k.toLowerCase().includes(w.name.toLowerCase()));
                    if (already) return;
                    // Avoid strong implication about murder weapon: keep phrasing neutral.
                    const neutralPhrases = [
                        `Noticed the ${w.name} earlier in a common area`,
                        `Recalls seeing ${w.name} unattended`,
                        `Heard someone mention the ${w.name} earlier`,
                        `Vaguely remembers the ${w.name} being around before the incident`,
                        `Thinks they passed by the ${w.name} at some point`,
                        `Might have seen the ${w.name} while walking through`,
                        `Remembers the ${w.name} being somewhere nearby, not sure when`,
                        `Feels like the ${w.name} was visible earlier in the day`,
                        `Can't recall clearly, but the ${w.name} may have been in the room`,
                        `Not certain, but the ${w.name} seemed to be out in the open`
                    ];
                    const phrase = neutralPhrases[Math.floor(Math.random() * neutralPhrases.length)];
                    holder.knowledge.push(phrase);
                });
            });
            // Light cap: avoid overloading any suspect with excessive added weapon knowledge (max 6 items total)
            (scenario.suspects || []).forEach(s => {
                if (Array.isArray(s.knowledge) && s.knowledge.length > 6) {
                    // Keep original first items (assumed earlier ones from model) and earliest added
                    s.knowledge = s.knowledge.slice(0, 6);
                }
            });
        } catch (_) {}

        // Shuffle suspects (and weapons) to avoid consistent ordering patterns like guilty always first
    if (Array.isArray(scenario.suspects)) fisherYates(scenario.suspects);
    if (Array.isArray(scenario.weapons)) fisherYates(scenario.weapons);
    } catch (_) {}
    try { logScenario(scenario); } catch (_) {}
    return scenario;
}

module.exports = { generateScenario };
