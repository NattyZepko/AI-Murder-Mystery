const fs = require('fs');
const path = require('path');

const AI_LOCALES_DIR = path.resolve(__dirname, 'locales', 'ai');

function _normalizeKey(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase();
}

function normalizeLanguage(lang = 'English') {
  const k = _normalizeKey(lang || 'English');
  const map = {
    'en': 'English', 'english': 'English',
    'he': 'Hebrew', 'hebrew': 'Hebrew', 'עברית': 'Hebrew',
    'fr': 'French', 'french': 'French', 'francais': 'French', 'français': 'French',
    'de': 'German', 'german': 'German', 'deutsch': 'German',
    'es': 'Spanish', 'spanish': 'Spanish', 'español': 'Spanish'
  };
  return map[k] || (lang && String(lang).length ? String(lang) : 'English');
}

function availableAiLanguages() {
  try {
    if (!fs.existsSync(AI_LOCALES_DIR)) return ['English'];
    return fs.readdirSync(AI_LOCALES_DIR)
      .filter(f => f.toLowerCase().endsWith('.json'))
      .map(f => path.basename(f, '.json'))
      .filter(Boolean);
  } catch (e) {
    return ['English'];
  }
}

function loadAiTemplate(language = 'English') {
  try {
    const name = normalizeLanguage(language || 'English');
    const file = path.resolve(AI_LOCALES_DIR, `${name}.json`);
    if (fs.existsSync(file)) {
      const txt = fs.readFileSync(file, 'utf8');
      return JSON.parse(txt);
    }
    // fallback to English if missing
    const fallback = path.resolve(AI_LOCALES_DIR, 'English.json');
    if (fs.existsSync(fallback)) return JSON.parse(fs.readFileSync(fallback, 'utf8'));
  } catch (e) {
    // swallow and return null, caller will fallback
  }
  return null;
}

module.exports = { normalizeLanguage, availableAiLanguages, loadAiTemplate };
