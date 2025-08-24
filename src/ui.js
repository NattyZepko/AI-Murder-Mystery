// UI helpers: colors and screen control
const COLOR = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function clearScreen() {
  if (typeof console.clear === 'function') console.clear();
  try { process.stdout.write('\x1Bc'); } catch (_) {}
}

module.exports = { COLOR, clearScreen };
