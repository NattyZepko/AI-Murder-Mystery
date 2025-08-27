import React from 'react';

export function HowItWorksPage() {
  return (
    <div style={{ padding: 32 }}>
      <h2>How It Works</h2>
      <p>
        This game uses AI to generate a unique murder mystery scenario each time you play. The suspects, clues, and storylines are dynamically created, so every game is different.
      </p>
      <ol>
        <li>The AI creates a cast of suspects, a victim, and a set of clues.</li>
        <li>You interact with suspects, gather information, and try to solve the case.</li>
        <li>Use your deduction skills to figure out who the murderer is!</li>
      </ol>
      <p>
        Enjoy exploring, interrogating, and solving the mystery!
      </p>
    </div>
  );
}
