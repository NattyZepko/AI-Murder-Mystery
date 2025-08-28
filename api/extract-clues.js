const { extractMeaningfulClues } = require('../src/clues');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { reply, lastUserText, suspect, scenario, language } = req.body || {};
        const clues = await extractMeaningfulClues({ reply, lastUserText, suspect, scenario, language });
        return res.status(200).json({ clues });
    } catch (e) {
        console.error('extract-clues error', e && e.stack ? e.stack : e);
        return res.status(500).json({ error: e.message });
    }
};
