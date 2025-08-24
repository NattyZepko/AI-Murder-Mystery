const fs = require('fs');
const path = require('path');

const logDir = path.resolve(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) { /* ignore */ }
}

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logDir, `session-${runId}.log`);

function write(line) {
  try {
    fs.appendFileSync(logFile, line + '\n', 'utf8');
  } catch (_) { /* ignore */ }
}

function logEvent(type, payload) {
  const ts = new Date().toISOString();
  write(`[${ts}] ${type}: ${payload}`);
}

function logScenario(scenario) {
  const ts = new Date().toISOString();
  write(`[${ts}] SCENARIO_JSON: ${JSON.stringify(scenario)}`);
}

function logUser(subject, text) {
  const ts = new Date().toISOString();
  write(`[${ts}] USER -> ${subject}: ${text}`);
}

function logAI(subject, text) {
  const ts = new Date().toISOString();
  write(`[${ts}] AI(${subject}) -> USER: ${text}`);
}

module.exports = { logEvent, logScenario, logUser, logAI, logFile };
