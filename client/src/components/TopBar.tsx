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
  const isRTL = (language ?? 'English') === 'Hebrew'
  const pages = [
    { key: 'game' as const, label: en.topbar.game },
    { key: 'about' as const, label: en.topbar.about },
    { key: 'how' as const, label: en.topbar.how },
    { key: 'qa' as const, label: en.topbar.qa },
  ]
  const renderedPages = isRTL ? pages.slice().reverse() : pages

  const CONTROL_WIDTH = 144 // approx label + select width + padding
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    background: '#222',
    color: '#fff',
    padding: '8px 12px',
    marginBottom: 24,
    gap: 16,
    fontSize: 18,
    fontWeight: 500,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  // override global dir so slot order is predictable across rtl/ltr
  direction: 'ltr'
  }

  // Left/right slots for controls and a center nav that expands
  const sideStyle: React.CSSProperties = {
    width: CONTROL_WIDTH,
    display: 'flex',
    alignItems: 'center',
    justifyContent: isRTL ? 'flex-start' : 'flex-end'
  }

  const navStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  justifyContent: isRTL ? 'flex-end' : 'flex-start'
  }

  return (
    <div className="topbar" style={containerStyle}>
      {isRTL ? (
        <div style={{ width: CONTROL_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <>
            <label htmlFor="language-select" style={{ marginRight: 8, fontSize: 14, color: '#ddd' }} title={en.topbar.languageTitle}>🌍</label>
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
                cursor: 'pointer',
                minWidth: 120
              }}
              aria-label="Select language"
            >
              {available.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </>
        </div>
      ) : null}

      {/* center nav */}
      <div style={navStyle}>
        {isRTL ? <div style={{ width: 0, marginLeft: 'auto' }} /> : null}
        {renderedPages.map(p => (
          <button
            key={p.key}
            style={{
              background: 'none',
              border: 'none',
              color: currentPage === p.key ? '#ffd700' : '#fff',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 600,
            }}
            onClick={() => onNavigate(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* right slot only when LTR - otherwise omit so nav reaches edge */}
      {!isRTL ? (
        <div style={{ width: CONTROL_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <>
            <label htmlFor="language-select" style={{ marginLeft: 8, fontSize: 14, color: '#ddd' }} title={en.topbar.languageTitle}>🌍</label>
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
                cursor: 'pointer',
                minWidth: 120
              }}
              aria-label="Select language"
            >
              {available.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </>
        </div>
      ) : null}
    </div>
  )
}
