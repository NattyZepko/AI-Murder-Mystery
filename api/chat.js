const { chatWithAI } = require('../src/ai');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { system, messages, options } = req.body || {};
        const out = await chatWithAI({ system, messages, options });
        return res.status(200).json(out);
    } catch (e) {
        console.error('chat error', e && e.stack ? e.stack : e);
        return res.status(500).json({ error: e.message });
    }
};
