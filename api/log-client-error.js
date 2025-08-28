const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const payload = req.body || {};
        const samplesDir = path.resolve(__dirname, '..', 'samples');
        if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });
        const now = new Date();
        let aiDiagnostics = [];
        try {
            const files = fs.readdirSync(samplesDir).filter(f => f.startsWith('bad_ai_response_')).sort().reverse();
            const take = Math.min(5, files.length);
            for (let i = 0; i < take; i++) {
                const file = files[i];
                try {
                    const full = fs.readFileSync(path.join(samplesDir, file), 'utf8');
                    aiDiagnostics.push({ file, content: String(full).slice(0, 20000) });
                } catch (readErr) {
                    aiDiagnostics.push({ file, error: String(readErr && readErr.message ? readErr.message : readErr) });
                }
            }
        } catch (_) { aiDiagnostics = []; }

        const fname = `client_error_${now.toISOString().replace(/[:.]/g, '-')}_${Math.floor(Math.random() * 10000)}.json`;
        const p = path.join(samplesDir, fname);
        const saved = { receivedAt: now.toISOString(), payload, aiDiagnostics };
        fs.writeFileSync(p, JSON.stringify(saved, null, 2), 'utf8');
        console.log('Saved client failure log to', fname);
        return res.status(200).json({ ok: true, file: fname, aiDiagnosticsCount: aiDiagnostics.length });
    } catch (e) {
        console.error('Failed to write client failure log:', e && e.message ? e.message : e);
        return res.status(500).json({ error: 'Failed to persist client log' });
    }
};
