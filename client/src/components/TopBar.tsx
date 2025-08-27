import React from 'react';

type PageType = 'game' | 'about' | 'how' | 'qa';
interface TopBarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export function TopBar({ currentPage, onNavigate }: TopBarProps) {
  const [language, setLanguage] = React.useState<string>(() => {
    try {
      return (localStorage.getItem('app.language') as string) || 'English';
    } catch (_) { return 'English'; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('app.language', language); } catch (_) {}
  }, [language]);

  return (
    <div style={{
      display: 'flex',
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
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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
          Game
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
          About Me
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
          How It Works
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
          Q&amp;A
        </button>
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <label htmlFor="language-select" style={{ marginRight: 8, fontSize: 14, color: '#ddd' }} title="Language">🌍</label>
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
          <option>English</option>
          <option>Hebrew</option>
          <option>French</option>
        </select>
      </div>
    </div>
  );
}
