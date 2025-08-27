import React from 'react';
import en from '../i18n/English.json';

export function AboutPage() {
  return (
    <div style={{ padding: 32 }}>
      <h2>{en.about.title}</h2>
      <p>
        {en.about.p1}<br/>
        {en.about.p1b}<br/>
        {en.about.p1c}
      </p>
      <p>{en.about.p2}</p>
    </div>
  );
}
