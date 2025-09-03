// Require dependencies and helpers
const { chatWithAI } = require('./ai');
const { logScenario, logEvent } = require('./logger');
const { getRecentSettings, sanitizeWeaponName, fisherYates, pickFew } = require('./scenarioGenerator.helpers');
const fs = require('fs');
const path = require('path');

// In-memory buffer of recent raw AI replies (kept for diagnostics on critical failures)
const RECENT_AI_REPLIES = [];

// Helper: load language-specific AI template
function loadAiTemplate(language = 'English') {
    try {
        const name = String(language || 'English');
        const file = path.resolve(__dirname, 'locales', 'ai', `${name}.json`);
        if (fs.existsSync(file)) {
            const txt = fs.readFileSync(file, 'utf8');
            return JSON.parse(txt);
        }
    } catch (_) { }
    return null;
}

// Load examples for each language from src/locales/examples/<Language>.json
function loadExamples(language = 'English') {
    try {
        const name = String(language || 'English');
        // Try several common casings: exact, Capitalized, lowercased
        const candidates = [name, name.charAt(0).toUpperCase() + name.slice(1), name.toLowerCase(), name.toUpperCase()];
        for (const c of candidates) {
            const file = path.resolve(__dirname, 'locales', 'examples', `${c}.json`);
            if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
        // Fallback to English examples if specific language not found
        const engFile = path.resolve(__dirname, 'locales', 'examples', `English.json`);
        if (fs.existsSync(engFile)) return JSON.parse(fs.readFileSync(engFile, 'utf8'));
    } catch (_) { }
    return null;
}

// Helper: parse content string into JSON with light extraction
function parseJsonContent(content) {
    if (!content || typeof content !== 'string') throw new Error('No content to parse');
    content = String(content).trim();
    // Strip code fences
    if (/^```/.test(content)) {
        const firstNl = content.indexOf('\n');
        if (firstNl !== -1) content = content.slice(firstNl + 1);
        if (content.endsWith('```')) content = content.slice(0, -3);
        content = content.trim();
    }
    // Try direct parse
    try { return JSON.parse(content); } catch (_) { }
    // Attempt to extract first JSON object/array
    const firstObj = content.indexOf('{');
    const lastObj = content.lastIndexOf('}');
    const firstArr = content.indexOf('[');
    const lastArr = content.lastIndexOf(']');
    if (firstArr >= 0 && lastArr > firstArr) {
        try { return JSON.parse(content.slice(firstArr, lastArr + 1)); } catch (_) { }
    }
    if (firstObj >= 0 && lastObj > firstObj) {
        try { return JSON.parse(content.slice(firstObj, lastObj + 1)); } catch (_) { }
    }
    // Try to recover truncated JSON by trimming the tail
    const recovered = recoverJsonByTrimming(content);
    if (recovered !== null) return recovered;
    throw new Error('Unable to parse JSON from AI content');
}

// Quick heuristic fixer for common, simple JSON malformations (truncated endings,
// trailing commas, unbalanced braces/brackets/quotes). This is not a full JSON
// parser — just a best-effort sanitizer to recover from AI truncation before
// asking the model to repair.
function attemptQuickFixJsonString(content) {
    if (!content || typeof content !== 'string') return content;
    let s = String(content).trim();
    // Strip code fences (same logic as parseJsonContent)
    if (/^```/.test(s)) {
        const firstNl = s.indexOf('\n');
        if (firstNl !== -1) s = s.slice(firstNl + 1);
        if (s.endsWith('```')) s = s.slice(0, -3);
        s = s.trim();
    }
    // Remove obvious trailing commas before closing braces/brackets
    try {
        s = s.replace(/,\s*([}\]])/g, '$1');
    } catch (_) { }

    // Balance braces/brackets by appending closing tokens if missing
    try {
        const openBraces = (s.match(/{/g) || []).length;
        const closeBraces = (s.match(/}/g) || []).length;
        const openArr = (s.match(/\[/g) || []).length;
        const closeArr = (s.match(/\]/g) || []).length;
        if (openArr > closeArr) s = s + ']'.repeat(openArr - closeArr);
        if (openBraces > closeBraces) s = s + '}'.repeat(openBraces - closeBraces);
    } catch (_) { }

    // Fix simple unbalanced double quotes by appending a quote if odd count
    try {
        const quotes = (s.match(/"/g) || []).length;
        if (quotes % 2 === 1) s = s + '"';
    } catch (_) { }

    return s;
}

// Try to recover a truncated JSON array/object by trimming the tail until it parses.
function recoverJsonByTrimming(content) {
    if (!content || typeof content !== 'string') return null;
    const s = String(content);
    // Try to find an array first
    const firstArr = s.indexOf('[');
    if (firstArr >= 0) {
        // iterate from the end backwards trying to parse progressively shorter slices
        for (let end = s.length - 1; end > firstArr; end--) {
            const slice = s.slice(firstArr, end + 1);
            try {
                const attempt = attemptQuickFixJsonString(slice);
                return JSON.parse(attempt);
            } catch (_) { /* continue trimming */ }
        }
    }
    // Try object
    const firstObj = s.indexOf('{');
    if (firstObj >= 0) {
        for (let end = s.length - 1; end > firstObj; end--) {
            const slice = s.slice(firstObj, end + 1);
            try {
                const attempt = attemptQuickFixJsonString(slice);
                return JSON.parse(attempt);
            } catch (_) { /* continue */ }
        }
    }
    return null;
}

// Parse newline-delimited JSON objects (JSONL) where AI may have emitted one object per line
// Note: attemptQuickFixJsonString, recoverJsonByTrimming and parseJsonContent are implemented
// locally in this file; only import helpers we don't define here.
const { parseJsonLines, fetchJsonWithRetries: fetchJsonWithRetriesUtil } = require('./utils/jsonRepair');

// Post-process and normalize assembled scenario
function postProcessScenario(scenario) {
    try {
        if (!Array.isArray(scenario.relationships)) scenario.relationships = [];
        if (!Array.isArray(scenario.witnessedEvents)) scenario.witnessedEvents = [];
        // Normalize suspects
        const genders = ['male', 'female'];
        (scenario.suspects || []).forEach(s => {
            if (!s || typeof s !== 'object') return;
            if (!s.gender || typeof s.gender !== 'string') s.gender = genders[Math.floor(Math.random() * genders.length)];
            if (typeof s.age !== 'number' || !Number.isFinite(s.age)) s.age = Math.floor(22 + Math.random() * 43);
            if (!Array.isArray(s.alibiVerifiedBy)) s.alibiVerifiedBy = [];
            if (typeof s.motive !== 'string') s.motive = '';
            if (!Array.isArray(s.mannerisms)) s.mannerisms = [];
            if (!Array.isArray(s.quirks)) s.quirks = [];
            if (typeof s.catchphrase !== 'string') s.catchphrase = '';
            if (!Array.isArray(s.knowledge)) s.knowledge = [];
            if (!Array.isArray(s.contradictions)) s.contradictions = [];
        });

        // Resolve truth.guiltySuspectId
        try {
            let guiltyId = scenario.truth && scenario.truth.guiltySuspectId;
            const suspects = Array.isArray(scenario.suspects) ? scenario.suspects : [];
            const suspectsById = Object.fromEntries((suspects || []).map(s => [s.id, s]));
            if (!guiltyId || !suspectsById[guiltyId]) {
                const firstFlagged = suspects.find(s => s && s.isGuilty);
                const fallback = firstFlagged || (suspects.length ? suspects[Math.floor(Math.random() * suspects.length)] : null);
                if (!fallback || !fallback.id) throw new Error('Scenario malformed: could not resolve a guilty suspect');
                guiltyId = fallback.id;
                if (!scenario.truth) scenario.truth = {};
                scenario.truth.guiltySuspectId = guiltyId;
            }
            const guilty = suspectsById[scenario.truth.guiltySuspectId];
            (suspects || []).forEach(s => { try { s.isGuilty = Boolean(s && s.id === scenario.truth.guiltySuspectId); } catch (_) { } });
            if (guilty) {
                guilty.alibiVerifiedBy = [];
                if (!guilty.motive || !guilty.motive.trim()) guilty.motive = scenario.truth.motiveCore || 'Personal grievance';
            }
        } catch (_) { }

        // Enforce suspect-to-suspect alibi verification: remove external evidences,
        // make verifications symmetric, and pair unverified innocents where possible.
        try {
            const suspects = Array.isArray(scenario.suspects) ? scenario.suspects : [];
            const suspectsById = Object.fromEntries((suspects || []).map(s => [s.id, s]));
            const guiltyId = scenario.truth && scenario.truth.guiltySuspectId;

            for (const s of suspects) {
                if (!s || typeof s !== 'object') continue;
                s.alibi = typeof s.alibi === 'string' && s.alibi.trim() ? s.alibi.trim() : 'Prefers not to say.';
                s.alibiVerifiedBy = Array.isArray(s.alibiVerifiedBy) ? s.alibiVerifiedBy.filter(id => !!suspectsById[id] && id !== s.id) : [];
            }

            if (guiltyId && suspectsById[guiltyId]) suspectsById[guiltyId].alibiVerifiedBy = [];

            // Make verification symmetric
            for (const s of suspects) {
                if (!s || s.id === (scenario.truth && scenario.truth.guiltySuspectId)) continue;
                for (const vId of s.alibiVerifiedBy || []) {
                    const v = suspectsById[vId];
                    if (v && v.id !== (scenario.truth && scenario.truth.guiltySuspectId) && v.id !== s.id) {
                        if (!Array.isArray(v.alibiVerifiedBy)) v.alibiVerifiedBy = [];
                        if (!v.alibiVerifiedBy.includes(s.id)) v.alibiVerifiedBy.push(s.id);
                    }
                }
            }

            const innocents = suspects.filter(s => s && s.id !== (scenario.truth && scenario.truth.guiltySuspectId));
            const unverified = innocents.filter(s => !Array.isArray(s.alibiVerifiedBy) || s.alibiVerifiedBy.length === 0);

            // Shuffle unverified list
            for (let i = unverified.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unverified[i], unverified[j]] = [unverified[j], unverified[i]];
            }

            for (let i = 0; i + 1 < unverified.length; i += 2) {
                const a = unverified[i];
                const b = unverified[i + 1];
                if (!a || !b) continue;
                a.alibiVerifiedBy = [b.id];
                b.alibiVerifiedBy = b.alibiVerifiedBy || [];
                if (!b.alibiVerifiedBy.includes(a.id)) b.alibiVerifiedBy.push(a.id);
            }

            if (unverified.length % 2 === 1 && unverified.length > 0 && innocents.length > 1) {
                const last = unverified[unverified.length - 1];
                const partner = innocents.find(s => s.id !== last.id && s.id !== (scenario.truth && scenario.truth.guiltySuspectId));
                if (partner) {
                    last.alibiVerifiedBy = [partner.id];
                    partner.alibiVerifiedBy = partner.alibiVerifiedBy || [];
                    if (!partner.alibiVerifiedBy.includes(last.id)) partner.alibiVerifiedBy.push(last.id);
                }
            }

            // Final cleanup
            for (const s of suspects) {
                if (!s || typeof s !== 'object') continue;
                s.alibiVerifiedBy = Array.isArray(s.alibiVerifiedBy) ? s.alibiVerifiedBy.filter(id => !!suspectsById[id] && id !== s.id && id !== (scenario.truth && scenario.truth.guiltySuspectId)) : [];
            }
        } catch (_) { }

        // Weapons: ensure murderWeaponId exists and align flags & proximity
        try {
            const weapons = Array.isArray(scenario.weapons) ? scenario.weapons : [];
            if (!scenario.truth) scenario.truth = {};
            let murderWeapon = weapons.find(w => w && w.id === scenario.truth.murderWeaponId);
            if (!murderWeapon) murderWeapon = weapons.find(w => w && w.isMurderWeapon) || (weapons.length ? weapons[Math.floor(Math.random() * weapons.length)] : null);
            if (!murderWeapon || !murderWeapon.id) throw new Error('Scenario malformed: could not resolve a murder weapon');
            scenario.truth.murderWeaponId = murderWeapon.id;
            (weapons || []).forEach(w => { try { w.isMurderWeapon = Boolean(w && w.id === scenario.truth.murderWeaponId); } catch (_) { } });
            const guiltyId = scenario.truth.guiltySuspectId;
            if (murderWeapon) {
                if (!murderWeapon.foundOnSuspectId && !murderWeapon.foundNearSuspectId) murderWeapon.foundNearSuspectId = guiltyId;
                if (murderWeapon.foundOnSuspectId && murderWeapon.foundOnSuspectId !== guiltyId) murderWeapon.foundOnSuspectId = guiltyId;
                if (murderWeapon.foundNearSuspectId && murderWeapon.foundNearSuspectId !== guiltyId && !murderWeapon.foundOnSuspectId) murderWeapon.foundNearSuspectId = guiltyId;
            }
            (scenario.weapons || []).forEach(w => {
                if (w.id === scenario.truth.murderWeaponId) return;
                if (!w.foundOnSuspectId && !w.foundNearSuspectId && scenario.suspects?.length) {
                    const pick = scenario.suspects[Math.floor(Math.random() * scenario.suspects.length)].id;
                    w.foundNearSuspectId = pick;
                }
            });
            (scenario.weapons || []).forEach(w => { try { w.name = sanitizeWeaponName(String(w.name || ''), Array.isArray(w.discoveredHints) ? w.discoveredHints : []); } catch (_) { } });
        } catch (_) { }

        // Ensure relationships & witnessed events plausible counts
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
            const hasSecret = (scenario.relationships || []).some(r => r?.isSecret);
            if (!hasSecret && ids.length >= 2) {
                const a = ids[ids.length - 1]; const b = ids[ids.length - 2];
                ensureEdge(a, b, 'secret-affair', true, 'A concealed relationship; exposure would be scandalous.');
                const one = (scenario.suspects || []).find(s => s.id === a);
                if (one && (!one.motive || !one.motive.trim())) one.motive = 'To keep a secret relationship from being exposed.';
            }
        } catch (_) { }

        // Light enrichment
        try {
            (scenario.suspects || []).forEach(s => { if (Array.isArray(s.knowledge) && s.knowledge.length > 6) s.knowledge = s.knowledge.slice(0, 6); });
            if (Array.isArray(scenario.suspects)) fisherYates(scenario.suspects);
            if (Array.isArray(scenario.weapons)) fisherYates(scenario.weapons);
        } catch (_) { }
    } catch (e) {
        console.error('postProcessScenario error:', e && e.message ? e.message : e);
    }
    try { logScenario(scenario); } catch (_) { }
    return scenario;
}

