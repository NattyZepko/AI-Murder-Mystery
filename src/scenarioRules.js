// Scenario normalization and rule enforcement
// - Symmetric alibis among innocents; guilty has no verifiable alibi
// - Some innocents have no motive; guilty always has a motive
// - Every weapon is on/near a suspect; murder weapon on/near the guilty
// - Provide a shared scenario narrative for consistent role-play

function arrayify(x) { return Array.isArray(x) ? x : (x ? [x] : []); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function scrubStr(s, fallback = '') {
  return (typeof s === 'string' && s.trim().length > 0) ? s.trim() : fallback;
}

function ensureIds(scenario) {
  (scenario.suspects || []).forEach((s, i) => {
    if (!s.id) s.id = `suspect_${i + 1}`;
  });
  (scenario.weapons || []).forEach((w, i) => {
    if (!w.id) w.id = `weapon_${i + 1}`;
  });
}

function buildMaps(scenario) {
  const suspectsById = {};
  const suspects = scenario.suspects || [];
  suspects.forEach(s => { if (s && s.id) suspectsById[s.id] = s; });
  return { suspectsById, suspects };
}

function enforceGendersAges(suspects) {
  const genders = ['male', 'female'];
  for (const s of suspects) {
    if (!s || typeof s !== 'object') continue;
    s.gender = scrubStr(s.gender, pick(genders));
    const age = Number.isFinite(s.age) ? s.age : Math.floor(22 + Math.random() * 40);
    s.age = Math.max(18, Math.min(90, age));
  }
}

function enforceMotives(scenario, suspectsById) {
  const guiltyId = scenario?.truth?.guiltySuspectId;
  if (guiltyId && suspectsById[guiltyId]) {
    const g = suspectsById[guiltyId];
    g.motive = scrubStr(g.motive, scenario?.truth?.motiveCore || 'A personal grievance tied to the victim.');
  }
  const innocents = (scenario.suspects || []).filter(s => s && s.id !== guiltyId);
  const anyNoMotive = innocents.some(s => !scrubStr(s.motive));
  if (!anyNoMotive && innocents.length) {
    pick(innocents).motive = '';
  }
}

function enforceWeapons(scenario) {
  const suspects = scenario.suspects || [];
  const guiltyId = scenario?.truth?.guiltySuspectId || null;

  for (const w of (scenario.weapons || [])) {
    if (!w || typeof w !== 'object') continue;
    if (!w.foundOnSuspectId && !w.foundNearSuspectId) {
      const any = suspects.length ? pick(suspects) : null;
      if (any && any.id) w.foundNearSuspectId = any.id;
    }
  }

  if (scenario?.truth?.murderWeaponId && guiltyId) {
    const mw = (scenario.weapons || []).find(w => w && w.id === scenario.truth.murderWeaponId);
    if (mw) {
      mw.foundOnSuspectId = guiltyId;
      mw.foundNearSuspectId = null;
    }
  }
}

function enforceAlibis(scenario, suspectsById) {
  const guiltyId = scenario?.truth?.guiltySuspectId || null;
  const suspects = scenario.suspects || [];

  for (const s of suspects) {
    if (!s || typeof s !== 'object') continue;
    s.alibi = scrubStr(s.alibi, 'Prefers not to say.');
    s.alibiVerifiedBy = arrayify(s.alibiVerifiedBy).filter(id => !!suspectsById[id]);
  }

  if (guiltyId && suspectsById[guiltyId]) {
    suspectsById[guiltyId].alibiVerifiedBy = [];
  }

  for (const s of suspects) {
    if (!s || typeof s !== 'object') continue;
    s.alibiVerifiedBy = s.alibiVerifiedBy.filter(id => id !== guiltyId && !!suspectsById[id]);
  }

  for (const s of suspects) {
    if (!s || typeof s !== 'object') continue;
    if (s.id === guiltyId) continue;
    for (const vId of s.alibiVerifiedBy) {
      const v = suspectsById[vId];
      if (v && v.id !== guiltyId && !v.alibiVerifiedBy.includes(s.id)) {
        v.alibiVerifiedBy.push(s.id);
      }
    }
  }

  const innocents = suspects.filter(s => s && s.id !== guiltyId);
  if (!innocents.some(s => (s.alibiVerifiedBy || []).length > 0) && innocents.length >= 2) {
    innocents[0].alibiVerifiedBy = [innocents[1].id];
    innocents[1].alibiVerifiedBy = [innocents[0].id];
  }
}

function buildSharedStory(scenario) {
  const setting = scrubStr(scenario.setting, 'a secluded cliffside resort');
  const victimName = scrubStr(scenario?.victim?.name, 'an influential philanthropist');
  const tod = scrubStr(scenario?.victim?.timeOfDeath, 'around 21:00');
  const names = (scenario.suspects || []).map(s => s?.name).filter(Boolean);
  const locationExamples = [
  'the grand lobby', 'the marina', 'the rooftop bar', 'the spa corridor',
  'the conference hall', 'the private lounge', 'the service stairwell',
  'the dimly lit wine cellar', 'the abandoned ballroom', 'the underground parking garage',
  'the secluded garden', 'the maintenance tunnels', 'the library reading room',
  'the staff kitchen', 'the penthouse suite', 'the glass atrium',
  'the art gallery wing', 'the hidden storage room', 'the observation deck',
  'the back alley entrance', 'the candlelit chapel', 'the VIP theater box',
];
  const rels = Array.isArray(scenario.relationships) ? scenario.relationships : [];
  const witnesses = Array.isArray(scenario.witnessedEvents) ? scenario.witnessedEvents : [];
  const idToName = id => (scenario.suspects || []).find(s => s.id === id)?.name || id;

  const relLines = rels.slice(0, 5).map(r => {
    const a = idToName(r?.between?.[0]);
    const b = idToName(r?.between?.[1]);
    if (!a || !b) return null;
    const t = r?.type || 'connection';
    const secret = r?.isSecret ? ' (secret)' : '';
    const note = r?.note ? `: ${r.note}` : '';
    return `${a} and ${b} have a ${t}${secret}${note}`;
  }).filter(Boolean);

  const witLines = witnesses.slice(0, 5).map(w => {
    const ws = (w?.witnesses || []).map(idToName).filter(Boolean).join(', ');
    const inv = (w?.involves || []).map(idToName).filter(Boolean).join(', ');
    const t = scrubStr(w?.time, 'earlier');
    const d = scrubStr(w?.description, 'something noteworthy was seen');
    const parts = [`At ${t}, ${d}`];
    if (ws) parts.push(`(witness: ${ws})`);
    if (inv) parts.push(`(involving: ${inv})`);
    return parts.join(' ');
  });

  const lines = [
    `Everyone is attending an event at ${setting}.`,
    `The victim (${victimName}) was last seen alive ${tod}.`,
     `Unusual noises and raised voices were reported near ${pick(locationExamples)}.`,
    `You don't know the cause of death, only the time and place, the police won't tell you how the victim died.`,
    `Each of you interacted with the victim or another suspect earlier in the evening.`,
    `Stick to your claimed alibi times and locations; if you verify someone, your stories align.`,
  ];
  if (names.length) lines.push(`People present include: ${names.join(', ')}.`);
  if (relLines.length) lines.push(`Known ties: ${relLines.join('; ')}.`);
  if (witLines.length) lines.push(`Witnessed events: ${witLines.join(' | ')}.`);
  scenario.sharedStory = lines.join(' ');
}

function applyScenarioRules(inputScenario) {
  const scenario = JSON.parse(JSON.stringify(inputScenario || {}));

  scenario.suspects = Array.isArray(scenario.suspects) ? scenario.suspects : [];
  scenario.weapons = Array.isArray(scenario.weapons) ? scenario.weapons : [];

  ensureIds(scenario);
  const { suspectsById } = buildMaps(scenario);

  enforceGendersAges(scenario.suspects);
  // Ensure consistency with truth: exactly one guilty and one murder weapon
  try {
    const gid = scenario?.truth?.guiltySuspectId;
    if (Array.isArray(scenario.suspects)) {
      scenario.suspects.forEach(s => { if (s && typeof s === 'object') s.isGuilty = Boolean(gid && s.id === gid); });
    }
    const wid = scenario?.truth?.murderWeaponId;
    if (Array.isArray(scenario.weapons)) {
      scenario.weapons.forEach(w => { if (w && typeof w === 'object') w.isMurderWeapon = Boolean(wid && w.id === wid); });
    }
  } catch (_) {}
  enforceMotives(scenario, suspectsById);
  enforceWeapons(scenario);
  enforceAlibis(scenario, suspectsById);
  buildSharedStory(scenario);

  return scenario;
}

module.exports = { applyScenarioRules };
