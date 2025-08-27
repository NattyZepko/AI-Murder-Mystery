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

export function buildSystemForSuspect(suspect: any, sc: any) {
  const safeSuspect = redact(suspect, ['isGuilty']);
  const safeWeapons = (sc.weapons ?? []).map((w: any) => redact(w, ['isMurderWeapon']));
  const suspectsById: Record<string, any> = Object.fromEntries((sc.suspects ?? []).map((s: any) => [s.id, s]));
  const verifiers = (suspect.alibiVerifiedBy ?? []).map((id: string) => suspectsById[id]).filter(Boolean);
  const weaponsLinked = (sc.weapons ?? []).filter((w: any) => w.foundOnSuspectId === suspect.id || w.foundNearSuspectId === suspect.id);
  const shared = sc.sharedStory || 'Shared account of the evening; keep your story consistent.';
  return [
    'You are roleplaying as a suspect in a murder mystery.',
    'Stay in character; do not reveal meta info or the culprit.',
    'Avoid stage directions; convey emotion by word choice only.',
    'If the user asks questions unrelated to the murder, the case, or the scenario, respond in-character and gently steer the conversation back to the investigation.',
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
