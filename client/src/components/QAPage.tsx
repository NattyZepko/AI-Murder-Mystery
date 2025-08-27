import React from 'react';

export function QAPage() {
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', background: 'rgba(30,41,59,0.95)', color: '#e5e7eb', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px #0004' }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Q&amp;A</h1>
      <div style={{ fontSize: 18, lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 22, marginTop: 24 }}>What is this game?</h2>
        <p>This is an AI-powered murder mystery game. You play as a detective, questioning suspects and solving the case using clues and logic.</p>
        <h2 style={{ fontSize: 22, marginTop: 24 }}>How do I play?</h2>
        <p>Read the scenario, talk to suspects, gather clues, and try to deduce who the culprit is. Use the chat to ask questions and submit your accusation when ready.</p>
        <h2 style={{ fontSize: 22, marginTop: 24 }}>Can I lose the game?</h2>
        <p>Yes! If you accuse the wrong suspect, the case remains unsolved. But you can always try again with a new scenario.</p>
        <h2 style={{ fontSize: 22, marginTop: 24 }}>Is the story the same every time?</h2>
        <p>No, each game generates a new scenario with different suspects, motives, and clues.</p>
        <h2 style={{ fontSize: 22, marginTop: 24 }}>Who made this?</h2>
        <p>This game was created by NattyZepko using React and AI technologies.</p>
      </div>
    </div>
  );
}
