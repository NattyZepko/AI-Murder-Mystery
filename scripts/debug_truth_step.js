const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const fs = require('fs');
const gen = require('../src/scenarioGenerator');

async function run() {
    const samplesDir = path.resolve(__dirname, '..', 'samples');
    const sampleFile = path.join(samplesDir, 'English.json');
    let context = null;
    if (fs.existsSync(sampleFile)) {
        console.log('Using sample:', sampleFile);
        const s = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
        context = {
            title: s.title,
            suspects: s.suspects,
            weapons: s.weapons,
            timeline: s.timeline,
            relationships: s.relationships,
            witnessedEvents: s.witnessedEvents,
            victim: s.victim
        };
    } else {
        console.log('No sample found, generating a full scenario to build context (this will call the AI)...');
        const full = await gen.generateFullScenario('English');
        context = {
            title: full.title,
            suspects: full.suspects,
            weapons: full.weapons,
            timeline: full.timeline,
            relationships: full.relationships,
            witnessedEvents: full.witnessedEvents,
            victim: full.victim
        };
    }

    try {
        console.log('\nCalling generateScenarioStep7Truth with context...');
        const truth = await gen.generateScenarioStep7Truth('English', context);
        console.log('TRUTH RESULT:', JSON.stringify(truth, null, 2));
    } catch (e) {
        console.error('ERROR from truth step:', e && e.message ? e.message : String(e));
        if (e && e.stack) console.error(e.stack);
        // Look for diagnostics files
        try {
            const files = fs.readdirSync(samplesDir).filter(f => f.startsWith('bad_ai_response_')).sort().reverse();
            if (files.length) console.error('Found diagnostics files (most recent first):', files.slice(0, 5).join(', '));
            else console.error('No diagnostics files found in samples/');
        } catch (_) { }
        process.exit(1);
    }
}

run().catch(e => { console.error('Fatal:', e && e.message ? e.message : String(e)); process.exit(1); });