// Step 1: title, setting, victim
async function generateScenarioStep1TitleSettingVictim(language) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (names, descriptions, and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    const example = examples.titleSettingVictim || `{"title":"Night at the Conservatory","setting":"An overgrown glass conservatory after hours","victim":{"name":"Dr. Iris Novak","timeOfDeath":"23:45","location":"central pond"}}`;
    const system = `You are a scenario generator. Output ONLY valid JSON that uses EXACT English keys. Keys MUST be EXACTLY these English keys: title, setting, victim (with name, timeOfDeath, optional location). ${langInstr}`;
    const user = `Return ONLY a single JSON object that matches this example/schema (keys must match EXACTLY): ${example}\nGenerate a concise title, evocative setting, and victim (name, timeOfDeath, optional location).`;
    const parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.05, max_tokens: 700, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 1, partName: 'title/setting/victim', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    console.log('SCENARIO_STEP1_TITLE_SETTING_VICTIM_PARSED_BEGIN');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('SCENARIO_STEP1_TITLE_SETTING_VICTIM_PARSED_END');
    if (!parsed || !parsed.title || !parsed.setting || !parsed.victim || !parsed.victim.name || !parsed.victim.timeOfDeath) {
        throw new Error('Malformed scenario part: missing title, setting, or victim fields.');
    }
    return parsed;
}

