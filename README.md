# Murder Mystery Game

A text-based murder mystery game where you play as a detective solving a murder case.

## How to Play

1. Install Node.js (v16+ recommended).
2. Choose your AI provider:
	- Local: Ollama — install and run `ollama serve`.
	- Cloud: OpenAI (ChatGPT) or Google (Gemini).
3. Configure one of the providers:
	- Ollama: pull a model and optionally set `OLLAMA_MODEL` (defaults to `llama3.1`).
	- OpenAI: set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY`. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
	- Google: set `AI_PROVIDER=google` and provide `GOOGLE_API_KEY`. Optionally set `GOOGLE_MODEL` (defaults to `gemini-1.5-flash`).
4. Run the game using `npm start`.
5. From the Main Menu choose "2. Suspect List", then select a suspect (by number or name). You'll chat freely with the suspect—type questions in plain English. Type `back` to return.
6. View your accumulated clues anytime with "3. Clue List".
7. When ready, choose "4. Submit Conclusion" and enter the murderer and weapon names as listed.

## Development

- The game is built using Node.js.
- Modular structure for easy maintenance and scalability.
- Scenario, backstory, and suspect roleplay are generated via Ollama.

### Requirements

- Ollama installed and running (default at http://localhost:11434).
- An available model (default: `llama3`). You can change the model with `OLLAMA_MODEL` env var.

### Quickstart (Ollama)

```bash
# Install Ollama and start the server (once)
ollama serve

# Ollama: pull a model (example)
ollama pull llama3.1

# Optionally choose a different model
export OLLAMA_MODEL=llama3.1
export AI_PROVIDER=openai
export OPENAI_API_KEY=sk-...yourkey...
export OPENAI_MODEL=gpt-4o-mini
```

## License

ISC
