const { fetchJsonWithRetries } = require('../src/utils/jsonRepair');
const { chatWithAI } = require('../src/ai');

(async () => {
  const language = 'English';
  const murderWeapon = { name: 'Kitchen Knife' };
  const victim = { name: 'Dr. Iris Novak', location: 'conservatory' };
  const weaponName = murderWeapon && murderWeapon.name ? String(murderWeapon.name) : '';
  const tpl = {};
  const langInstr = `Produce all output in English.`;
  const example = `{ "wounds": "Pale skin, blue lips", "foundDescription": "Found slumped over the table with blue lips" }`;
  const system = `You are an assistant that produces short, plausible victim wound descriptions and a concise \"found\" description that match a given murder weapon. Output ONLY a single JSON object with EXACT keys: wounds, foundDescription. Keep values concise (6-20 words). ${langInstr}`;
  const user = `Context: weaponName: ${JSON.stringify(weaponName)}, victimName: ${JSON.stringify(victim.name || '')}, location: ${JSON.stringify(victim.location || '')}. Return ONLY a JSON object that matches this example: ${example}`;
  try {
    const parsed = await fetchJsonWithRetries({ system, user, options: { temperature: 0.6, max_tokens: 200, response_mime_type: 'application/json' }, schemaExample: example, language, retries: 1, partName: 'victim-wounds', callAI: chatWithAI, recentRepliesArray: [] });
    console.log('PARSED:', parsed);
  } catch (e) {
    console.error('ERROR', e && e.stack || e);
  }
})();