// Step 2: suspects
async function generateScenarioStep2Suspects(language, context) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (names, descriptions, and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    // Update: we instruct the model that "mannerisms" should be speech-focused
    // (speech-mannerisms like 'speaks softly', 'answers evasively') and that
    // "quirks" should be speech-specific quirks (stutter, word-finding pauses,
    // echolalia, overuse of metaphors). Provide examples to bias generation.
    const example = examples.suspects || `[ {"id":"suspect1","name":"Liora Dayan","gender":"female","age":34,"mannerisms":["speaks quickly","answers in short evasive replies"],"quirks":["stutters","word-finding pauses"],"catchphrase":"Honestly!","backstory":"Research assistant.","relationshipToVictim":"colleague","motive":"jealousy","alibi":"in lab","alibiVerifiedBy":["suspect2"],"knowledge":["saw victim with another"],"contradictions":[],"isGuilty":false,"persona":"tense"} ]`;
    const system = `You are a scenario generator. Output ONLY valid JSON (no explanation). Use EXACT English keys for suspects objects: id, name, gender, age, mannerisms, quirks, catchphrase, backstory, relationshipToVictim, motive, alibi, alibiVerifiedBy, knowledge, contradictions, isGuilty, persona. NOTE: For this project we use 'mannerisms' specifically to mean speech-mannerisms (how the suspect speaks: speaking softly, shouting, answering in short evasive replies, interrupting, using a sing-song tone, etc.). We use 'quirks' to mean speech-quirks (stuttering, stammering, echolalia, frequent word-finding pauses, overuse of metaphors/analogies, monotone). Provide examples in those fields where appropriate. IMPORTANT: the field \"alibiVerifiedBy\" MUST be an array of suspect IDs that appear in this same suspects array (for example: [\"suspect1\", \"suspect2\"]). Do NOT include external evidences, freeform strings, or non-suspect identifiers (e.g., \"security footage\" or \"roommate\"). If no other suspect can verify an alibi, set \"alibiVerifiedBy\" to an empty array. Groups of 2 or 3 suspects confirming each other are allowed. Also, suspects MAY mention weapons they noticed nearby in their \"knowledge\" array (use weapon names exactly as they appear in the weapons array). ${langInstr}`;
    const user = `Context:\n${JSON.stringify({ title: context.title, setting: context.setting, victim: context.victim })}\nReturn ONLY a JSON array of 5–7 suspect objects (keys MUST match EXACTLY) matching this example schema: ${example}\nNOTE: For each suspect, the \"alibiVerifiedBy\" value MUST be an array of zero or more suspect IDs from the same array (no external evidence strings). Groups of 2 or 3 mutual verifiers are acceptable.`;
    const parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.05, max_tokens: 1200, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 2, partName: 'suspects', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    console.log('SCENARIO_STEP2_SUSPECTS_PARSED_BEGIN');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('SCENARIO_STEP2_SUSPECTS_PARSED_END');
    let suspects = Array.isArray(parsed) ? parsed.slice() : [];
    // If the model returned too few suspects, ask for the missing ones and merge
    if (suspects.length < 5) {
        const maxSuspect = Math.random() * 3 + 5; // 5–8
        const missing = maxSuspect - suspects.length;
        console.log(`generateScenarioStep2Suspects: only ${suspects.length} suspects returned, requesting ${missing} more`);
        const addSystem = `You are a scenario generator. Output ONLY a JSON array of additional suspect objects to augment an existing list. Produce exactly ${missing} suspects. ${langInstr}`;
        const existingIds = (suspects || []).map(s => s && s.id).filter(Boolean);
        const addUser = `Context:
${JSON.stringify({ title: context.title, setting: context.setting, victim: context.victim, existingSuspectIds: existingIds })}
Return ONLY a JSON array of ${missing} suspect objects matching this example/schema: ${example}`;
    const more = await fetchJsonWithRetriesUtil({ system: addSystem, user: addUser, options: { temperature: 0.8, max_tokens: 500, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 2, partName: 'suspects-additional', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
        if (Array.isArray(more) && more.length) {
            // Ensure unique IDs: if collision, append suffix
            const used = new Set(existingIds);
            for (const m of more) {
                if (!m || typeof m !== 'object') continue;
                if (!m.id) m.id = `suspect${Math.floor(Math.random() * 10000)}`;
                let base = m.id;
                let i = 1;
                while (used.has(m.id)) { m.id = `${base}_${i++}`; }
                used.add(m.id);
                suspects.push(m);
            }
        }
    }
    if (!Array.isArray(suspects) || suspects.length < 5) throw new Error('Malformed suspects part: missing or too few suspects.');
    for (const s of suspects) if (!s.id || !s.name || !s.gender || typeof s.age !== 'number') throw new Error('Malformed suspect entry: missing id, name, gender, or age.');
    return suspects;
}

// Step 3: weapons
async function generateScenarioStep3Weapons(language, context) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (names, descriptions, and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    const example = examples.weapons || `[ {"id":"weapon1","name":"Garden Sickle","discoveredHints":["blood"],"isMurderWeapon":false,"foundOnSuspectId":"suspect2","foundNearSuspectId":null} ]`;
    const system = `You are a scenario generator. Output ONLY valid JSON for weapons. Keys MUST be EXACTLY: id, name, discoveredHints, isMurderWeapon, foundOnSuspectId, foundNearSuspectId. IMPORTANT: the name field must be a meaningful, concise noun phrase (e.g., "Glass Shard", "Kitchen Knife", "Statue Base"). Do NOT set name to generic terms like \"weapon\", \"item\", or \"object\". Names should be short (1–3 words) and, where possible, be themed to the setting. ${langInstr}`;
    const user = `Context suspects:\n${JSON.stringify(context.suspects)}\nReturn ONLY a JSON array of 4–6 weapons (keys MUST match EXACTLY) matching this example schema: ${example}\nIMPORTANT: Each weapon.name should be a concise, descriptive noun phrase (1–3 words). Provide realistic discoveredHints (short words or phrases) that can be used to derive better fallback names if needed.`;
    // Attempt initial fetch
    let parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.05, max_tokens: 1000, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 2, partName: 'weapons', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    console.log('SCENARIO_STEP3_WEAPONS_PARSED_BEGIN');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('SCENARIO_STEP3_WEAPONS_PARSED_END');
    if (!Array.isArray(parsed) || parsed.length < 4) throw new Error('Malformed weapons part: missing or too few weapons.');
    for (const w of parsed) if (!w.id || !w.name || !Array.isArray(w.discoveredHints) || typeof w.isMurderWeapon !== 'boolean') throw new Error('Malformed weapon entry: missing id, name, discoveredHints, or isMurderWeapon.');

    // Detect generic weapon names (in multiple languages) and, if present,
    // ask the AI to regenerate better names while preserving other fields.
    const GENERIC_WORDS = new Set(['weapon', 'weapons', 'murder weapon', 'unknown', 'item', 'object', 'נשק', 'פריט', 'חפץ', 'כלי', 'אובייקט']);
    const isGenericName = (s) => {
        if (!s || typeof s !== 'string') return true;
        const low = s.trim().toLowerCase();
        if (GENERIC_WORDS.has(low)) return true;
        if (/^weapons?$/.test(low)) return true;
        if (low.length < 2) return true;
        return false;
    };

    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        const bad = parsed.filter(w => isGenericName(String(w.name || '')));
        if (bad.length === 0) break; // all good

        // Prepare a focused repair prompt: request replacement names only
        const repairSystem = `You are a scenario generator focused on weapon names. Output ONLY a JSON array of weapon objects matching the original schema: id, name, discoveredHints, isMurderWeapon, foundOnSuspectId, foundNearSuspectId. Keep all fields exactly as provided except REPLACE the 'name' fields for entries that were generic (e.g., "weapon", "item", "נשק"). Names MUST be meaningful, concise noun phrases (1-3 words) and MUST NOT be generic. Do NOT change ids or boolean flags. ${langInstr}`;
        const repairUser = `Here are the current weapons JSON (some names are generic):\n${JSON.stringify(parsed, null, 2)}\n\nPlease return the full weapons array again but with improved 'name' values where needed. Keep discoveredHints and other fields intact. Return ONLY the JSON array.`;
        try {
            const repaired = await fetchJsonWithRetriesUtil({ system: repairSystem, user: repairUser, options: { temperature: 0.0, max_tokens: 800, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 1, partName: 'weapons-repair', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
            console.log('SCENARIO_STEP3_WEAPONS_REPAIRED_BEGIN');
            console.log(JSON.stringify(repaired, null, 2));
            console.log('SCENARIO_STEP3_WEAPONS_REPAIRED_END');
            if (Array.isArray(repaired) && repaired.length >= 4) {
                parsed = repaired;
            }
        } catch (e) {
            console.log('weapons repair attempt failed:', e && e.message ? e.message : e);
        }
        attempt += 1;
    }

    // Final validation
    const finalBad = parsed.filter(w => isGenericName(String(w.name || '')));
    if (finalBad.length > 0) {
        // If still generic after retries, throw so higher-level logic can handle it
        throw new Error('Weapons contain generic names after regeneration attempts: ' + JSON.stringify(finalBad.map(b => b.name)));
    }

    return parsed;
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
        content = res.message?.content ?? '';
        content = String(content).trim();
        try { RECENT_AI_REPLIES.unshift({ partName: 'full_scenario', ts: Date.now(), content: String(content).slice(0, 200000) }); if (RECENT_AI_REPLIES.length > 50) RECENT_AI_REPLIES.length = 50; } catch (_) { }
        // Log the raw AI response for debugging
        console.log('SCENARIO_GENERATOR_RAW_AI_RESPONSE_BEGIN');
        console.log(content);
        console.log('SCENARIO_GENERATOR_RAW_AI_RESPONSE_END');
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
            const repairUser = `Here is the assistant's previous reply that failed to parse as JSON:\n---\n${String(content).slice(0, 4000)}\n---\nPlease output only the corrected JSON object now.`;
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
        // Try to infer truth from suspect/weapon flags present in the parsed scenario
        try {
            let guiltyId = null;
            let murderWeaponId = null;
            if (Array.isArray(scenario.suspects)) {
                const flagged = scenario.suspects.find(s => s && (s.isGuilty === true || String(s.isGuilty).toLowerCase() === 'true'));
                if (flagged && flagged.id) guiltyId = flagged.id;
            }
            if (Array.isArray(scenario.weapons)) {
                const flaggedW = scenario.weapons.find(w => w && (w.isMurderWeapon === true || String(w.isMurderWeapon).toLowerCase() === 'true'));
                if (flaggedW && flaggedW.id) murderWeaponId = flaggedW.id;
            }
            // If weapon flagged but no guilty suspect flagged, try to infer guilty from weapon proximity fields
            if (!guiltyId && murderWeaponId && Array.isArray(scenario.weapons)) {
                const mw = scenario.weapons.find(w => w && w.id === murderWeaponId);
                if (mw) {
                    if (mw.foundOnSuspectId) guiltyId = mw.foundOnSuspectId;
                    else if (mw.foundNearSuspectId) guiltyId = mw.foundNearSuspectId;
                }
            }
            if (!scenario.truth) scenario.truth = {};
            if (guiltyId) scenario.truth.guiltySuspectId = guiltyId;
            if (murderWeaponId) scenario.truth.murderWeaponId = murderWeaponId;
            if (guiltyId || murderWeaponId) {
                scenario.truth.motiveCore = scenario.truth.motiveCore || '';
                scenario.truth.keyContradictions = scenario.truth.keyContradictions || [];
            }
            // If still missing required truth pieces, persist diagnostics and fail
            if (!scenario.truth.guiltySuspectId || !scenario.truth.murderWeaponId) {
                const samplesDir = path.resolve(__dirname, '..', 'samples');
                if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });
                const fn = path.resolve(samplesDir, `bad_ai_response_missing_truth_${Date.now()}.log`);
                const dump = {
                    note: 'Missing truth detected during validation',
                    ts: new Date().toISOString(),
                    recentAIReplies: RECENT_AI_REPLIES.slice(0, 10),
                    partialScenario: scenario
                };
                try { fs.writeFileSync(fn, JSON.stringify(dump, null, 2), 'utf8'); console.error('Saved missing-truth diagnostics to', fn); } catch (_) { }
                throw new Error('Scenario malformed: missing truth');
            }
        } catch (err) {
            try { console.error('Error during truth inference:', err && err.message ? err.message : err); } catch (_) { }
            throw new Error('Scenario malformed: missing truth');
        }
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
    } catch (_) { }

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
        (suspects || []).forEach(s => { try { s.isGuilty = Boolean(s && s.id === guiltyId); } catch (_) { } });
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
        } catch (_) { }

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
        } catch (_) { }
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
        (weapons || []).forEach(w => { try { w.isMurderWeapon = Boolean(w && w.id === scenario.truth.murderWeaponId); } catch (_) { } });
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
        // Fallback: sanitize weapon names to remove stopwords/prepositions (e.g., "from", "of", "with"). Use discoveredHints to improve fallbacks.
        (scenario.weapons || []).forEach(w => { try { w.name = sanitizeWeaponName(String(w.name || ''), Array.isArray(w.discoveredHints) ? w.discoveredHints : []); } catch (_) { } });

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
        } catch (_) { }

        // Shuffle suspects (and weapons) to avoid consistent ordering patterns like guilty always first
        if (Array.isArray(scenario.suspects)) fisherYates(scenario.suspects);
        if (Array.isArray(scenario.weapons)) fisherYates(scenario.weapons);
    } catch (_) { }
    try { logScenario(scenario); } catch (_) { }
    return scenario;
}

