require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Also support envData.env at project root if present (overrides .env)
try {
  const altEnv = path.resolve(__dirname, '..', 'envData.env');
  if (fs.existsSync(altEnv)) {
    require('dotenv').config({ path: altEnv, override: true });
  }
} catch (_) { /* ignore */ }

const http = require('http');
const url = require('url');

// Provider selection. Default to Google (Gemini) per request.
const AI_PROVIDER = (process.env.AI_PROVIDER || 'google').toLowerCase();

// OpenAI defaults
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Ollama defaults
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

// Google Gemini defaults
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5-flash';

function httpPostJson(targetUrl, payload) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const data = Buffer.from(JSON.stringify(payload));
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 11434,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(new Error(`Invalid JSON from Ollama: ${e.message}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function chatWithOllama({ model = OLLAMA_MODEL, system, messages, stream = false, options = undefined, keep_alive = '30m' }) {
  try {
    const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const endpoint = `${OLLAMA_HOST.replace(/\/$/, '')}/api/chat`;
  const payload = { model, messages: msgs, stream };
  if (options) payload.options = options;
  if (keep_alive) payload.keep_alive = keep_alive;
  const res = await httpPostJson(endpoint, payload);
    return res; // expected to be { message: { role, content }, ... }
  } catch (err) {
    const hint = `Ensure Ollama is installed, running (ollama serve), and the model is pulled (e.g., ollama pull ${model}).`;
    throw new Error(`Failed to reach Ollama (${err.message}). ${hint}`);
  }
}

async function chatWithOpenAI({ model = OPENAI_MODEL, system, messages, options = {} }) {
  const apiKey = process.env.OPENAI_API_KEY || 'sk-REPLACE_ME_FAKE_KEY';
  // Lazy import to avoid requiring package if not used
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (e) {
    throw new Error('The "openai" package is not installed. Run: npm install openai');
  }
  const client = new OpenAI({ apiKey });
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const payload = {
    model,
    messages: msgs,
    temperature: options?.temperature,
    top_p: options?.top_p,
    // max_tokens can be set via options.max_tokens
    max_tokens: options?.max_tokens,
  };
  const resp = await client.chat.completions.create(payload);
  const choice = resp.choices?.[0]?.message || { role: 'assistant', content: '' };
  return { message: choice };
}

async function chatWithGoogle({ model = GOOGLE_MODEL, system, messages, options = {} }) {
  const apiKey = process.env.GOOGLE_API_KEY || 'AIza-REPLACE_ME_FAKE_KEY';
  let GoogleGenerativeAI;
  try {
    ({ GoogleGenerativeAI } = require('@google/generative-ai'));
  } catch (e) {
    throw new Error('The "@google/generative-ai" package is not installed. Run: npm install @google/generative-ai');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const generationConfig = {
    temperature: options?.temperature,
    topP: options?.top_p,
    maxOutputTokens: options?.max_tokens,
    // Encourage JSON-only outputs when requested
    responseMimeType: options?.response_mime_type,
  };
  const modelObj = genAI.getGenerativeModel({ model, generationConfig, systemInstruction: system });

  // Build chat history and last user message
  const nonSystem = (messages || []).filter(m => m.role !== 'system');
  let lastUser = '';
  if (nonSystem.length && nonSystem[nonSystem.length - 1].role === 'user') {
    lastUser = nonSystem[nonSystem.length - 1].content || '';
  }
  const history = nonSystem.slice(0, Math.max(0, nonSystem.length - 1)).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = modelObj.startChat({ history });
  const resp = await chat.sendMessage(lastUser);
  const text = await resp.response.text();
  return { message: { role: 'assistant', content: text } };
}

async function chatWithAI(args) {
  if (AI_PROVIDER === 'openai') {
    const key = process.env.OPENAI_API_KEY || '';
    const looksPlaceholder = /REPLACE_ME/i.test(key) || key.trim() === '';
    if (looksPlaceholder) {
      // Try transparent fallback to Ollama
      try {
        return await chatWithOllama(args);
      } catch (e) {
        throw new Error('OPENAI_API_KEY missing or placeholder, and Ollama fallback failed: ' + e.message);
      }
    }
    try {
      return await chatWithOpenAI(args);
    } catch (e) {
      const msg = String(e && e.message || '').toLowerCase();
      if (msg.includes('quota') || msg.includes('429') || msg.includes('insufficient')) {
        // Quota or rate issues: fallback to Ollama automatically
        try {
          return await chatWithOllama(args);
        } catch (fallbackErr) {
          throw new Error(`OpenAI failed (${e.message}) and Ollama fallback failed (${fallbackErr.message}).`);
        }
      }
      throw e;
    }
  }
  if (AI_PROVIDER === 'google') {
    const key = process.env.GOOGLE_API_KEY || '';
    const looksPlaceholder = /REPLACE_ME/i.test(key) || key.trim() === '';
    if (looksPlaceholder) {
      // Fallback to Ollama if no key yet
      try { return await chatWithOllama(args); } catch (e) {
        throw new Error('GOOGLE_API_KEY missing or placeholder, and Ollama fallback failed: ' + e.message);
      }
    }
    try {
      return await chatWithGoogle(args);
    } catch (e) {
      // If rate/quota errors, try Ollama fallback
      const msg = String(e && e.message || '').toLowerCase();
      if (msg.includes('quota') || msg.includes('429') || msg.includes('rate')) {
        try { return await chatWithOllama(args); } catch (fallbackErr) {
          throw new Error(`Google failed (${e.message}) and Ollama fallback failed (${fallbackErr.message}).`);
        }
      }
      throw e;
    }
  }
  // default fallback to ollama
  return chatWithOllama(args);
}

module.exports = { chatWithAI, chatWithOllama, AI_PROVIDER, OPENAI_MODEL, OLLAMA_MODEL, GOOGLE_MODEL };
