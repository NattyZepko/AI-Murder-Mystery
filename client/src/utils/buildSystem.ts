export function redact(obj: any, keys: string[]) {
  if (!obj || typeof obj !== 'object') return obj;
  const out: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) continue;
    const v: any = (obj as any)[k];
    out[k] = (v && typeof v === 'object') ? redact(v, keys) : v;
  }
  return out;
}

export function buildSystemForSuspect(suspect: any, sc: any, language?: string) {
  const safeSuspect = redact(suspect, ['isGuilty']);
  const safeWeapons = (sc.weapons ?? []).map((w: any) => redact(w, ['isMurderWeapon']));
  const suspectsById: Record<string, any> = Object.fromEntries((sc.suspects ?? []).map((s: any) => [s.id, s]));
  const verifiers = (suspect.alibiVerifiedBy ?? []).map((id: string) => suspectsById[id]).filter(Boolean);
  const weaponsLinked = (sc.weapons ?? []).filter((w: any) => w.foundOnSuspectId === suspect.id || w.foundNearSuspectId === suspect.id);
  const shared = sc.sharedStory || 'Shared account of the evening; keep your story consistent.';
  const langInstr = language && String(language).toLowerCase() !== 'english'
    ? `Produce all responses in ${language}. Return all names, descriptions, and JSON fields in ${language}.`
    : `Produce all responses in English.`;
  const mentionWeaponsInstr = language && String(language).toLowerCase() !== 'english'
    ? `Only mention nearby or accessible weapons when the user asks a direct, non-accusatory question about your possessions or surroundings (for example: "Do you keep anything on you?" or "What's in your coat?"). Do NOT change the subject to weapons, do not volunteer weapon information unprompted, and do not admit guilt. Keep any mention short (one sentence), factual, and in-character. Produce this response in ${language}.`
    : `Only mention nearby or accessible weapons when the user asks a direct, non-accusatory question about your possessions or surroundings (for example: "Do you keep anything on you?" or "What's in your coat?"). Do NOT change the subject to weapons, do not volunteer weapon information unprompted, and do not admit guilt. Keep any mention short (one sentence), factual, and in-character.`;
  const revealRelationshipInstr = language && String(language).toLowerCase() !== 'english'
    ? `If you are aware of a relationship between two other people in the scenario (for example: rivals, lovers, estranged siblings), you may mention one such relationship only when the user directly asks about one of the people involved. Do NOT volunteer relationships unprompted and do NOT invent relationships you are not sure about. Keep the disclosure brief and factual. Produce this response in ${language}.`
    : `If you are aware of a relationship between two other people in the scenario (for example: rivals, lovers, estranged siblings), you may mention one such relationship only when the user directly asks about one of the people involved. Do NOT volunteer relationships unprompted and do NOT invent relationships you are not sure about. Keep the disclosure brief and factual.`;
  return [
    langInstr,
    mentionWeaponsInstr,
    'You are roleplaying as a suspect in a murder mystery.',
    'Stay in character; do not reveal meta info or the culprit.',
    'Avoid stage directions; convey emotion by word choice only.',
    'If the user asks questions unrelated to the murder, the case, or the scenario, respond in-character and gently steer the conversation back to the investigation.',
  'Example of desired behavior regarding weapons (one-shot):',
  'User: Do you keep anything on you?\nSuspect: I usually carry a small flashlight in my coat pocket. Nothing special, just for checking the cellar.\n',
  'Example of desired behavior regarding relationships (one-shot):',
  'User: Do you know anything about Alex?\nSuspect: Alex and Jordan have been rivals at the factory for years — they argue over shifts.\n',
    `Shared scenario: ${shared}`,
    'Context (JSON, safe):',
    JSON.stringify({
      setting: sc.setting,
      victim: sc.victim,
      suspect: safeSuspect,
      weapons: safeWeapons,
      weaponsLinkedToYou: weaponsLinked,
      verifiers: verifiers.map((v: any) => ({ id: v.id, name: v.name, gender: v.gender, age: v.age, alibi: v.alibi })),
      relationships: sc.relationships,
      witnessedEvents: sc.witnessedEvents,
      sharedStory: sc.sharedStory,
    }),
    'Answer as your character. Do not break character.',
  ].join('\n');
}
