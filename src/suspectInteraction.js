const readline = require('readline');
const { extractMeaningfulClues } = require('./clues');
const { COLOR } = require('./ui');
const { KEYS, TEXT } = require('./constants');

function createSuspectInteractor({ rl, scenario, lockInput, unlockInput, discoveredClues, mentionedWeapons, logUser, logAI, chatWithAI }) {
  return function interactWithSuspect(suspect) {
    console.log(TEXT.INTERACTION.INTRO(suspect.name, suspect.gender || 'unknown', suspect.age ?? 'N/A'));
  const weaponsList = (scenario.weapons || []).map(w => w.name).join(', ');
  const allSuspects = (scenario.suspects || []).map(s => `${s.name}`).join(', ');
  const suspectsById = Object.fromEntries((scenario.suspects || []).map(s => [s.id, s]));
  const verifiers = Array.isArray(suspect.alibiVerifiedBy)
    ? suspect.alibiVerifiedBy.map(id => suspectsById[id]).filter(Boolean)
    : [];
  const idToName = (id) => (suspectsById[id]?.name || id);
  const verifiersDetail = verifiers.length
    ? verifiers.map(v => {
        const verifiesNames = Array.isArray(v.alibiVerifiedBy) && v.alibiVerifiedBy.length
          ? v.alibiVerifiedBy.map(idToName).join(', ')
          : '';
        return `- ${v.name} (${v.gender || 'unknown'}, ${v.age ?? 'N/A'}) | Alibi: ${v.alibi}${verifiesNames ? ` | They are verified by: ${verifiesNames}` : ''}`;
      }).join('\n')
    : '(none)';

  // Build safe JSON payloads (avoid revealing spoilers like isGuilty / isMurderWeapon)
  const safeSuspectData = (() => {
    const { isGuilty, ...rest } = suspect || {};
    return JSON.stringify(rest, null, 2);
  })();
  const safeWeaponsArr = (scenario.weapons || []).map(w => {
    const { isMurderWeapon, ...rest } = w || {};
    return rest;
  });
  const safeWeaponsJson = JSON.stringify(safeWeaponsArr, null, 2);
  const verifiersSafe = verifiers.map(v => {
    const { isGuilty, ...rest } = v || {};
    return rest;
  });
  const verifiersSafeJson = JSON.stringify(verifiersSafe, null, 2);
  const onYou = (scenario.weapons || []).filter(w => w.foundOnSuspectId === suspect.id).map(w => w.name);
  const nearYou = (scenario.weapons || []).filter(w => w.foundNearSuspectId === suspect.id).map(w => w.name);
  const relationships = Array.isArray(scenario.relationships) ? scenario.relationships : [];
  const witnessedEvents = Array.isArray(scenario.witnessedEvents) ? scenario.witnessedEvents : [];
  const idToNameLocal = (id) => (suspectsById[id]?.name || id);
  const myRels = relationships
    .filter(r => Array.isArray(r?.between) && (r.between[0] === suspect.id || r.between[1] === suspect.id))
    .map(r => {
      const other = r.between[0] === suspect.id ? r.between[1] : r.between[0];
      return `${suspect.name} ↔ ${idToNameLocal(other)} (${r.type}${r.isSecret ? ', secret' : ''}${r.note ? `: ${r.note}` : ''})`;
    });
  const seenEvents = witnessedEvents
    .filter(w => Array.isArray(w?.witnesses) && w.witnesses.includes(suspect.id))
    .map(w => `${w.time ? w.time + ' - ' : ''}${w.description}`);
  const system = `You are roleplaying as the suspect in a murder mystery.
Persona: ${suspect.persona || ''}
Name: ${suspect.name}
Gender: ${suspect.gender || 'unknown'}
Age: ${suspect.age ?? 'unknown'}
Relationship to victim: ${suspect.relationshipToVictim}
Motive: ${suspect.motive}
Claimed alibi: ${suspect.alibi}
Known mannerisms: ${(suspect.mannerisms || []).join(', ')}
Quirks: ${(suspect.quirks || []).join(', ')}
Catchphrase: ${suspect.catchphrase || ''}
Known contradictions: ${(suspect.contradictions || []).join('; ')}
Knowledge: ${(suspect.knowledge || []).join('; ')}
Weapons in play: ${weaponsList}
Other suspects you know about: ${allSuspects}
Your relationships: ${myRels.length ? myRels.join(' | ') : '(none)'}
Events you personally witnessed: ${seenEvents.length ? seenEvents.join(' | ') : '(none)'}
Weapons associated with you:
- On you: ${onYou.length ? onYou.join(', ') : '(none)'}
- Near you: ${nearYou.length ? nearYou.join(', ') : '(none)'}
People who verify your alibi (with their alibis):
${verifiersDetail}
---
Suspect data (JSON):
${safeSuspectData}
---
Weapons data (JSON):
${safeWeaponsJson}
---
Alibi verifiers (JSON):
${verifiersSafeJson}
Rules:
- Stay in character and answer concisely in first person. Do not talk about being an AI, or being given commands.
- If innocent, be truthful but incomplete, try to be helpful, and don't stray from the topic.
- If guilty, be evasive; subtle contradictions can slip.
- If the user is right, consider their perspective but maintain your character.
- If guilty, then argue back when the user is right. Try to deflect blame or introduce doubt.
- If innocent, defend your position but avoid outright lies. Consider the information you have.
- Maintain a strong emotional tone that matches your persona's age and gender (e.g., angry, sad, scared, arrogant, calm, nervous) and let it color your word choice and manner.
- Do not include stage directions or behavior descriptions (no asterisks like *sighs*, no parenthetical actions). Let emotion be implied through word choice and rhythm.
- Weave mentions of the weapons when relevant; offer opinions or observations about them.
- Occasionally reference other suspects by name and, if plausible, express suspicion or blame—especially to deflect if you're guilty.
- If you are the murderer, you know you did it and will deny it unless the user cornered you with contradictions.
- If you have an alibi, bring it up only when asked about it, and be prepared to provide details.
- Keep responses short (1-3 sentences). Avoid rambling.`;

    const messages = [{ role: 'system', content: system }];
    return new Promise((resolve) => {
      const promptLoop = () => {
        rl.question('> ', async (q) => {
        const text = String(q).trim();
        if (text.toLowerCase() === KEYS.BACK || text.toLowerCase() === KEYS.BACK_SHORT) {
          // return to caller to show suspects/menu there
          console.log('');
            return resolve();
        }
        if (!text) return promptLoop();
        // Rewrite the just-entered line as a blue "You: ..." line
        try {
          process.stdout.write('\x1b[1A'); // up 1
          process.stdout.write('\x1b[2K'); // clear line
          process.stdout.write('\r');
        } catch (_) {}
        console.log(`${COLOR.blue}You: ${text}${COLOR.reset}`);
        try { logUser(suspect.name, text); } catch (_) {}
        messages.push({ role: 'user', content: text });
        try {
          lockInput();
          process.stdout.write(`\n${TEXT.INTERACTION.THINKING}`);
          const res = await chatWithAI({ messages, options: { temperature: 0.6, top_p: 0.9, max_tokens: 150 } });
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          let reply = res.message?.content || '(no response)';
      // Colorize weapon mentions (full names and significant partial tokens) in YELLOW
          try {
            const weapons = (scenario.weapons || []).map(w => w.name).filter(Boolean);
            if (weapons.length) {
              // 1) Highlight full weapon names as whole words if possible
              const escapedFull = weapons.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
              if (escapedFull.length) {
                const fullRegex = new RegExp(`\\b(${escapedFull.join('|')})\\b`, 'gi');
                reply = reply.replace(fullRegex, (m) => {
                  try { if (mentionedWeapons) mentionedWeapons.add(m); } catch (_) {}
                  return `${COLOR.yellow}${m}${COLOR.reset}${COLOR.green}`;
                });
              }
              // 2) Highlight meaningful partial tokens (length >= 3, exclude stopwords)
              const stop = new Set(['the','a','an','and','of','with','to','in','on','for','at','by','from','as','is','was','were','be','been']);
              const tokens = Array.from(new Set(weapons.flatMap(n => n.split(/[^a-zA-Z0-9]+/))
                .map(t => t.toLowerCase())
                .filter(t => t && t.length >= 3 && !stop.has(t))));
              if (tokens.length) {
                const escTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                // Match whole words only to avoid unrelated substrings
                const tokenRegex = new RegExp(`\\b(${escTokens.join('|')})\\b`, 'gi');
                reply = reply.replace(tokenRegex, (m) => {
                  try {
                    const lower = m.toLowerCase();
                    (scenario.weapons || []).forEach(w => {
                      const parts = String(w?.name || '').toLowerCase().split(/[^a-zA-Z0-9]+/).filter(Boolean);
                      if (parts.includes(lower)) {
                        if (mentionedWeapons) mentionedWeapons.add(w.name);
                      }
                    });
                  } catch (_) {}
                  return `${COLOR.yellow}${m}${COLOR.reset}${COLOR.green}`;
                });
              }
            }
          } catch (_) {}
          // Colorize any mention of other suspects' names in RED to signal interrogable characters (applied last for precedence)
          try {
            const names = (scenario.suspects || []).map(s => s.name).filter(n => n && n !== suspect.name);
            if (names.length) {
              // Replace full word matches only
              const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
              const nameRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
              reply = reply.replace(nameRegex, (m) => `${COLOR.red}${m}${COLOR.reset}${COLOR.green}`);
            }
          } catch (_) {}
          console.log(`\n${suspect.name}: ${COLOR.green}${reply}${COLOR.reset}\n`);
          try { logAI(suspect.name, reply); } catch (_) {}
          const aiClues = await extractMeaningfulClues({ reply, lastUserText: text, suspect, scenario });
          aiClues.forEach(c => {
            if (!discoveredClues.some(d => d.subject === suspect.name && d.note === c.note)) {
              discoveredClues.push({ type: c.type, subject: suspect.name, note: c.note });
            }
          });
          messages.push({ role: 'assistant', content: reply });
        } catch (e) {
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          console.log(`${TEXT.INTERACTION.AI_ERROR_PREFIX}${e.message}`);
        } finally {
          unlockInput();
        }
        return promptLoop();
      });
      };
      promptLoop();
    });
  };
}

