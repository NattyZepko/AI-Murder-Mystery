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

// List available AI locale languages
app.get('/api/ai-languages', (req, res) => {
  try {
    const { availableAiLanguages } = require('../src/i18n');
    const langs = availableAiLanguages();
    res.json({ languages: langs });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list AI languages' });
  }
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

// Persist client-side failure logs to samples/ for later debugging.
app.post('/api/log-client-error', (req, res) => {
  try {
    const payload = req.body || {};
    const samplesDir = path.resolve(__dirname, '..', 'samples');
    if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });
    const now = new Date();
    // Gather any recent AI diagnostic files (bad_ai_response_*.log) to include in the saved client log
    let aiDiagnostics = [];
    try {
      const files = fs.readdirSync(samplesDir).filter(f => f.startsWith('bad_ai_response_')).sort().reverse();
      const take = Math.min(5, files.length);
      for (let i = 0; i < take; i++) {
        const file = files[i];
        try {
          const full = fs.readFileSync(path.join(samplesDir, file), 'utf8');
          // Truncate very large diagnostics to keep logs manageable
          aiDiagnostics.push({ file, content: String(full).slice(0, 20000) });
        } catch (readErr) {
          aiDiagnostics.push({ file, error: String(readErr && readErr.message ? readErr.message : readErr) });
        }
      }
    } catch (_) { aiDiagnostics = []; }

    const fname = `client_error_${now.toISOString().replace(/[:.]/g, '-')}_${Math.floor(Math.random() * 10000)}.json`;
    const p = path.join(samplesDir, fname);
    // Only persist JSON-serializable payloads; include any AI diagnostics found
    const saved = { receivedAt: now.toISOString(), payload, aiDiagnostics };
    fs.writeFileSync(p, JSON.stringify(saved, null, 2), 'utf8');
    console.log('Saved client failure log to', fname);
    res.json({ ok: true, file: fname, aiDiagnosticsCount: aiDiagnostics.length });
  } catch (e) {
    console.error('Failed to write client failure log:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed to persist client log' });
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
