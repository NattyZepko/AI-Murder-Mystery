import React from 'react';
import { useLocale } from '../i18n/LocaleProvider';

export function AboutPage() {
  const en = useLocale();
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