// Convenience wrapper: keep existing step functions but provide a full-run wrapper used by scripts
async function generateFullScenario(language = 'English') {
    // Chunked flow: run each step, validate, assemble, post-process, and return
    const part1 = await generateScenarioStep1TitleSettingVictim(language);
    const part2 = await generateScenarioStep2Suspects(language, part1);
    const part3 = await generateScenarioStep3Weapons(language, { ...part1, suspects: part2 });
    const part4 = await generateScenarioStep4Timeline(language, { ...part1, suspects: part2, weapons: part3 });
    const part5 = await generateScenarioStep5Relationships(language, { suspects: part2 });
    const part6 = await generateScenarioStep6WitnessedEvents(language, { suspects: part2, timeline: part4 });
    const part7 = await generateScenarioStep7Truth(language, { title: part1.title, suspects: part2, weapons: part3, timeline: part4, relationships: part5, witnessedEvents: part6, victim: part1.victim });
    const scenario = {
        title: part1.title,
        setting: part1.setting,
        victim: part1.victim,
        suspects: part2,
        weapons: part3,
        timeline: part4,
        relationships: part5,
        witnessedEvents: part6,
        truth: part7
    };
    try { postProcessScenario(scenario); } catch (_) { }
    return scenario;
}
// Export public API
// Step 4: timeline
async function generateScenarioStep4Timeline(language, context) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (descriptions and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    const example = examples.timeline || `[ {"time":"23:00","summary":"Heard argument","involvedSuspects":["suspect1"]} ]`;
    const system = `You are a scenario generator. Output ONLY valid JSON for timeline events with EXACT keys: time, summary, involvedSuspects. ${langInstr}`;
    const user = `Context:\n${JSON.stringify({ suspects: context.suspects, victim: context.victim })}\nReturn ONLY a JSON array of 3–6 timeline entries (keys MUST match EXACTLY) matching this example: ${example}`;
    const parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.05, max_tokens: 800, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 1, partName: 'timeline', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    if (!Array.isArray(parsed) || parsed.length < 3) throw new Error('Malformed timeline part: too few entries');
    return parsed;
}

