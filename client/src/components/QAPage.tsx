import React from 'react';
import en from '../i18n/English.json';

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
    <h1 style={{ fontSize: 32, marginBottom: 16 }}>{en.qa.title}</h1>
      <div style={{ fontSize: 16, lineHeight: 1.7 }}>
        <QAItem
      question={en.qa.items.whatGame_q}
      answer={en.qa.items.whatGame_a}
        />
        <QAItem
      question={en.qa.items.howPlay_q}
      answer={en.qa.items.howPlay_a}
        />
        <QAItem
      question={en.qa.items.canLose_q}
      answer={en.qa.items.canLose_a}
        />
        <QAItem
      question={en.qa.items.sameStory_q}
      answer={en.qa.items.sameStory_a}
        />
        <QAItem
      question={en.qa.items.repeat_q}
      answer={en.qa.items.repeat_a}
        />
        <QAItem
      question={en.qa.items.glitch_q}
      answer={en.qa.items.glitch_a}
        />
        <QAItem
      question={en.qa.items.whoMade_q}
      answer={en.qa.items.whoMade_a}
        />
        <QAItem
      question={en.qa.items.suggest_q}
      answer={en.qa.items.suggest_a}
        />
        {/* Add more <QAItem question="..." answer="..." /> blocks as needed */}
      </div>
    </div>
  );
}
