import React from 'react';

type PageType = 'game' | 'about' | 'how' | 'qa';
interface TopBarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export function TopBar({ currentPage, onNavigate }: TopBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#222',
      color: '#fff',
      padding: '8px 24px',
      marginBottom: 24,
      gap: 16,
      fontSize: 18,
      fontWeight: 500,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
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
  );
}