// Step 5: relationships
async function generateScenarioStep5Relationships(language, context) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (descriptions and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    const example = examples.relationships || `[ {"between":["suspect1","suspect2"],"type":"rivals","isSecret":false} ]`;
    const system = `You are a scenario generator. Output ONLY valid JSON for relationships. Keys MUST be EXACTLY: between, type, isSecret, note (optional). ${langInstr}`;
    const user = `Suspects ids: ${JSON.stringify(context.suspects.map(s => s.id))}\nReturn ONLY 2–5 relationships (keys MUST match EXACTLY) matching this example: ${example}`;
    const parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.05, max_tokens: 600, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 1, partName: 'relationships', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    if (!Array.isArray(parsed)) throw new Error('Malformed relationships part');
    return parsed;
}

// Step 6: witnessed events
async function generateScenarioStep6WitnessedEvents(language, context) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (descriptions and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    const example = examples.witnessedEvents || `[ {"description":"Heard shouting","witnesses":["suspect1"],"involves":["suspect2"]} ]`;
    const system = `You are a scenario generator. Output ONLY valid JSON for witnessed events. Keys MUST be EXACTLY: time (optional), description, witnesses, involves (optional). ${langInstr}`;
    const user = `Context timeline and suspects:\n${JSON.stringify({ suspects: context.suspects, timeline: context.timeline })}\nReturn ONLY 2–4 witnessed events (keys MUST match EXACTLY) matching this example: ${example}`;
    const parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.05, max_tokens: 600, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 1, partName: 'witnessed events', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    if (!Array.isArray(parsed) || parsed.length < 1) throw new Error('Malformed witnessed events part');
    return parsed;
}

