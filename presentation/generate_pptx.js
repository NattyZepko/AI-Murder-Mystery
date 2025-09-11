const PptxGenJS = require("pptxgenjs");

async function buildPpt() {
  const pptx = new PptxGenJS();

  // Theme colors
  const theme = {
    primary: "1F4E79", // deep blue
    accent: "F28B30", // orange
    bg: "F7F9FB",
    text: "222222",
    muted: "6B7785",
  };

  // Ensure color strings are normalized for pptxgenjs (#RRGGBB)
  function normalizeColor(c) {
    if (!c && c !== "") return undefined;
    if (typeof c !== "string") c = String(c);
    c = c.trim();
    if (c === "") return undefined;
    if (c[0] === "#") return c;
    return "#" + c;
  }

  // Normalize theme to '#RRGGBB' strings
  Object.keys(theme).forEach((k) => {
    theme[k] = normalizeColor(theme[k]);
  });

  // Helper to add a styled heading/text block (avoids filled shapes to prevent PPTX color issues)
  function addBox(slide, text, x, y, w, h, opts = {}) {
    const fontSize = opts.fontSize || 12;
    slide.addText(text, {
      x,
      y,
      w,
      h,
      fontSize,
      color: normalizeColor(opts.color || theme.text),
      align: opts.align || "left",
      valign: opts.valign || "top",
      bold: !!opts.bold,
      margin: 0.08,
    });
  }

  // Slide 1 - Title (with colored strip)
  let slide = pptx.addSlide();
  addBox(slide, "AI Murder Mystery", 0.6, 0.8, 8.8, 1.4, { fontSize: 36, bold: true, color: theme.primary });
  slide.addText("Procedural, LLM-driven detective game (Node.js + React)", { x: 0.8, y: 2.4, fontSize: 14, color: theme.muted });
  slide.addNotes("Today I'll present AI Murder Mystery — a procedural, LLM-driven detective game built with Node.js and an optional React UI. Players interrogate AI role‑played suspects, collect extracted clues, and submit an accusation.");

  // Slide 2 - Elevator pitch (visual bullets)
  slide = pptx.addSlide();
  addBox(slide, "Elevator pitch", 0.6, 0.4, 8.8, 0.8, { fontSize: 26, bold: true, color: theme.accent });
  slide.addText("Text-first detective experience using LLMs", { x: 0.8, y: 1.6, fontSize: 14, color: theme.text });
  slide.addText("Generates victim, suspects, motives, weapons, and timeline", { x: 0.8, y: 2.2, fontSize: 14, color: theme.text });
  slide.addText("Player interrogates suspects; system extracts clues automatically", { x: 0.8, y: 2.8, fontSize: 14, color: theme.text });
  slide.addNotes("In short: the project generates a murder scenario and uses language models to role‑play suspects. As you interrogate them, the game automatically extracts meaningful clues from AI replies and builds a case for the player to solve.");

  // Slide 3 - Key features (cards)
  slide = pptx.addSlide();
  addBox(slide, "Key features", 0.6, 0.4, 8.8, 0.8, { fontSize: 26, bold: true, color: theme.primary });
  addBox(slide, "• Procedural scenario generation (victim, suspects, timeline, red herrings)", 0.8, 1.6, 8.0, 0.6, { fontSize: 12, color: theme.text });
  addBox(slide, "• Suspect roleplay via configurable system prompts", 0.8, 2.2, 8.0, 0.6, { fontSize: 12, color: theme.text });
  addBox(slide, "• Automatic clue extraction and JSON repair", 0.8, 2.8, 8.0, 0.6, { fontSize: 12, color: theme.text });
  addBox(slide, "• Pluggable AI provider adapter + CLI and React UI", 0.8, 3.4, 8.0, 0.6, { fontSize: 12, color: theme.text });
  slide.addNotes("Highlights include procedural generation of complete scenarios, configurable suspect prompts for varied roleplay, structured clue extraction for reliable parsing, and a provider adapter so models can be swapped or fall back to local Ollama.");

  // Slide 4 - High-level architecture (boxed diagram with arrows)
  slide = pptx.addSlide();
  addBox(slide, "High-level architecture", 0.6, 0.4, 8.8, 0.7, { fontSize: 22, bold: true, color: theme.accent });

  addBox(slide, "Scenario\nGenerator", 0.8, 1.5, 2.2, 1.0, { fontSize: 12, fill: normalizeColor("4E8BB1") });
  slide.addText("→", { x: 3.2, y: 1.85, fontSize: 24, color: theme.text });
  addBox(slide, "AI\nAdapter", 3.4, 1.5, 2.2, 1.0, { fontSize: 12, fill: normalizeColor("4E8BB1") });
  slide.addText("→", { x: 5.0, y: 1.85, fontSize: 24, color: theme.text });
  addBox(slide, "Suspect\nInteractor", 5.6, 1.5, 2.2, 1.0, { fontSize: 12, fill: normalizeColor("4E8BB1") });

  slide.addText("\n", {});
  addBox(slide, "Clue\nExtraction", 1.8, 3.0, 2.8, 1.0, { fontSize: 12, fill: normalizeColor("3A7CA5") });
  addBox(slide, "Client UI /\nGame Loop", 4.8, 3.0, 3.0, 1.0, { fontSize: 12, fill: normalizeColor("3A7CA5") });

  slide.addNotes("Architecturally: scenario generation -> AI adapter -> suspect interactor. Replies are processed by the clue extractor and surfaced in the client UI or CLI game loop.");

  // Slide 5 - Runtime flow (visual)
  slide = pptx.addSlide();
  addBox(slide, "Runtime flow", 0.6, 0.4, 8.8, 0.7, { fontSize: 22, bold: true, color: theme.primary });

  // Flow boxes with arrows using text arrows
  addBox(slide, "1. Generate\nscenario", 0.8, 1.3, 2.2, 0.9, { fontSize: 12, fill: normalizeColor("5AA0D6") });
  slide.addText("→", { x: 3.2, y: 1.6, fontSize: 18, color: theme.text });
  addBox(slide, "2. Select\nsuspect", 3.4, 1.3, 2.2, 0.9, { fontSize: 12, fill: normalizeColor("5AA0D6") });
  slide.addText("→", { x: 5.0, y: 1.6, fontSize: 18, color: theme.text });
  addBox(slide, "3. Interrogate\n(LLM)", 5.6, 1.3, 2.2, 0.9, { fontSize: 12, fill: normalizeColor("5AA0D6") });

  addBox(slide, "4. Extract\nclues", 2.8, 3.0, 2.4, 0.9, { fontSize: 12, fill: normalizeColor("4DA8C3") });
  addBox(slide, "5. Review +\nSubmit", 5.6, 3.0, 2.2, 0.9, { fontSize: 12, fill: normalizeColor("4DA8C3") });

  slide.addNotes("Flow: Generate -> Select suspect -> Interrogate via the AI adapter. Replies are passed to clue extraction and finally the player reviews and submits an accusation.");

  // Slide 6 - Demo script (styled)
  slide = pptx.addSlide();
  addBox(slide, "Demo script", 0.6, 0.4, 8.8, 0.7, { fontSize: 22, bold: true, color: theme.accent });
  slide.addText("• npm install → npm start", { x: 0.8, y: 1.5, fontSize: 12, color: theme.text });
  slide.addText("• Generate scenario → show suspects", { x: 0.8, y: 2.0, fontSize: 12, color: theme.text });
  slide.addText("• Interrogate suspect → show roleplay output", { x: 0.8, y: 2.5, fontSize: 12, color: theme.text });
  slide.addText("• Show extracted clues → submit accusation", { x: 0.8, y: 3.0, fontSize: 12, color: theme.text });
  slide.addNotes("Run the demo: start the app, generate a scenario, interrogate a suspect and show the extracted clues updating live. Submit an accusation to show scoring.");

  // Slide 7 - Extensibility (cards)
  slide = pptx.addSlide();
  addBox(slide, "Extensibility", 0.6, 0.4, 8.8, 0.7, { fontSize: 22, bold: true, color: theme.primary });
  addBox(slide, "• Change scenario rules & templates: src/scenarioGenerator.js", 0.8, 1.6, 8.0, 0.6, { fontSize: 12, color: theme.text });
  addBox(slide, "• Tune suspect behavior & system prompt: src/suspectInteraction.js", 0.8, 2.2, 8.0, 0.6, { fontSize: 12, color: theme.text });
  addBox(slide, "• Improve clue heuristics: src/clues.js", 0.8, 2.8, 8.0, 0.6, { fontSize: 12, color: theme.text });
  addBox(slide, "• Add new providers: extend src/ai.js", 0.8, 3.4, 8.0, 0.6, { fontSize: 12, color: theme.text });
  slide.addNotes("Components are modular: scenario rules, prompts, clue heuristics, and provider adapters are separate and easy to extend.");

  // Slide 8 - Troubleshooting & tips
  slide = pptx.addSlide();
  addBox(slide, "Troubleshooting & tips", 0.6, 0.4, 8.8, 0.7, { fontSize: 22, bold: true, color: theme.accent });
  slide.addText("• Missing API keys → check README for fallback provider logic", { x: 0.8, y: 1.6, fontSize: 12, color: theme.text });
  slide.addText("• Ollama: run 'ollama serve' and 'ollama pull' for local models", { x: 0.8, y: 2.1, fontSize: 12, color: theme.text });
  slide.addText("• Use debug mode to reveal truth fields while testing", { x: 0.8, y: 2.6, fontSize: 12, color: theme.text });
  slide.addNotes("Common issues include missing API keys — the README documents fallback behavior. Use debug mode to reveal truth fields during testing.");

  // Slide 9 - Closing + Q&A
  slide = pptx.addSlide();
  addBox(slide, "Closing & Q&A", 0.6, 0.4, 8.8, 0.7, { fontSize: 26, bold: true, color: theme.primary });
  slide.addText("Summary: procedural LLM mysteries, roleplay + automated clue extraction, modular and extensible", { x: 0.8, y: 1.6, fontSize: 12, color: theme.text });
  slide.addText("Call to action: try npm start, inspect src/*, contribute templates or heuristics", { x: 0.8, y: 2.2, fontSize: 12, color: theme.text });
  slide.addNotes("To summarize: this is a modular, LLM-driven murder mystery that combines roleplayed suspects with automated clue extraction. Try it locally and explore the source to customize behavior.");

  // Write file
  const outPath = "presentation/AI-Murder-Mystery-Presentation.pptx";
  console.log(`Writing PPTX to ${outPath} ...`);
  await pptx.writeFile({ fileName: outPath });
  console.log("Done.");
}

buildPpt().catch((err) => {
  console.error(err);
  process.exit(1);
});
