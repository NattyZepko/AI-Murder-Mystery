const path = require('path');

async function runHebrewScenario() {
    const genPath = path.resolve(__dirname, '..', 'src', 'scenarioGenerator.js');
    const gen = require(genPath);
    let attempt = 1;
    let lastOutput = null;
    let lastError = null;
    while (true) {
        console.log(`\n===== Attempt ${attempt}: Generating scenario in Hebrew (chunked) =====\n`);
        try {
            // Use the new chunked generator
            const scenario = await gen.generateFullScenario('Hebrew');
            if (scenario && scenario.title && scenario.suspects && scenario.suspects.length > 0 && scenario.truth && scenario.truth.guiltySuspectId) {
                console.log('SUCCESS: Scenario generated!');
                console.log('PARSED_JSON_BEGIN');
                console.log(JSON.stringify(scenario, null, 2));
                console.log('PARSED_JSON_END');
                break;
            } else {
                console.log('Incomplete scenario, requesting fix from AI and retrying...');
                // Print the raw output for debugging, even if null/undefined/empty
                console.log('RAW_AI_OUTPUT_BEGIN');
                try {
                    if (scenario === null) {
                        console.log('null');
                    } else if (typeof scenario === 'undefined') {
                        console.log('undefined');
                    } else if (typeof scenario === 'object' && Object.keys(scenario).length === 0) {
                        console.log('{} (empty object)');
                    } else {
                        console.log(JSON.stringify(scenario, null, 2));
                    }
                } catch (e) {
                    console.log('Error printing scenario:', e);
                }
                console.log('RAW_AI_OUTPUT_END');
                lastOutput = scenario;
            }
        } catch (e) {
            console.error('ERROR:', e && e.message ? e.message : String(e));
            if (e && e.stack) console.error('STACK:', e.stack);
            lastError = e;
        }
        attempt++;
    }
}

runHebrewScenario().catch(e => { console.error('Runner fatal error:', e); process.exit(1); });
