export function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Use Unicode-aware regex with \p{L} and \p{N} to match tokens in non-Latin scripts.
export function colorizeText({ text, weaponKeywordMap = {}, suspectNameToColor = {}, suspectTokenToColor = {} }: { text: string; weaponKeywordMap?: Record<string, string[]>; suspectNameToColor?: Record<string, string>; suspectTokenToColor?: Record<string, string> }) {
  let out = text;
  const outline = 'text-shadow: -0.5px -0.5px 0 #000000ff, 0.5px -0.5px 0 #000000ff, -0.5px 0.5px 0 #000000ff, 0.5px 0.5px 0 #000000ff;';
  const weaponNames = Object.keys(weaponKeywordMap).filter(Boolean);
  if (weaponNames.length) {
    // match full weapon names (escape and sort by length)
    const pattern = new RegExp(`(${weaponNames.map(escapeRe).sort((a, b) => b.length - a.length).join('|')})`, 'giu');
    out = out.replace(pattern, (m) => `<span style="color:#b58900;${outline}">${m}</span>`);
  }
  const weaponTokens = Array.from(new Set(Object.values(weaponKeywordMap).flat())).filter(Boolean);
  if (weaponTokens.length) {
    const pattern = new RegExp(`(${weaponTokens.map(escapeRe).sort((a, b) => b.length - a.length).join('|')})`, 'giu');
    out = out.replace(pattern, (m) => `<span style="color:#b58900;${outline}">${m}</span>`);
  }
  const suspectNames = Object.keys(suspectNameToColor).filter(Boolean);
  if (suspectNames.length) {
    const pattern = new RegExp(`(${suspectNames.map(escapeRe).sort((a, b) => b.length - a.length).join('|')})`, 'giu');
    out = out.replace(pattern, (m) => {
      const matchName = suspectNames.find(n => n.toLowerCase() === m.toLowerCase());
      const color = matchName ? suspectNameToColor[matchName] : '#dc2626';
      return `<span style="color:${color};${outline}">${m}</span>`;
    });
  }
  const suspectTokens = Object.keys(suspectTokenToColor).filter(Boolean);
  if (suspectTokens.length) {
    const pattern = new RegExp(`(${suspectTokens.map(escapeRe).sort((a, b) => b.length - a.length).join('|')})`, 'giu');
    out = out.replace(pattern, (m) => {
      const key = m.toLowerCase();
      const color = suspectTokenToColor[key] || '#dc2626';
      return `<span style="color:${color};${outline}">${m}</span>`;
    });
  }
  return out;
}
