require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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
    let scenario = await generateScenario();
    scenario = applyScenarioRules(scenario);
    res.json({ scenario });
  } catch (e) {
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
    const { reply, lastUserText, suspect, scenario } = req.body || {};
    const clues = await extractMeaningfulClues({ reply, lastUserText, suspect, scenario });
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
