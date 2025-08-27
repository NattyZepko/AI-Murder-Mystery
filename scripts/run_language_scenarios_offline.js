const path = require('path');
const fs = require('fs');

// Inject a mock ai module into require.cache so scenarioGenerator will use it
const aiPath = path.resolve(__dirname, '..', 'src', 'ai.js');
// Simple helper to extract first JSON-like substring from text
function extractFirstJson(text) {
    if (!text || typeof text !== 'string') return null;
    const firstObj = text.indexOf('{');
    const firstArr = text.indexOf('[');
    let start = -1; let end = -1;
    if (firstArr >= 0 && (firstArr < firstObj || firstObj === -1)) {
        start = firstArr;
        end = text.lastIndexOf(']');
    } else if (firstObj >= 0) {
        start = firstObj;
        end = text.lastIndexOf('}');
    }
    if (start >= 0 && end > start) {
        const cand = text.slice(start, end + 1);
        try { return JSON.parse(cand); } catch (e) {
            // try quick fixes: remove trailing commas
            const fixed = cand.replace(/,\s*([}\]])/g, '$1');
            try { return JSON.parse(fixed); } catch (_) { return null; }
        }
    }
    return null;
}

// Prepare mock exports
const mock = {
    chatWithAI: async function ({ system, messages, options }) {
        const user = (messages || []).find(m => m.role === 'user')?.content || '';
        // Try to extract an example JSON embedded in the user prompt
        const ex = extractFirstJson(user) || extractFirstJson(system) || null;
        if (ex) {
            // If an array, return as array JSON string; else object
            const out = JSON.stringify(ex);
            return { message: { role: 'assistant', content: out } };
        }
        // Fallback for suspects: generate a realistic list of 5–7 unique suspects.
        if (/suspect/i.test(user) || /suspects/i.test(system)) {
            // If prompt asks for exactly N suspects (e.g., "Produce exactly 3 suspects"), parse N
            let matchExact = user.match(/Produce exactly (\d+)/i) || user.match(/Return ONLY a JSON array of (\d+)[–-]/i) || user.match(/Return ONLY a JSON array of (\d+)/i);
            let count = matchExact ? parseInt(matchExact[1], 10) : null;
            if (!count) {
                // default desired range 5-7
                count = 5 + Math.floor(Math.random() * 3);
            }
            // If existingSuspectIds provided in the context, avoid collisions
            let existingIds = [];
            try {
                const found = user.match(/existingSuspectIds"?:\s*(\[[^\]]*\])/i);
                if (found) {
                    existingIds = JSON.parse(found[1]);
                }
            } catch (_) { existingIds = []; }
            const used = new Set(existingIds || []);
            const suspects = [];
            let nextIdx = 1;
            while (suspects.length < count) {
                const id = `suspect${nextIdx}`;
                nextIdx++;
                if (used.has(id)) continue;
                used.add(id);
                suspects.push({ id, name: `Mock Suspect ${id}`, gender: (suspects.length % 2 === 0 ? 'female' : 'male'), age: 25 + suspects.length, mannerisms: [], quirks: [], catchphrase: '', backstory: '', relationshipToVictim: '', motive: '', alibi: '', alibiVerifiedBy: [], knowledge: [], contradictions: [], isGuilty: false, persona: '' });
            }
            return { message: { role: 'assistant', content: JSON.stringify(suspects) } };
        }
        if (/weapon/i.test(user) || /weapons/i.test(system)) {
            return {
                message: {
                    role: 'assistant', content: JSON.stringify([
                        { id: 'weapon1', name: 'Mock Knife', discoveredHints: [], isMurderWeapon: true, foundOnSuspectId: 'suspect1', foundNearSuspectId: null },
                        { id: 'weapon2', name: 'Mock Candlestick', discoveredHints: [], isMurderWeapon: false, foundOnSuspectId: null, foundNearSuspectId: 'suspect2' }
                    ])
                }
            };
        }
        if (/truth/i.test(user) || /guiltySuspectId/i.test(system)) {
            return { message: { role: 'assistant', content: JSON.stringify({ guiltySuspectId: 'suspect1', murderWeaponId: 'weapon1', motiveCore: 'mock motive', keyContradictions: [] }) } };
        }
        // Default: return empty object
        return { message: { role: 'assistant', content: '{}' } };
    }
};

// Put into require cache using resolved id to match Node's module cache key
try {
    const rid = require.resolve(aiPath);
    require.cache[rid] = { id: rid, filename: rid, loaded: true, exports: mock };
} catch (e) {
    // fallback: use absolute path key
    require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: mock };
}

(async function run() {
    const genPath = path.resolve(__dirname, '..', 'src', 'scenarioGenerator.js');
    const gen = require(genPath);
    const langs = ['English', 'Hebrew', 'French'];
    for (const lang of langs) {
        console.log(`\n===== Offline Generating scenario for: ${lang} =====`);
        try {
            const scenario = await gen.generateFullScenario(lang);
            console.log('SCENARIO_PARSED_BEGIN');
            console.log(JSON.stringify(scenario, null, 2));
            console.log('SCENARIO_PARSED_END');
        } catch (e) {
            console.error(`Error generating for ${lang}:`, e && e.message ? e.message : String(e));
        }
    }
})();
