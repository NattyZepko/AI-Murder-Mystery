const fs = require('fs');
const path = require('path');
const { generateScenario, applyScenarioRules } = require('../core');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { language } = req.body || {};
        let scenario = await generateScenario({ language });
        scenario = applyScenarioRules(scenario);
        return res.status(200).json({ scenario });
    } catch (e) {
        console.error('Error generating scenario:', e && e.stack ? e.stack : e);
        try {
            const msg = String(e && e.message ? e.message : '').toLowerCase();
            if (msg.includes('scenario malformed') || msg.includes('could not resolve a guilty suspect') || msg.includes('missing truth')) {
                const samplesDir = path.resolve(__dirname, '..', 'samples');
                if (fs.existsSync(samplesDir)) {
                    const files = fs.readdirSync(samplesDir).filter(f => f.startsWith('bad_ai_response_')).sort().reverse();
                    if (files.length) {
                        const recent = files[0];
                        const p = path.join(samplesDir, recent);
                        try {
                            const txt = fs.readFileSync(p, 'utf8');
                            console.error('Found diagnostics file for malformed scenario:', recent);
                            console.error(String(txt).slice(0, 8000));
                            return res.status(500).json({ error: e.message, diagnosticsFile: recent, diagnosticsPreview: String(txt).slice(0, 2000) });
                        } catch (readErr) {
                            console.error('Failed to read diagnostics file:', readErr && readErr.message ? readErr.message : readErr);
                        }
                    }
                }
            }
        } catch (_) { }
        return res.status(500).json({ error: e.message });
    }
};
