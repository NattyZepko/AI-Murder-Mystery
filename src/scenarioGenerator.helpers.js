const fs = require('fs');
const path = require('path');

function getRecentSettings(maxFiles = 8) {
    try {
        const logDir = path.resolve(__dirname, '..', 'logs');
        if (!fs.existsSync(logDir)) return [];
        const files = fs.readdirSync(logDir)
            .filter(f => /session-.*\.log$/i.test(f))
            .map(f => ({ f, p: path.join(logDir, f) }))
            .map(fp => ({
                path: fp.p,
                mtime: (() => { try { return fs.statSync(fp.p).mtimeMs || 0; } catch (_) { return 0; } })()
            }))
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, Math.max(0, maxFiles));
        const out = [];
        for (const file of files) {
            try {
                const content = fs.readFileSync(file.path, 'utf8');
                const idx = content.lastIndexOf('SCENARIO_JSON:');
                if (idx >= 0) {
                    const line = content.slice(idx).split('\n', 1)[0];
                    const jsonStr = line.replace(/^.*SCENARIO_JSON:\s*/, '');
                    try {
                        const obj = JSON.parse(jsonStr);
                        const s = String(obj?.setting || '').trim();
                        if (s) out.push(s);
                    } catch (_) { /* ignore parse error */ }
                }
            } catch (_) { /* ignore file read error */ }
        }
        const seen = new Set();
        const uniq = [];
        for (const s of out) {
            const key = s.toLowerCase();
            if (!seen.has(key)) { seen.add(key); uniq.push(s); }
        }
        return uniq;
    } catch (_) { return []; }
}

const STOP_WORDS = new Set([
    'and', 'with', 'of', 'a', 'an', 'the', 'or', 'in', 'on', 'at', 'to', 'for', 'by', 'from', 'into', 'over', 'under', 'above', 'below', 'near', 'through', 'off', 'up', 'down', 'out', 'about', 'as'
]);

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function sanitizeWeaponName(name, discoveredHints = []) {
    if (!name || typeof name !== 'string') name = '';
    // Keep non-ASCII characters (for Hebrew/French names). Remove parenthetical notes.
    let base = String(name).replace(/\([^)]*\)/g, ' ');
    // Tokenize by whitespace and punctuation but allow unicode letters
    let tokens = base
        .split(/[^\p{L}\p{N}]+/u)
        .map(t => t.trim())
        .filter(Boolean)
        .filter(t => !STOP_WORDS.has(t.toLowerCase()));
    if (tokens.length > 3) tokens = tokens.slice(0, 3);
    // If tokens are primarily non-latin, don't apply title-casing; return joined tokens
    const latinCount = tokens.reduce((c, t) => c + (/^[A-Za-z0-9]+$/.test(t) ? 1 : 0), 0);
    let cleaned;
    if (latinCount === tokens.length) {
        cleaned = tokens.map(titleCase).join(' ').trim();
    } else {
        cleaned = tokens.join(' ').trim();
    }
    // If the model returned a generic name like "weapon" or nothing useful,
    // try to derive a better fallback from discovered hints (e.g., "glass shard").
    // Also treat common generic tokens in other languages (e.g., Hebrew "נשק") as non-descriptive.
    const GENERIC_WORDS = new Set([
        'weapon', 'weapons', 'murder weapon', 'unknown', 'item', 'object',
        // Hebrew
        'נשק', 'פריט', 'חפץ', 'כלי', 'אובייקט'
    ]);
    const cleanedLower = String(cleaned || '').toLowerCase();
    const isGeneric = !cleaned || /^weapons?$|^murder\s*weapon$|^unknown$|^item$|^object$/i.test(cleaned) || cleaned.length < 3 || GENERIC_WORDS.has(cleanedLower);
    if (isGeneric) {
        // Use discovered hints to synthesize a concise noun phrase
        if (Array.isArray(discoveredHints) && discoveredHints.length) {
            // pick first meaningful hint and extract up to 3 content words
            const hint = String(discoveredHints.find(h => h && String(h).trim()) || '').replace(/\([^)]*\)/g, ' ');
            let htokens = hint.split(/[^\p{L}\p{N}]+/u).map(t => t.trim()).filter(Boolean).filter(t => !STOP_WORDS.has(t.toLowerCase()));
            if (htokens.length > 3) htokens = htokens.slice(0, 3);
            if (htokens.length) {
                const latinCount2 = htokens.reduce((c, t) => c + (/^[A-Za-z0-9]+$/.test(t) ? 1 : 0), 0);
                const candidate = latinCount2 === htokens.length ? htokens.map(titleCase).join(' ') : htokens.join(' ');
                if (candidate && candidate.length >= 2) return candidate;
            }
        }
        // Last resort friendly fallback. If the original name contained Hebrew
        // characters, return a Hebrew-localized fallback; otherwise return English.
        const hasHebrew = /[\u0590-\u05FF]/.test(String(name));
        return hasHebrew ? 'פריט לא ידוע' : 'Unknown Item';
    }
    return cleaned;
}

function fisherYates(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function pickFew(arr, n) {
    const copy = [...arr];
    const out = [];
    while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    return out;
}

module.exports = { getRecentSettings, sanitizeWeaponName, fisherYates, pickFew, STOP_WORDS, titleCase };
