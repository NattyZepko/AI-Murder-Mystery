<div align="center">

# AI Murder Mystery

Interactive AI‑driven detective experience. You investigate a procedurally generated murder case by interrogating suspects, collecting dynamic clues, and forming a final accusation.

</div>

## ✨ What This Project Is
An extensible Node.js + TypeScript (client) + Express backend game that uses Large Language Models (LLMs) to:
- Generate a coherent scenario (victim, suspects, motives, weapons, alibis)
- Enforce consistency rules (e.g. only one true murderer, clue plausibility)
- Role‑play each suspect with memory of prior dialogue
- Extract and accumulate "meaningful clues" from free‑form conversations

The default AI provider is **Google Gemini** (Gemini 1.5 Flash) for speed + structured reasoning. The system can seamlessly fall back to a local **Ollama** model if a cloud key is missing or quota errors occur. You can also switch to **OpenAI**.

## 🧠 How It Works (High Level Flow)
1. Player starts the game (CLI or paired with the React client).
2. Backend calls `generateScenario()` (in `core/`) to build a raw scenario prompt.
3. Scenario is refined via `applyScenarioRules()` to normalize / enforce constraints.
4. Player chooses a suspect to question; each message round goes through `chatWithAI()` (in `src/ai.js`).
5. The provider adapter (Gemini / OpenAI / Ollama) returns a role‑played response.
6. Response + last user question are sent to `extractMeaningfulClues()` to mine structured clues.
7. Clues are aggregated; the player reviews them and submits a final accusation.
8. (Future enhancement) Scoring / explanation feedback.

Text fallback logic:
```
if provider == google and key missing/quota -> try Ollama
else if provider == openai and key missing/quota -> try Ollama
else use explicit provider
```

## 🗂️ Repository Structure
```
core/                Scenario generation + rules
server/index.js      Express API (scenario, chat, clue extraction)
src/                 Game + AI helpers (Node runtime)
	ai.js              Provider abstraction + fallback logic
	clues.js           Clue extraction routines
	game*.js           Text game orchestration
client/              Vite + React client (optional UI layer)
env.example          Sample env config (copy to .env or envData.env)
.gitignore           Ensures secrets & build artifacts stay out of history
```

## 🚀 Quick Start (Gemini Recommended)
Requires Node.js 18+ (LTS). Yarn or npm both work (examples use npm).

```bash
git clone https://github.com/NattyZepko/AI-Murder-Mystery.git
cd AI-Murder-Mystery
cp env.example .env          # or create envData.env
npm install
```

Edit `.env` and set at least your Gemini API key:
```
AI_PROVIDER=google
GOOGLE_API_KEY=YOUR_GEMINI_KEY_HERE
# Optional overrides:
# GOOGLE_MODEL=gemini-1.5-flash
# OLLAMA_MODEL=llama3.1
# OPENAI_MODEL=gpt-4o-mini
```

Start the text game (terminal):
```bash
npm start
```

Run the full dev stack (server API + React client):
```bash
npm run dev         # concurrently: Express + client dev server
```
Client usually serves on Vite's port (e.g. 5173) and server prints its chosen port (default 5175, auto‑increments if in use).

## 🔑 Environment Variables
Place these in `.env` (loaded by `dotenv`) or `envData.env` (which overrides `.env` if present). Never commit real keys.

| Variable | Purpose | Default |
|----------|---------|---------|
| AI_PROVIDER | `google` | `google` (can be `openai` or `ollama`) |
| GOOGLE_API_KEY | Gemini API key | (required for cloud Google usage) |
| GOOGLE_MODEL | Gemini model | `gemini-1.5-flash` |
| OPENAI_API_KEY | OpenAI API key | (required for OpenAI usage) |
| OPENAI_MODEL | OpenAI chat model | `gpt-4o-mini` |
| OLLAMA_MODEL | Local Ollama model name | `llama3.1` |
| OLLAMA_HOST | Ollama host URL | `http://127.0.0.1:11434` |
| PORT | Express server base port | `5175` |

Keys that are absent or look like placeholders trigger an automatic attempt to use Ollama.

## 🕹 Gameplay (CLI)
1. Launch with `npm start`.
2. Main Menu gives you options: generate/view scenario, list suspects, interrogate, view clues, submit conclusion.
3. During interrogation, type plain English questions ("Where were you?", "Did you know the victim?").
4. Type `back` to exit suspect dialogue.
5. Accuse when confident (murderer & weapon names must match scenario terms).

## 🌐 API Endpoints (Server)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness probe |
| POST | `/api/scenario` | Generates + rule‑filters a scenario |
| POST | `/api/chat` | Chat with current AI provider (system + messages) |
| POST | `/api/extract-clues` | Extract structured clues from dialogue |

The React client calls these to sync UI state.

## 🧩 Provider Strategy
- Prefer **Gemini** for fast structured replies and generous context.
- Use **OpenAI** when you want higher quality reasoning with `gpt-*` models.
- Use **Ollama** for fully local / offline or fallback safety net.

Fallback ensures the game remains playable even if cloud keys are missing or rate‑limited.

## 🛡 Security & Secrets
- Real keys live only in `.env` / `envData.env` (both git‑ignored).
- `env.example` is safe to commit and share.
- If you ever accidentally commit a secret: rotate it immediately and rewrite history (already demonstrated once for OpenAI key removal).

## 🧪 Development Workflow
Common commands:
```bash
npm start          # CLI game only (uses src/game.js)
npm run dev        # Dev server + React client concurrently
npm run client:dev # Client only
npm run dev:server # Server only
```

You can experiment with prompts / generation logic in `core/index.js` & `src/scenarioGenerator.js` (see exported helpers). Adjust model parameters by passing options in the frontend or modifying `chatWithAI`.

## 🛠 Extending
- Add new clue extraction heuristics in `src/clues.js`.
- Introduce scoring logic after accusation (new module hooking into game loop).
- Store conversation state server‑side for multi‑session persistence.
- Add vector search for clue retrieval (e.g. using local embeddings).

## ❗ Troubleshooting
| Issue | Fix |
|-------|-----|
| Push blocked (secret) | Remove secret, rotate key, rewrite history, force push |
| Provider returns empty | Check API key presence & quotas, fallback logs in server console |
| Ollama errors | Ensure `ollama serve` running and model pulled (`ollama pull llama3.1`) |
| Port in use | Server auto‑increments; read console for final port |

## 🤝 Contributions
Open an issue or PR with enhancements (scenario rules, better clue parsing, UI improvements).

## 📄 License
ISC

---
Enjoy investigating! If you add new providers (e.g. Anthropic, Mistral), mirror the pattern in `src/ai.js` and extend the fallback logic.
