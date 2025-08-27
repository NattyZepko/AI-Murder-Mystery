const fs = require('fs');
const path = require('path');

function readEnv(envPath) {
    if (!fs.existsSync(envPath)) return {};
    const raw = fs.readFileSync(envPath, 'utf8');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith('#'));
    const out = {};
    for (const l of lines) {
        const idx = l.indexOf('=');
        if (idx > 0) out[l.slice(0, idx)] = l.slice(idx + 1);
    }
    return out;
}

const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, '.env');
const env = readEnv(envPath);

let ok = true;
console.log('Checking AI provider configuration...');

if ((env.AI_PROVIDER || '').toLowerCase() !== 'google') {
    console.error(`- .env AI_PROVIDER=${env.AI_PROVIDER || '<missing>'} (expected: google)`);
    ok = false;
} else {
    console.log('- .env AI_PROVIDER=google');
}

if (!env.GOOGLE_API_KEY) {
    console.warn('- .env missing GOOGLE_API_KEY (may be intentional)');
} else {
    console.log('- .env has GOOGLE_API_KEY (present)');
}

// Check src/ai.js for default provider
const aiPath = path.join(repoRoot, 'src', 'ai.js');
if (fs.existsSync(aiPath)) {
    const aiSrc = fs.readFileSync(aiPath, 'utf8');
    const m = aiSrc.match(/const AI_PROVIDER = \(process.env.AI_PROVIDER \|\| '([^']+)'\)\.toLowerCase\(\)\;/);
    if (m && m[1].toLowerCase() === 'google') {
        console.log('- src/ai.js default AI_PROVIDER=google');
    } else {
        console.error('- src/ai.js default AI_PROVIDER is NOT google');
        ok = false;
    }
} else {
    console.error('- src/ai.js missing');
    ok = false;
}

// Check package.json has @google/generative-ai
const pkgPath = path.join(repoRoot, 'package.json');
if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    if (deps['@google/generative-ai']) console.log('- package.json has @google/generative-ai');
    else { console.error('- package.json is missing @google/generative-ai'); ok = false; }
} else {
    console.error('- package.json missing'); ok = false;
}

if (!ok) {
    console.error('\nValidation FAILED.');
    process.exit(1);
}
console.log('\nValidation OK: repository configured to use Google API.');
process.exit(0);
