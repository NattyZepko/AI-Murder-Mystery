const path = require('path');

async function run() {
  const genPath = path.resolve(__dirname, '..', 'src', 'scenarioGenerator.js');
  const gen = require(genPath);
  const languages = ['English', 'Hebrew', 'French'];

  for (const lang of languages) {
    console.log('\n===== Generating scenario for:', lang, '=====\n');
    try {
      const scenario = await gen.generateScenario({ language: lang });
      console.log('PARSED_JSON_BEGIN');
      console.log(JSON.stringify(scenario, null, 2));
      console.log('PARSED_JSON_END');
    } catch (e) {
      console.error('ERROR for', lang, ':', e && e.message ? e.message : String(e));
      if (e && e.stack) console.error(e.stack);
    }
  }
}

run().catch(e => { console.error('Runner fatal error:', e); process.exit(1); });
