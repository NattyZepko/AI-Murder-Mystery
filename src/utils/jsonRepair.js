const fs = require('fs');
const path = require('path');

// Quick heuristic fixer for common, simple JSON malformations (truncated endings,
// trailing commas, unbalanced braces/brackets/quotes).
function attemptQuickFixJsonString(content) {
  if (!content || typeof content !== 'string') return content;
  let s = String(content).trim();
  if (/^```/.test(s)) {
    const firstNl = s.indexOf('\n');
    if (firstNl !== -1) s = s.slice(firstNl + 1);
    if (s.endsWith('```')) s = s.slice(0, -3);
    s = s.trim();
  }
  try { s = s.replace(/,\s*([}\]])/g, '$1'); } catch (_) {}
  try {
    const openBraces = (s.match(/{/g) || []).length;
    const closeBraces = (s.match(/}/g) || []).length;
    const openArr = (s.match(/\[/g) || []).length;
    const closeArr = (s.match(/\]/g) || []).length;
    if (openArr > closeArr) s = s + ']'.repeat(openArr - closeArr);
    if (openBraces > closeBraces) s = s + '}'.repeat(openBraces - closeBraces);
  } catch (_) {}
  try {
    const quotes = (s.match(/"/g) || []).length;
    if (quotes % 2 === 1) s = s + '"';
  } catch (_) {}
  return s;
}

function recoverJsonByTrimming(content) {
  if (!content || typeof content !== 'string') return null;
  const s = String(content);
  const firstArr = s.indexOf('[');
  if (firstArr >= 0) {
    for (let end = s.length - 1; end > firstArr; end--) {
      const slice = s.slice(firstArr, end + 1);
      try {
        const attempt = attemptQuickFixJsonString(slice);
        return JSON.parse(attempt);
      } catch (_) { }
    }
  }
  const firstObj = s.indexOf('{');
  if (firstObj >= 0) {
    for (let end = s.length - 1; end > firstObj; end--) {
      const slice = s.slice(firstObj, end + 1);
      try {
        const attempt = attemptQuickFixJsonString(slice);
        return JSON.parse(attempt);
      } catch (_) { }
    }
  }
  return null;
}

function parseJsonLines(content) {
  if (!content || typeof content !== 'string') return null;
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const objs = [];
  for (const line of lines) {
    if (!line.startsWith('{') && !line.startsWith('[')) continue;
    try {
      const fixed = attemptQuickFixJsonString(line);
      const parsed = JSON.parse(fixed);
      if (parsed && typeof parsed === 'object') objs.push(parsed);
    } catch (_) {
      let recovered = null;
      for (let end = line.length - 1; end > 0; end--) {
        try {
          const attempt = attemptQuickFixJsonString(line.slice(0, end + 1));
          const parsed = JSON.parse(attempt);
          if (parsed && typeof parsed === 'object') { recovered = parsed; break; }
        } catch (_) { }
      }
      if (recovered) objs.push(recovered);
    }
  }
  return objs.length ? objs : null;
}

function parseJsonContent(content) {
  if (!content || typeof content !== 'string') throw new Error('No content to parse');
  content = String(content).trim();
  if (/^```/.test(content)) {
    const firstNl = content.indexOf('\n');
    if (firstNl !== -1) content = content.slice(firstNl + 1);
    if (content.endsWith('```')) content = content.slice(0, -3);
    content = content.trim();
  }
  try { return JSON.parse(content); } catch (_) { }
  const firstObj = content.indexOf('{');
  const lastObj = content.lastIndexOf('}');
  const firstArr = content.indexOf('[');
  const lastArr = content.lastIndexOf(']');
  if (firstArr >= 0 && lastArr > firstArr) {
    try { return JSON.parse(content.slice(firstArr, lastArr + 1)); } catch (_) { }
  }
  if (firstObj >= 0 && lastObj > firstObj) {
    try { return JSON.parse(content.slice(firstObj, lastObj + 1)); } catch (_) { }
  }
  const recovered = recoverJsonByTrimming(content);
  if (recovered !== null) return recovered;
  throw new Error('Unable to parse JSON from AI content');
}

// Fetch JSON from an AI call with retries and optional repairs.
// callAI: async function({ system, messages, options }) -> { message: { content } }
async function fetchJsonWithRetries({ system, user, options = {}, schemaExample = '', language = 'English', retries = 2, partName = 'part', callAI, recentRepliesArray = null }) {
  if (typeof callAI !== 'function') throw new Error('fetchJsonWithRetries requires callAI function');
  const call = async (sys, usr, opts) => await callAI({ system: sys, messages: [{ role: 'user', content: usr }], options: opts });
  let res = await call(system, user, options);
  let content = String(res.message?.content ?? '').trim();
  try {
    if (recentRepliesArray && Array.isArray(recentRepliesArray)) {
      recentRepliesArray.unshift({ partName, ts: Date.now(), content: String(content).slice(0, 20000) });
      if (recentRepliesArray.length > 20) recentRepliesArray.length = 20;
    }
  } catch (_) { }
  const originalContent = content;
  const repairHistory = [{ type: 'initial', content: originalContent }];
  // Quick local sanitization first
  try {
    const attempt = attemptQuickFixJsonString(content);
    if (attempt !== content) {
      repairHistory.push({ type: 'quickfix-before-parse', content: attempt });
      try { return parseJsonContent(attempt); } catch (_) {}
    }
  } catch (_) {}
  // Try JSONL / concat fallback
  try {
    const jsonl = parseJsonLines(content);
    if (jsonl && jsonl.length) return jsonl;
  } catch (_) {}
  try { return parseJsonContent(content); } catch (e) {
    for (let i = 0; i < retries; i++) {
      const repairSystem = `You are a JSON fixer. The user requested a specific JSON for the ${partName}. Produce ONLY the corrected JSON, nothing else. Keys must match the schema and remain in English; textual VALUES should be in ${language}.`;
      const repairUser = `The assistant previously replied with the following content which failed to parse as JSON:\n---\n${String(content).slice(0, 4000)}\n---\nPlease return ONLY the corrected JSON that matches this example/schema:\n${schemaExample}`;
      const repairOpts = Object.assign({}, options, { temperature: 0.0, max_tokens: Math.min(1200, (options.max_tokens || 800)) });
      const repairRes = await call(repairSystem, repairUser, repairOpts);
      content = String(repairRes.message?.content ?? '').trim();
      repairHistory.push({ type: `repair-${i + 1}`, content });
      try {
        const attempt2 = attemptQuickFixJsonString(content);
        return parseJsonContent(attempt2);
      } catch (_) { }
      try { return parseJsonContent(content); } catch (_) { }
    }
    const quick = attemptQuickFixJsonString(content);
    try { return parseJsonContent(quick); } catch (_) { }
    // Save diagnostics if possible
    try {
      const samplesDir = path.resolve(__dirname, '..', 'samples');
      if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });
      const fn = path.resolve(samplesDir, `bad_ai_response_${partName.replace(/[^a-z0-9_-]/gi, '')}_${Date.now()}.log`);
      const dump = [];
      dump.push(`PART: ${partName}`);
      dump.push(`SCHEMA EXAMPLE: \n${schemaExample}\n`);
      dump.push('=== ORIGINAL ===');
      dump.push(originalContent || '');
      dump.push('\n=== REPAIRS ===');
      repairHistory.forEach(r => { dump.push(`--- ${r.type} ---`); dump.push(r.content || ''); });
      fs.writeFileSync(fn, dump.join('\n\n'), 'utf8');
    } catch (_) { }
    throw new Error(`Failed to parse ${partName} after ${retries + 1} attempts.`);
  }
}

module.exports = { attemptQuickFixJsonString, recoverJsonByTrimming, parseJsonLines, parseJsonContent, fetchJsonWithRetries };
