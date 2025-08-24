---
mode: agent
description: 'Create a game by the description of the user'
tools: ['extensions', 'runTests', 'codebase', 'usages', 'vscodeAPI', 'think', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'openSimpleBrowser', 'fetch', 'findTestFiles', 'searchResults', 'githubRepo', 'runCommands', 'runTasks', 'editFiles', 'runNotebooks', 'search', 'new', 'playwright', 'dbclient-getDatabases', 'dbclient-getTables', 'dbclient-executeQuery', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']

model: 'GPT-4o'
---

Murder Mystery Game Instructions
1. **Game Concept**:

- Create a Text-only, console input/output game.
- The player takes the role of a detective solving a murder case.
- Gameplay is driven by text input and narrative dialogue.

2. **Goals**:

- Each new run generates a fresh hidden scenario:
    * 3–6 suspects (each with mannerisms, backstory, alibi, motive).
    * 2–5 weapons (only one is true murder weapon).
    * A coherent timeline with planted contradictions that can be uncovered via interrogation.
    * Exactly one guilty suspect.
- Menus (main):
    * Instructions
    * Suspect list → Suspect menu (talk until user types back)
    * Clue list
    * Submit conclusion
    * Exit
    * Debug (hidden in release; reveals full truth)
- Non-Goals
    * No graphics, audio, or GUI; no network features.
    * No external services; keep generation self-contained.

3. **Core Game Loop**:

- Main Menu with options: Start Game, Instructions, Exit.
- Gameplay flow:
    * Show case introduction & list of suspects.
    * Allow the player to select a suspect.
    * Interrogate suspects (ask questions, receive answers).
    * Submit a conclusion by accusing a suspect, and selecting a murder weapon.
    * Reveal outcome (correct/incorrect, with explanation only if the user is correct).

4. **NPC Design**:

- Each suspect (NPC) must have:
    * Unique name & background (occupation, personality, relationship to victim).
    * Distinct motive (clear reason they might be guilty).
    * Hidden truth (only one is actually guilty).
- NPCs must:
    * Stay in-character during dialogue.
    * Give truthful but incomplete answers if innocent.
    * Guilty NPC may reveal contradictions under pressure. (must be able to admit it was caught in a lie, and crack under pressure)

5. **Dialogue & Interaction**:

- Support player questions such as:
    * "Where were you at the time of the murder?"
    * "What was your relationship with the victim?"
    * "Did you notice anything unusual?"

- Responses should vary per NPC and reflect their background/motive.

6. **Player Experience**:

* Provide clue tracking (list clues found so far).
* Encourage logical deduction: not all info is useful, some may be misleading.
* Include victory/defeat endings with clear explanations.

7. **Development Guidelines**:

* Keep it text-only (console I/O).
* Write clean, modular code (functions/classes for NPCs, clues, game state).
* Ensure replayability: at least 3–4 suspects with varied motives.

Use simple randomization where possible (e.g., order of dialogue, murderer and murder weapon).

8. **Technical Requirements**:

- Language & Structure:
Use Python or Node.js (pick one and stick with it). Keep code modular:
game.py / game.ts — entry, main loop, menus.
generation.py / generation.ts — scenario generation.
logic.py / logic.ts — interrogation rules, clue extraction, scoring.
models.py / models.ts — dataclasses/interfaces.
io.py / io.ts — pure console I/O helpers.
debug.py / debug.ts — debug printing.
Provide run script (e.g., npm start or python game.py).

9. **Data Model (Schema)**

Represent the hidden truth + public-facing fragments explicitly.
keep track of the following  parameters and reveal them in debugging mode:
-start types-
type Suspect = {
  id: string;
  name: string;
  mannerisms: string[];          // e.g., "avoids eye contact", "fidgets with ring"
  backstory: string;             // concise paragraph
  relationshipToVictim: string;  // e.g., "business partner"
  motive: string;                // what would make them plausible
  alibi: string;                 // claimed alibi (may be true/false)
  knowledge: string[];           // facts they can reveal if asked the right thing
  contradictions: string[];      // potential inconsistencies
  isGuilty: boolean;             // exactly one true
};

type Weapon = {
  id: string;
  name: string;                  // e.g., "candlestick", "letter opener"
  discoveredHints: string[];     // what players can learn about it
  isMurderWeapon: boolean;
};

type TimelineEvent = {
  time: string;                  // "21:15"
  summary: string;               // "Power flicker in hall"
  involvedSuspects: string[];    // suspect ids
};

type Scenario = {
  title: string;
  setting: string;               // "Ashford Manor, stormy night"
  suspects: Suspect[];
  weapons: Weapon[];
  timeline: TimelineEvent[];
  truth: {
    guiltySuspectId: string;
    murderWeaponId: string;
    motiveCore: string;          // the key motive piece
    keyContradictions: string[]; // the 2–4 tells that expose the culprit
  };
};
-end types-

10. **Generation Rules**:

- Create suspects with contrasting voices:
    * Each gets mannerisms (1–3), lexical quirks (word choice), and emotional baseline (nervous, haughty, evasive).
    * Build timeline first, then:
    * Assign alibis; ensure at least one contradiction implicates the guilty suspect.
    * Sprinkle weapon hints across multiple NPCs.
    * Maintain a consistency check: no impossible overlaps (e.g., two places at once) unless it’s the intended contradiction.

11. **Interrogation & Clues**:

Interrogation is free text but processed by simple command parsing:
Recognize intents: WHERE/WHEN (alibi), RELATIONSHIP, MONEY/DEBT, ARGUMENT, WEAPON mentions.
Unknown queries → polite fallback + hint of valid topics.
When a response contains a new clue, add to the Clue list:
Clues should be short, factual (“Collins saw Beatrice arguing at 20:10”).
Also track weapons mentioned so far.
When a response contains a new clue, add to the Clue list:
Clues should be short, factual (for example “Collins saw Beatrice arguing at 20:10”).
Also track weapons mentioned so far.

12. **Menus & Flow**:

*Main Menu*:
    1. Instructions → Print instructions text; wait for Enter → back to Main.
    2. Suspect list → prints numbered suspects; prompt:
        - select <number> or <name> to talk
        - back returns to Main
        - While talking: user types questions. back exits to Suspect list, then back again to Main.
    3. Clue list → print bullets of discovered clues + weapons mentioned so far; Enter to return.
    4. Submit conclusion → prompt:
        - Suspect (name or number)
        - Weapon (name or number)
        - Short reasoning (free text; 1–3 lines)
        - Evaluate with scoring (below). If close enough, print Victory; else print Not yet + generic nudge (no spoilers).
    5. Exit → terminate.
    6. Debug (hidden) → prints full Scenario.
        - truth, every suspect’s isGuilty, alibis, contradictions, and isMurderWeapon. (Omit in release build; behind an env flag or keystroke easter egg.)
    
13. **“Close Enough” Evaluation**:

Score on three axes; sum to 100. Threshold default ≥ 70:
    - Suspect match (0–60):
        * Correct suspect: 60
        * Wrong suspect but shares key contradiction: 20
        * Wrong suspect with overlapping motive only: 10
    - Weapon match (0–25):
        * Correct weapon: 25
        * Weapon mentioned in reasoning but not correct: 10
    - Reasoning overlap (0–15):
        * Keyword overlap with truth.motiveCore or truth.keyContradictions (simple token match / cosine-lite via bag-of-words):
        * ≥2 strong hits: 15
        * 1 strong hit: 8
        * none: 0
If score ≥ threshold → Victory (reveal full solution). Otherwise:
Print: “Not close enough yet. Something about the when or the means doesn’t add up.”
Do not reveal which part is wrong; return to Main Menu.

14. **Debug Mode**:

Toggle via DEBUG=1 env var or hidden command (e.g., typing ~debug at main menu).
Output includes:
Guilty suspect & weapon IDs/names
MotiveCore, KeyContradictions
Full timeline table
For each suspect: alibi truth value, contradictions they trigger, knowledge graph (who knows what within the story).

15. **Instruction text**:

copy and paste the following instructions to the user:
-start instructions-
You are the detective. Interrogate suspects, gather clues, and identify the killer and the murder weapon.

How to play:
- From the Main Menu, choose “Suspect list” to talk to people.
- Ask direct questions (e.g., “Where were you at 21:00?”, “What was your relationship with the victim?”, “Did you see a candlestick?”).
- Visit “Clue list” to review what you’ve learned.
- When ready, choose “Submit conclusion” and name a suspect and weapon, with a short explanation.
- If your conclusion is close enough to the truth, you win. Otherwise, keep investigating.

Tips:
- Contradictions expose lies.
- Not every detail is relevant.
- Different suspects reveal different angles—ask follow-ups.
Type `back` during interrogation to return to the previous menu.
-end instructions-

16. For the purposes of game building, ask the user which tools they would like to use if you think multiple fit, and instruct them how to install or download whatever is needed to create this game.
