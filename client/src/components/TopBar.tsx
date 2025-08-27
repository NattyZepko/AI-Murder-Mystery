import React from 'react';
import { useLocale, useLanguage } from '../i18n/LocaleProvider';

type PageType = 'game' | 'about' | 'how' | 'qa';
interface TopBarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export function TopBar({ currentPage, onNavigate }: TopBarProps) {
  const en = useLocale();
  const { language, setLanguage, available } = useLanguage();
  const isRTL = language === 'Hebrew'

  return (
    <div className="topbar" style={{
      display: 'flex',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#222',
      color: '#fff',
      padding: '8px 24px',
      marginBottom: 24,
      gap: 16,
      fontSize: 18,
      fontWeight: 500,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: currentPage === 'game' ? '#ffd700' : '#fff',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 600,
          }}
          onClick={() => onNavigate('game')}
        >
          {en.topbar.game}
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: currentPage === 'about' ? '#ffd700' : '#fff',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 600,
          }}
          onClick={() => onNavigate('about')}
        >
          {en.topbar.about}
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: currentPage === 'how' ? '#ffd700' : '#fff',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 600,
          }}
          onClick={() => onNavigate('how')}
        >
          {en.topbar.how}
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: currentPage === 'qa' ? '#ffd700' : '#fff',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 600,
          }}
          onClick={() => onNavigate('qa')}
        >
          {en.topbar.qa}
        </button>
      </div>

    <div style={{ marginLeft: 'auto' }}>
  <label htmlFor="language-select" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, fontSize: 14, color: '#ddd' }} title={en.topbar.languageTitle}>🌍</label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            background: '#111',
            color: '#fff',
            borderRadius: 6,
            padding: '6px 8px',
            border: '1px solid #333',
            fontSize: 14,
            cursor: 'pointer'
          }}
          aria-label="Select language"
        >
          {available.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );
}
