// Unicode-aware tokenizer with language-specific stopwords
export function unicodeSplit(text: string): string[] {
  if (!text) return [];
  // Split on Unicode word boundaries (captures scripts like Hebrew, Arabic, CJK, Latin)
  // Use \p{L} (letters) and \p{N} (numbers) positive matching to extract tokens.
  // Fallback to basic split if environment doesn't support Unicode property escapes.
  try {
    const re = /\p{L}[\p{L}\p{N}_']*/gu;
    const m = text.match(re);
    return (m || []).map(t => t.trim()).filter(Boolean);
  } catch (_) {
    // Older JS runtimes may not support \p{L}; fall back to split on non-word
    return text.split(/[^\w]+/).map(t => t.trim()).filter(Boolean);
  }
}

const STOP_WORDS: Record<string, Set<string>> = {
  english: new Set(['and','with','of','a','an','the','or','in','on','at','to','for','by','from','into','over','under','above','below','near','through','off','up','down','out','about','as','is','was','were','be','been']),
  french: new Set(['et','avec','de','la','le','les','un','une','ou','dans','sur','à','pour','par','du','des','en','au','aux','chez','ce','ces','se','est','été','être']),
  hebrew: new Set(['של','עם','את','על','לה','אל','שלו','שלי','אתה','את','הוא','היא'])
};

export function tokenize(text: string, lang?: string) {
  const tokens = unicodeSplit(String(text || ''));
  const lower = tokens.map(t => t.toLowerCase());
  const key = (lang || 'english').toLowerCase();
  const stop = STOP_WORDS[key] || STOP_WORDS['english'];
  return lower.filter(t => t && t.length >= 2 && !stop.has(t));
}
