module.exports = (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return res.status(200).json({ ok: true, env: process.env.NODE_ENV || 'production' });
};
