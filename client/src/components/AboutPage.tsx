
import React from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import linkedinLogo from '../assets/linkedin.svg';
import gmailLogo from '../assets/gmail.svg';
import facebookLogo from '../assets/facebook.svg';
import githubLogo from '../assets/github.svg';

export function AboutPage() {
  const en = useLocale();
  return (
    <div style={{ padding: 32 }}>
      <h2>{en.about.title}</h2>
      <p>
        {en.about.p1}<br />
        {en.about.p1b}<br />
        {en.about.p1c}
      </p>
      <p>{en.about.p2}</p>
      <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
        <a href="https://www.linkedin.com/in/natty-zepko" target="_blank" rel="noopener noreferrer" title="LinkedIn">
          <img src={linkedinLogo} alt="LinkedIn" style={{ width: 40, height: 40 }} />
        </a>
        <a href="mailto:natty.zepko+aiGame@gmail.com" target="_blank" rel="noopener noreferrer" title="Gmail">
          <img src={gmailLogo} alt="Gmail" style={{ width: 40, height: 40 }} />
        </a>
        <a href="https://www.facebook.com/ZepkoNatty/" target="_blank" rel="noopener noreferrer" title="Facebook">
          <img src={facebookLogo} alt="Facebook" style={{ width: 40, height: 40 }} />
        </a>
        <a href="https://github.com/NattyZepko" target="_blank" rel="noopener noreferrer" title="GitHub">
          <img src={githubLogo} alt="GitHub" style={{ width: 40, height: 40 }} />
        </a>
      </div>
    </div>
  );
}
