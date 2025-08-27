import React from 'react';
import { useLocale } from '../i18n/LocaleProvider';

export function HowItWorksPage() {
  const en = useLocale();
  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto', background: 'rgba(30,41,59,0.95)', color: '#e5e7eb', borderRadius: 12, boxShadow: '0 4px 24px #0004' }}>
      <h2 style={{ fontSize: 32, marginBottom: 16 }}>{en.how.title}</h2>
      <p style={{ fontSize: 18, lineHeight: 1.7 }}>
        <strong>AI Murder Mystery</strong> {en.how.subtitle}
      </p>
      <h3 style={{ marginTop: 28, fontSize: 22 }}>{en.how.gameFlow}</h3>
      {/* Game Flow Diagram (placeholder, can be replaced with a real image) */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <svg width="540" height="120" viewBox="0 0 540 120" style={{ background: 'none' }}>
          <g fontFamily="system-ui,sans-serif" fontSize="15">
            <rect x="10" y="40" width="110" height="40" rx="10" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="65" y="65" textAnchor="middle" fill="#e5e7eb">{en.how.startGame}</text>
            <rect x="140" y="40" width="120" height="40" rx="10" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="200" y="65" textAnchor="middle" fill="#e5e7eb">{en.how.generateScenario}</text>
            <rect x="280" y="40" width="110" height="40" rx="10" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="335" y="65" textAnchor="middle" fill="#e5e7eb">{en.how.interrogate}</text>
            <rect x="410" y="40" width="110" height="40" rx="10" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="465" y="65" textAnchor="middle" fill="#e5e7eb">{en.how.accuse}</text>
            <polygon points="120,60 140,60 140,65 120,65" fill="#64748b" />
            <polygon points="260,60 280,60 280,65 260,65" fill="#64748b" />
            <polygon points="390,60 410,60 410,65 390,65" fill="#64748b" />
          </g>
        </svg>
      </div>
      <ol style={{ fontSize: 17, lineHeight: 1.7, marginLeft: 24 }}>
        <li><strong>Scenario Generation:</strong> The AI creates a coherent scenario with a victim, suspects, motives, weapons, alibis, and relationships. Every detail is procedurally generated, so no two games are the same.</li>
        <li><strong>Consistency Rules:</strong> The system enforces logical constraints (e.g., only one true murderer, plausible clues) to ensure a fair and solvable mystery.</li>
        <li><strong>Interrogation:</strong> You select suspects to question. Each suspect is role-played by the AI, which remembers prior dialogue and adapts its responses.</li>
        <li><strong>Clue Extraction:</strong> After each conversation, the AI analyzes the dialogue to extract meaningful clues, which are added to your clue log.</li>
        <li><strong>Deduction & Accusation:</strong> Review the clues, connect the dots, and submit your accusation when you think you've solved the case.</li>
        <li><strong>Replayability:</strong> If you guess wrong, you can generate a new scenario and try again. Every playthrough is different!</li>
      </ol>
  <h3 style={{ marginTop: 28, fontSize: 22 }}>{en.how.systemArchitecture}</h3>
      {/* Improved Architecture Diagram (SVG, single AI backend) */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <svg width="600" height="160" viewBox="0 0 600 160" style={{ background: 'none' }}>
          <g fontFamily="system-ui,sans-serif" fontSize="15">
            {/* React Client */}
            <rect x="40" y="55" width="140" height="50" rx="16" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="110" y="85" textAnchor="middle" fill="#e5e7eb" fontSize="17">{en.how.reactClient}</text>
            {/* Arrow to Express API */}
            <line x1="180" y1="80" x2="220" y2="80" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />
            {/* Express API */}
            <rect x="220" y="40" width="160" height="80" rx="16" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="300" y="75" textAnchor="middle" fill="#e5e7eb" fontSize="17">{en.how.expressApi}</text>
            <text x="300" y="95" textAnchor="middle" fill="#e5e7eb" fontSize="13">{en.how.expressApiDetail}</text>
            {/* Arrow to AI Model */}
            <line x1="380" y1="80" x2="440" y2="80" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />
            {/* AI Model */}
            <rect x="440" y="55" width="120" height="50" rx="16" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="500" y="85" textAnchor="middle" fill="#e5e7eb" fontSize="17">{en.how.aiBackend}</text>
            {/* Arrow marker definition */}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
              </marker>
            </defs>
          </g>
        </svg>
      </div>
  <h3 style={{ marginTop: 28, fontSize: 22 }}>{en.how.aiBackend}</h3>
      <ul style={{ fontSize: 17, lineHeight: 1.7, marginLeft: 24 }}>
        <li><strong>Unified AI Backend:</strong> The game uses a single AI backend to generate scenarios, role-play suspects, and extract clues.</li>
        <li><strong>Reliable Experience:</strong> The backend ensures a consistent and uninterrupted gameplay experience.</li>
      </ul>
  <p style={{ fontSize: 16, marginTop: 8 }}>{en.how.aiBackendDesc}</p>
  <h3 style={{ marginTop: 28, fontSize: 22 }}>{en.how.behindScenesTitle}</h3>
      <ul style={{ fontSize: 17, lineHeight: 1.7, marginLeft: 24 }}>
        <li><strong>Scenario Engine:</strong> The backend builds and refines each case using scenario rules and normalization logic.</li>
        <li><strong>Role-Playing AI:</strong> Each suspect is role-played by the AI, maintaining memory of your previous questions and their own alibis, motives, and secrets.</li>
        <li><strong>Clue Mining:</strong> The AI extracts structured clues from free-form conversations, helping you keep track of important facts.</li>
        <li><strong>Extensible Design:</strong> The system is built to be extended—add new clue types, scoring logic, or even new AI providers by editing the backend modules.</li>
      </ul>
  <h3 style={{ marginTop: 28, fontSize: 22 }}>{en.how.technicalStackTitle}</h3>
      <ul style={{ fontSize: 17, lineHeight: 1.7, marginLeft: 24 }}>
        <li><strong>Node.js + Express:</strong> Backend API for scenario generation, chat, and clue extraction.</li>
        <li><strong>TypeScript & React:</strong> Modern, responsive client UI (this app) built with Vite.</li>
        <li><strong>AI Backend:</strong> All scenario and dialogue logic is powered by a single AI backend.</li>
      </ul>
  <h3 style={{ marginTop: 28, fontSize: 22 }}>{en.how.extendingTitle}</h3>
      <ul style={{ fontSize: 17, lineHeight: 1.7, marginLeft: 24 }}>
        <li>Add new clue extraction logic in <code>src/clues.js</code>.</li>
        <li>Experiment with scenario rules in <code>core/</code> and <code>src/scenarioGenerator.js</code>.</li>
        <li>Swap or add AI providers by editing <code>src/ai.js</code>.</li>
        <li>Contribute new features, UI improvements, or scenario types via pull requests!</li>
      </ul>
      <p style={{ fontSize: 16, marginTop: 24 }}>
        <strong>Enjoy exploring, interrogating, and solving the mystery!</strong>
      </p>
    </div>
  );
}
