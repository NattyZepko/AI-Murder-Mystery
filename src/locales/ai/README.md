Drop per-language JSON templates here. Filename should match the language display name used in the UI, for example:

- English.json
- Hebrew.json
- French.json
- German.json
- Spanish.json

Each file should be a JSON object with optional keys:

- scenario_system_prefix: string    // text to prepend to scenario generation system prompt (should insist on JSON-only output)
- suspect_system_prefix: string     // text to prepend to suspect roleplay system prompt
- clues_system_prefix: string       // text to prepend to clues extraction prompt
- example_scenario: string          // a one-shot JSON example (stringified) to bias output

Keep the file valid JSON. Values may contain Unicode text in the target language. Prefer brief, strict instructions like "Return ONLY valid JSON" to reduce parse failures.
