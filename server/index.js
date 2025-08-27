require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { generateScenario, applyScenarioRules } = require('../core');
const { chatWithAI, AI_PROVIDER, GOOGLE_MODEL, OPENAI_MODEL, OLLAMA_MODEL } = require('../src/ai');
const { extractMeaningfulClues } = require('../src/clues');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post('/api/scenario', async (req, res) => {
  try {
    const { language } = req.body || {};
    let scenario = await generateScenario({ language });
    scenario = applyScenarioRules(scenario);
    res.json({ scenario });
  } catch (e) {
    console.error('Error generating scenario:', e && e.stack ? e.stack : e);
    // If this is a scenario-malformed error, try to surface any diagnostics files produced
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
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { system, messages, options } = req.body || {};
    const out = await chatWithAI({ system, messages, options });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/extract-clues', async (req, res) => {
  try {
    const { reply, lastUserText, suspect, scenario, language } = req.body || {};
    const clues = await extractMeaningfulClues({ reply, lastUserText, suspect, scenario, language });
    res.json({ clues });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const START_PORT = Number(process.env.PORT) || 5175;
function startServer(port, attempt = 0) {
  const providerInfo = AI_PROVIDER === 'google'
    ? `${AI_PROVIDER}:${GOOGLE_MODEL}`
    : AI_PROVIDER === 'openai'
      ? `${AI_PROVIDER}:${OPENAI_MODEL}`
      : `ollama:${OLLAMA_MODEL}`;
  const googleKeyStatus = `GOOGLE_API_KEY=${process.env.GOOGLE_API_KEY ? 'set' : 'missing'}`;
  const gptKeyStatus = `OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? 'set' : 'missing'}`;
  const ollamaKeyStatus = `OLLAMA_API_KEY=${process.env.OLLAMA_API_KEY ? 'set' : 'missing'}`;
  const keyStates = `${googleKeyStatus} \n ${gptKeyStatus} \n ${ollamaKeyStatus} \n`;
  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log(`[AI] Provider: ${providerInfo} (${keyStates})`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 5) {
      const next = port + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      setTimeout(() => startServer(next, attempt + 1), 200);
    } else {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  });
}
startServer(START_PORT);
