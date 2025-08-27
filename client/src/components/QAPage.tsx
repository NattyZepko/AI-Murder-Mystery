import React from 'react';

type QAItemProps = {
  question: React.ReactNode;
  answer: React.ReactNode;
};

function QAItem({ question, answer }: QAItemProps) {
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 24 }}>{question}</h2>
      <p>{answer}</p>
    </div>
  );
}

export function QAPage() {
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', background: 'rgba(30,41,59,0.95)', color: '#e5e7eb', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px #0004' }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Q&amp;A</h1>
      <div style={{ fontSize: 16, lineHeight: 1.7 }}>
        <QAItem
          question="What is this game?"
          answer="This is an AI-powered murder mystery game. You play as a detective, questioning suspects and solving the case using clues and logic."
        />
        <QAItem
          question="How do I play?"
          answer="Read the scenario, talk to suspects, gather clues, and try to deduce who the culprit is. Use the chat to ask questions and submit your accusation when you think you know who did it, and with what weapon. If you don't have the correct weapon, try investigating some more."
        />
        <QAItem
          question="Can I lose the game?"
          answer="No. If you accuse the wrong suspect, the case remains unsolved, but you can just keep investigating or guessing. The Engine is entirely run by AI, so it will adapt to your actions, but it isn't perfect. There may be issues, but it SHOULD be solvable. If you encounter any troubles at all, try a new scenario."
        />
        <QAItem
          question="Is the story the same every time?"
          answer="No, each game generates a new scenario with different suspects, motives, and clues."
        />
        <QAItem
          question="Then can I try the same scenario again? Or repeat a scenario? Or ask for a specific scenario?"
          answer="No."
        />
        <QAItem
          question="The AI is misbehaving / glitchy / doesn't remember things / is wrong!"
          answer="Yeah, its just an AI after all. I don't have a solution. Try correcting it, pointing it in the right direction, and if all else fails, Try refreshing the page or starting a new game"
        />
        <QAItem
          question="Who made this?"
          answer="This game was created by Natty Zepko using React and AI technologies."
        />
        <QAItem
          question="I have a suggestion..."
          answer="I am mostly done with the project, but I am open to feedback and suggestions for improvement, sure, why not. Contact me at natty.zepko@gmail.com"
        />
        {/* Add more <QAItem question="..." answer="..." /> blocks as needed */}
      </div>
    </div>
  );
}