// Step 7: truth (solution)
async function generateScenarioStep7Truth(language, context) {
    const tpl = loadAiTemplate(language) || {};
    const examples = loadExamples(language) || {};
    const langInstr = tpl.scenario_system_prefix || (language && String(language).toLowerCase() !== 'english'
        ? `Produce all output (descriptions and JSON fields) in ${language}. Do not include translations or English fallbacks.`
        : `Produce all output in English.`);
    const example = examples.truth || `{"guiltySuspectId":"suspect3","murderWeaponId":"weapon2","motiveCore":"jealousy","keyContradictions":["alibi mismatch"]}`;
    const system = `You are a scenario generator. Output ONLY valid JSON for the truth object. Keys MUST be EXACTLY: guiltySuspectId, murderWeaponId, motiveCore, keyContradictions. ${langInstr}`;
    const user = `Assemble context:\n${JSON.stringify(context)}\nReturn ONLY a JSON object that matches this example (keys MUST match EXACTLY): ${example}`;
    const parsed = await fetchJsonWithRetriesUtil({ system, user, options: { temperature: 0.0, max_tokens: 800, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 3, partName: 'truth', callAI: chatWithAI, recentRepliesArray: RECENT_AI_REPLIES });
    if (!parsed || !parsed.guiltySuspectId || !parsed.murderWeaponId) throw new Error('Malformed truth part: missing guiltySuspectId or murderWeaponId');
    return parsed;
}

module.exports = {
    generateScenario,
    generateFullScenario,
    generateScenarioStep1TitleSettingVictim,
    generateScenarioStep2Suspects,
    generateScenarioStep3Weapons,
    generateScenarioStep4Timeline,
    generateScenarioStep5Relationships,
    generateScenarioStep6WitnessedEvents,
    generateScenarioStep7Truth
};
