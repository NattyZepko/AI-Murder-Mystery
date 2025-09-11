# AI Murder Mystery — Presentation Deck

A short speaker deck and script for presenting the AI Murder Mystery project.

---

## Slide 1 — Title

AI Murder Mystery

Procedural, LLM-driven detective game (Node.js + React)

Speaker notes:
Say: "Today I'll present AI Murder Mystery — a procedural, LLM-driven detective game built with Node.js and an optional React UI. Players interrogate AI role‑played suspects, collect extracted clues, and submit an accusation. I'll cover what it is, how it works, show a demo flow, and explain how to extend or debug it."

---

## Slide 2 — Elevator pitch (30s)

- Text-first detective experience using large language models
- Generates victim, suspects, motives, weapons, timeline
- Player interrogates suspects; system extracts and stores clues automatically

Speaker notes:
Say: "In short: the project generates a murder scenario and uses language models to role‑play suspects. As you interrogate them, the game automatically extracts meaningful clues from AI replies and builds a case for the player to solve."

---

## Slide 3 — Key features

- Procedural scenario generation (victim, suspects, timeline, red herrings)
- Suspect roleplay via configurable system prompts
- Automatic clue extraction and JSON repair for robust parsing
- Pluggable AI provider adapter (OpenAI / Google / Ollama fallback)
- CLI and optional React web UI

Speaker notes:
Say: "Highlights include procedural generation of complete scenarios, configurable suspect prompts for varied roleplay, structured clue extraction for reliable parsing, and a provider adapter so models can be swapped or fall back to local Ollama. The game runs in CLI or via a React front end."

---

## Slide 4 — High-level architecture

- Scenario generator: `src/scenarioGenerator.js`
- AI adapter: `src/ai.js` (single interface for all providers)
- Suspect interactor: `src/suspectInteraction.js`
- Clue extraction: `src/clues.js` (+ `api/extract-clues.js`)
- Game loop / submission: `src/gameLogic.js`
- React UI: `client/src` (SubmitPanel, buildSystem, main entry)

Speaker notes:
Say: "Architecturally, scenario generation, suspect prompts, and the game loop live in src. AI calls are centralized through `src/ai.js` so switching providers is straightforward. Suspect chats are created by src/suspectInteraction.js; every reply is processed by `src/clues.js` which extracts structured clues. The client folder contains the optional React UI."

---

## Slide 5 — Runtime flow (step-by-step)

- Generate scenario → produce suspects, timeline, truth fields
- Player selects suspect → system builds a safe interaction prompt
- Interrogate: messages go through AI adapter, get roleplayed replies
- Each reply passed to extractMeaningfulClues → clues list updates
- Player reviews clues → submits accusation → submitConclusion evaluates

Speaker notes:
Say: "At runtime: the generator produces the full case. When a suspect is chosen, the system constructs a sanitized prompt that hides truth fields. Player messages go to the AI through the adapter; replies are handed to a clue extractor which updates the clue list. Finally, the player submits their accusation and the game computes a score."

---

## Slide 6 — Demo script (what to show)

- Start: `npm install` → `npm start` (or run client)
- Generate a scenario (show suspect list)
- Interrogate one suspect (display roleplay reply)
- Show clue extraction output (clue list updating)
- Submit accusation → show scoring
- Optionally toggle debug to reveal truth

Speaker notes:
Say: "For the demo: start the app, generate a scenario, then pick and interrogate a suspect. Point out the suspect's role play and then show the extracted clues update in real time. Finish by submitting an accusation and reveal the scoring. If needed, toggle debug mode to show the ground truth for verification."

---

## Slide 7 — Extensibility (where to edit)

- Change scenario rules & templates: `src/scenarioGenerator.js` and src/locales/ai
- Tune suspect behavior & system prompt: src/suspectInteraction.js, client/utils/buildSystem.ts
- Improve clue heuristics: `src/clues.js`
- Add new providers: extend `src/ai.js` and update README provider strategy

Speaker notes:
Say: "The project is designed to be extended. Edit scenario templates and rules to produce different mysteries. Adjust suspect system prompts to change personalities or deception levels. Update clue extraction heuristics to improve accuracy. Adding a new model provider only requires changes in src/ai.js."

---

## Slide 8 — Troubleshooting & tips

- Missing API keys → provider fallback checks in README
- Ollama: run `ollama serve` / `ollama pull` for local models
- Use debug mode to surface truth fields while testing
- Logs and example scripts: scripts/ and logs/ folders

Speaker notes:
Say: "Common issues include missing API keys — the README documents fallback behavior. For local models, ensure Ollama is running and you pulled the models. Use debug mode to reveal truth fields during testing, and consult the scripts and logs folders for example runs and diagnostics."

---

## Slide 9 — Closing + Q&A

- Summary: procedural LLM mysteries, roleplay + automated clue extraction, modular and extensible
- Call to action: try `npm start`, inspect `src/*` for customization, contribute templates or heuristics

Speaker notes:
Say: "To summarize: this is a modular, LLM-driven murder mystery that combines roleplayed suspects with automated clue extraction. Try it locally, explore the source to customize behavior, and contributions to templates or clue logic are welcome. I'll take questions now."