// Redact sensitive information from an object
function redact(obj, forbiddenKeys = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (forbiddenKeys.includes(k)) continue;
    const v = obj[k];
    out[k] = (v && typeof v === 'object') ? redact(v, forbiddenKeys) : v;
  }
  return out;
}

function buildInteractionSystemPrompt(suspect, scenario) {
  const suspects = scenario.suspects || [];
  const suspectsById = Object.fromEntries(suspects.map(s => [s.id, s]));
  const verifiers = (suspect.alibiVerifiedBy || [])
    .map(id => suspectsById[id])
    .filter(Boolean);

  // Verifier details include their own alibi and who verifies them (by name)
  const verifierDetails = verifiers.map(v => ({
    id: v.id,
    name: v.name,
    gender: v.gender,
    age: v.age,
    alibi: v.alibi,
    verifiedBy: (v.alibiVerifiedBy || []).map(id => suspectsById[id]?.name).filter(Boolean),
  }));

  // Weapons linked to the current suspect (on/near)
  const weapons = scenario.weapons || [];
  const weaponsLinkedToSuspect = weapons.filter(w =>
    w.foundOnSuspectId === suspect.id || w.foundNearSuspectId === suspect.id
  );

  // Safe JSON payloads (no spoilers like isGuilty/isMurderWeapon)
  const safeSuspect = redact(suspect, ['isGuilty']);
  const safeWeapons = (weapons || []).map(w => redact(w, ['isMurderWeapon']));
  const safeVerifiers = verifierDetails;
  const relationships = Array.isArray(scenario.relationships) ? scenario.relationships : [];
  const witnessedEvents = Array.isArray(scenario.witnessedEvents) ? scenario.witnessedEvents : [];

  const sharedStory = scenario.sharedStory || 'You all share a consistent account of the evening’s setting and timeline.';

  return [
    'You are roleplaying as a suspect in a murder mystery.',
    'Stay in character. Do not reveal meta info or the true culprit.',
    'Keep your story consistent with the shared scenario and your alibi.',
    'If your alibi is verified by others, your account should align with theirs.',
    `Shared scenario for all suspects: ${sharedStory}`,
    'Context (JSON, safe, no spoilers):',
    JSON.stringify({
      setting: scenario.setting,
  timeOfDeath: scenario?.victim?.timeOfDeath,
      victim: scenario.victim,
      suspect: safeSuspect,
      weapons: safeWeapons,
      weaponsLinkedToYou: weaponsLinkedToSuspect.map(w => redact(w, ['isMurderWeapon'])),
      verifiers: safeVerifiers,
      relationships,
      witnessedEvents
    }, null, 2),
  ].join('\n');
}

async function startSuspectConversation(suspect, scenario, ai) {
  const system = buildInteractionSystemPrompt(suspect, scenario);

  // If you already use TEXT.INTERACTION.INTRO, keep it. Otherwise, inline like this:
  const intro = `\nYou are now speaking with ${suspect.name} (${suspect.gender}, ${suspect.age}). Type your question. Type 'back' to return.`;

  const messages = [
    { role: 'user', content: 'Greet the detective and wait for their questions.' }
  ];

  const aiResp = await ai.chatWithAI({
    system,
    messages,
    options: {
      temperature: 0.8,
      top_p: 0.95,
      max_tokens: 400,
    }
  });

  return { intro, openingLine: aiResp.message?.content || '' };
}

module.exports = { createSuspectInteractor, startSuspectConversation };
