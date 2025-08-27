const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { chatWithAI, AI_PROVIDER } = require('../src/ai');

(async () => {
    console.log('AI_PROVIDER=', AI_PROVIDER);
    console.log('GOOGLE_API_KEY present=', !!process.env.GOOGLE_API_KEY);
    try {
        const res = await chatWithAI({
            system: 'You are a tester. Reply with a short JSON object {"ok": true}',
            messages: [{ role: 'user', content: 'Please return ONLY the JSON object: {"ok": true}' }],
            options: { temperature: 0.0, max_tokens: 100, response_mime_type: 'application/json' }
        });
        console.log('REPLY:', String(res.message?.content || '').slice(0, 2000));
    } catch (e) {
        console.error('ERROR:', e && e.message ? e.message : String(e));
        if (e && e.stack) console.error(e.stack);
        process.exit(1);
    }
})();
