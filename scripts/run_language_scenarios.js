const path = require('path');
// Load .env explicitly so GOOGLE_API_KEY / AI_PROVIDER are available in this script
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function runAll() {
    const genPath = path.resolve(__dirname, '..', 'src', 'scenarioGenerator.js');
    const gen = require(genPath);
    const langs = ['English', 'Hebrew', 'French'];
    for (const lang of langs) {
        console.log(`\n===== Generating scenario for: ${lang} =====`);
        try {
            const scenario = await gen.generateFullScenario(lang);
            console.log('SCENARIO_PARSED_BEGIN');
            console.log(JSON.stringify(scenario, null, 2));
            console.log('SCENARIO_PARSED_END');
            // save sample
            try {
                const samplesDir = path.resolve(__dirname, '..', 'samples');
                if (!require('fs').existsSync(samplesDir)) require('fs').mkdirSync(samplesDir);
                const outFile = path.join(samplesDir, `${lang.replace(/\s+/g, '_')}.json`);
                require('fs').writeFileSync(outFile, JSON.stringify(scenario, null, 2), 'utf8');
                console.log('Saved sample to', outFile);
            } catch (e) { console.log('Failed to save sample:', e && e.message); }
        } catch (e) {
            console.error(`Error generating for ${lang}:`, e && e.message ? e.message : String(e));
        }
    }
}

runAll().catch(e => { console.error('Runner fatal error:', e); process.exit(1); });
