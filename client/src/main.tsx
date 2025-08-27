import React from 'react';
import { createRoot } from 'react-dom/client';
import { generateScenario, chat, extractClues } from './api';
import type { ChatMessage } from './types';
import { ChatPanel } from './components/ChatPanel';
import { AboutPage } from './components/AboutPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import { QAPage } from './components/QAPage';
import { TopBar } from './components/TopBar';
import { AvatarFace } from './components/AvatarFace';
import { SubmitPanel } from './components/SubmitPanel';
import { DebugPanel } from './components/DebugPanel';
import { colorizeText } from './utils/colorize';
import { formatDuration } from './utils/time';
import { buildSystemForSuspect } from './utils/buildSystem';
import { tokenize } from './utils/tokenize';
import LocaleProvider, { useLocale, useLanguage } from './i18n/LocaleProvider';

// Set the body background to match the app background
if (typeof document !== 'undefined') {
  document.body.style.background = 'linear-gradient(180deg, #1e293b 0%, #334155 100%)';
  document.body.style.minHeight = '100vh';
  document.body.style.margin = '0';
}

function AppInner() {
  // --- HOOKS ---
  const [page, setPage] = React.useState<'game' | 'about' | 'how' | 'qa'>('game');
  const [loading, setLoading] = React.useState(false);
  const [scenario, setScenario] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [retryNotice, setRetryNotice] = React.useState<string | null>(null);
  const [activeSuspectId, setActiveSuspectId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [thinking, setThinking] = React.useState(false);
  const [clues, setClues] = React.useState<Array<{ type: string; subject: string; note: string }>>([]);
  const [mentionedWeapons, setMentionedWeapons] = React.useState<Set<string>>(new Set());
  const [histories, setHistories] = React.useState<Record<string, ChatMessage[]>>({});
  const [debug, setDebug] = React.useState(false);
  const [solved, setSolved] = React.useState(false);
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState<number>(0);
  const timerRef = React.useRef<number | null>(null);
  const [activeClueTab, setActiveClueTab] = React.useState<string>('all');
  const MAX_CLUES = 60;

  // --- MEMOS & UTILS ---
  const en = useLocale();
  const { language } = useLanguage();
  const isRTL = language === 'Hebrew'
  const suspectNames = React.useMemo(() => new Set((scenario?.suspects ?? []).map((s: any) => s.name).filter(Boolean)), [scenario]);
  const weaponNames = React.useMemo(() => new Set((scenario?.weapons ?? []).map((w: any) => w.name).filter(Boolean)), [scenario]);
  const weaponKeywordMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    const shortKeep = new Set(['gun', 'axe', 'saw', 'rod', 'bat', 'bow']);
    const normalize = (s: string) => s.toLowerCase();
    (scenario?.weapons ?? []).forEach((w: any) => {
      const name = String(w?.name || '');
      const base = name.replace(/\([^)]*\)/g, ' ');
      const tokens = tokenize(base, language)
        .filter(t => t.length >= 4 || shortKeep.has(t.toLowerCase()))
        .map(normalize);
      const uniq = Array.from(new Set(tokens));
      map[name] = uniq;
    });
    return map;
  }, [scenario]);
  const suspectColorById = React.useMemo(() => {
    const arr: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : [];
    const map: Record<string, string> = {};
    const n = arr.length || 1;
    const colorAt = (i: number) => {
      const step = 360 / n;
      let hue = (step * i) % 360;
      const inYellowBand = (h: number) => h >= 40 && h <= 65;
      if (inYellowBand(hue)) {
        hue = (hue + step / 2) % 360;
        if (inYellowBand(hue)) hue = (hue + step) % 360;
      }
      return `hsl(${Math.round(hue)}, 70%, 40%)`;
    };
    arr
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((s, idx) => { map[s.id] = colorAt(idx); });
    return map;
  }, [scenario]);
  const suspectTokenToColor = React.useMemo(() => {
    const tokens: Array<{ t: string, color: string, owner: string }> = [];
    const suspects: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : [];
    suspects.forEach((s: any) => {
      const color = suspectColorById[s.id];
      const parts = tokenize(String(s?.name || ''), language);
      parts.forEach(p => {
        const t = p.trim().toLowerCase();
        if (t && t.length >= 3) tokens.push({ t, color, owner: s.id });
      });
    });
    tokens.sort((a, b) => (b.t.length - a.t.length) || String(a.owner).localeCompare(String(b.owner)));
    const map: Record<string, string> = {};
    tokens.forEach(({ t, color }) => { if (!map[t]) map[t] = color; });
    return map;
  }, [scenario, suspectColorById]);
  const suspectNameToColor = React.useMemo(() => {
    const out: Record<string, string> = {};
    const suspects: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : [];
    suspects.forEach((s: any) => { out[s.name] = suspectColorById[s.id]; });
    return out;
  }, [scenario, suspectColorById]);
  // colorize moved to util
  // formatDuration moved to util

  React.useEffect(() => {
    if (startTime && !solved) {
      setElapsedMs(Date.now() - startTime);
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 250);
      return () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [startTime, solved]);

  // --- MAIN LOGIC (generate, openSuspect, send, handleSolved, buildSystem, renderGamePage) ---
  const generate = async () => {
    setError(null);
    setRetryNotice(null);
    setLoading(true);
    const funnyErrors: string[] = Array.isArray((en.main as any)?.funnyErrors) ? (en.main as any).funnyErrors : [];
    let sc: any = null;
    try {
      sc = await generateScenario(language);
    } catch (e1: any) {
      setRetryNotice(funnyErrors[Math.floor(Math.random() * funnyErrors.length)]);
      try {
        sc = await generateScenario(language);
      } catch (e2: any) {
        setError(e2.message || en.main.generateScenario);
      }
    }
    if (sc) {
      try {
        if (Array.isArray(sc.suspects)) {
          const arr = [...sc.suspects];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
          }
          sc = { ...sc, suspects: arr };
        }
      } catch { }
      setScenario(sc);
      setActiveSuspectId(null);
      setMessages([]);
      setClues([]);
      setMentionedWeapons(new Set());
      setHistories({});
      setDebug(false);
      setSolved(false);
      setStartTime(Date.now());
      setError(null);
      setRetryNotice(null);
    }
    setLoading(false);
  };

  const openSuspect = (id: string) => {
    setActiveSuspectId(id);
    setMessages(histories[id] || []);
  };

  const send = async (text: string) => {
    if (!activeSuspectId || !scenario) return;
    const suspect = (scenario.suspects ?? []).find((s: any) => s.id === activeSuspectId);
    if (!suspect) return;
    const system = buildSystemForSuspect(suspect, scenario, language);
    const next: ChatMessage[] = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    try {
      const resp = await chat(system, next, { temperature: 0.7, max_tokens: 180 });
      const reply = resp?.message?.content || '(no response)';
      setMessages([...next, { role: 'assistant' as const, content: reply }]);
      setHistories(prev => ({ ...prev, [activeSuspectId]: [...next, { role: 'assistant' as const, content: reply }] }));
      const lower = reply.toLowerCase();
      const newlyMentioned = new Set<string>(mentionedWeapons);
      (scenario.weapons ?? []).forEach((w: any) => {
        const name = String(w?.name || '');
        const keywords = weaponKeywordMap[name] || [];
        if (!name) return;
        const hit = lower.includes(name.toLowerCase()) || keywords.some(tok => lower.includes(tok));
        if (hit) newlyMentioned.add(name);
      });
      setMentionedWeapons(newlyMentioned);
      try {
        const newClues = await extractClues({ reply, lastUserText: text, suspect, scenario, language });
        const extracted = Array.isArray(newClues) ? newClues : [];
        // fallback stub for localExtractClues: returns empty array
        const localExtractClues = () => [];
        const finalClues = extracted.length ? extracted : localExtractClues();
        if (finalClues.length) {
          setClues((prev: Array<{ type: string; subject: string; note: string }>) => {
            const next = [...prev];
            (finalClues as Array<{ type: string; subject: string; note: string }>).forEach((c) => {
              if (!next.some(d => d.subject === suspect.name && d.note === c.note)) {
                next.push({ type: c.type, subject: c.subject, note: c.note });
              }
            });
            return next.length > MAX_CLUES ? next.slice(-MAX_CLUES) : next;
          });
        }
      } catch (err) {
        // fallback stub for localExtractClues: returns empty array
        const localExtractClues = () => [];
        const fallback = localExtractClues();
        if (fallback.length) setClues(prev => {
          const next = [...prev];
          fallback.forEach((c: { type: string, subject: string, note: string }) => { if (!next.some(d => d.subject === suspect.name && d.note === c.note)) next.push({ type: c.type, subject: c.subject, note: c.note }); });
          return next.length > MAX_CLUES ? next.slice(-MAX_CLUES) : next;
        });
      }
    } catch (err: any) {
      setMessages([...next, { role: 'assistant' as const, content: `Error: ${err.message}` }]);
    } finally {
      setThinking(false);
    }
  };

  const handleSolved = () => {
    setSolved(true);
    if (startTime) {
      const ms = Date.now() - startTime;
      window.alert(`Congratulations! You solved the mystery in ${formatDuration(ms)}.`);
    } else {
      window.alert('Congratulations! You solved the mystery.');
    }
  };

  // buildSystem moved to util

  function renderGamePage() {
    return (
      <>
        {startTime && !solved && (
          <div style={{ position: 'fixed', top: 12, [isRTL ? 'left' : 'right']: 16, background: 'rgba(17,24,39,0.9)', color: '#fff', padding: '6px 10px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 1000 }}>
            ⏱ {formatDuration(elapsedMs)}
          </div>
        )}
        <h1>{en.main.title}</h1>
        <p>{en.main.intro1}</p>
        <p>{en.main.intro2}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {(!scenario || solved) && (
            <button disabled={loading} onClick={generate}>{loading ? en.main.generating : (solved ? en.main.generateNewMystery : en.main.generateScenario)}</button>
          )}
          {scenario && (
            <button onClick={() => setDebug(v => !v)}>{debug ? en.main.hideDebug : en.main.showDebug}</button>
          )}
        </div>
        {retryNotice && <p style={{ color: 'crimson', margin: '6px 0' }}>{retryNotice}</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {scenario && (
          <>
            <div style={{ marginTop: 16 }}>
              <h2>{scenario.title}</h2>
              <p><strong>{(en.main as any).settingLabel || 'Setting:'}</strong> {scenario.setting}</p>
              {scenario.victim && <p><strong>{(en.main as any).victimLabel || 'Victim:'}</strong> {scenario.victim.name} — <em>{scenario.victim.timeOfDeath}</em></p>}
              <div style={{ display: 'grid', gridTemplateColumns: isRTL ? '360px minmax(600px, 1fr) 320px' : '320px minmax(600px, 1fr) 360px', gap: 20, alignItems: 'start', marginTop: 8 }}>
                <div>
                  <h3>{en.main.suspectsTitle}</h3>
                  <ul>
                    {scenario.suspects?.map((s: any) => (
                      <li key={s.id}>
                        <button
                          onClick={() => openSuspect(s.id)}
                          style={{
                            border: '1px solid #334155',
                            borderRadius: 6,
                            padding: '8px 10px',
                            width: '100%',
                            textAlign: 'left',
                            background: activeSuspectId === s.id ? '#334155' : '#475569',
                            color: '#f3f4f6',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '36px 8px 1fr', alignItems: 'center', columnGap: 8, minHeight: 36 }}>
                            <AvatarFace gender={s.gender} age={s.age} persona={s.persona || s.mannerisms?.join(' ')} size={36} accentColor={suspectColorById[s.id]} />
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: suspectColorById[s.id] }} />
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                              <strong style={{ wordBreak: 'break-word' }}>{s.name}</strong>
                              <span style={{ color: '#e5e7eb', whiteSpace: 'nowrap', flex: '0 0 auto', fontSize: 12, lineHeight: 1 }}>(
                                {(en.labels as any)[`gender_${String(s.gender || 'unknown').toLowerCase()}`] || (s.gender || 'unknown')}, {(en.labels as any).agePrefix ? `${(en.labels as any).agePrefix} ${s.age}` : s.age}
                                )</span>
                            </div>
                          </div>
                          {debug && (
                            <div style={{ fontSize: 12, color: '#666' }}>{s.motive ? `motive: ${s.motive}` : 'no clear motive'}</div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>{en.main.interrogateTitle}</h3>
                  {!activeSuspectId && <p>{en.main.selectSuspectPrompt}</p>}
                  {activeSuspectId && (
                    <div style={{ background: '#1e293b', borderRadius: 10, padding: 12, color: '#f3f4f6', minHeight: 320 }}>
                      <ChatPanel
                        title={(scenario.suspects ?? []).find((s: any) => s.id === activeSuspectId)?.name || 'Suspect'}
                        thinking={thinking}
                        messages={messages}
                        onSend={send}
                        colorize={(t: string) => {
                          // For Hebrew, normalize suspect names for RTL and possible diacritics
                          let normalizedSuspectNameToColor = { ...suspectNameToColor };
                          if (isRTL) {
                            normalizedSuspectNameToColor = {};
                            Object.entries(suspectNameToColor).forEach(([name, color]) => {
                              // Remove diacritics and normalize
                              const normName = name.normalize('NFC');
                              normalizedSuspectNameToColor[normName] = color;
                            });
                          }
                          return colorizeText({ text: t, weaponKeywordMap, suspectNameToColor: normalizedSuspectNameToColor, suspectTokenToColor });
                        }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <SubmitPanel scenario={scenario} mentionedWeapons={mentionedWeapons} onSolved={handleSolved} />
                  <div style={{ marginTop: 16 }}>
                    <h3>{en.main.cluesTitle}</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0 8px' }}>
                      {Object.entries(en.clues).map(([key, tabLabel]) => {
                        const isActive = activeClueTab === key;
                        const count = key === 'all' ? clues.length : clues.filter(c => c.type === key).length;
                        if (key !== 'all' && count === 0) return null;
                        return (
                          <button key={key} onClick={() => setActiveClueTab(key)}
                            style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #ccc', background: isActive ? '#111827' : '#fff', color: isActive ? '#fff' : '#111827', fontSize: 12 }}>
                            {tabLabel} ({count})
                          </button>
                        );
                      })}
                    </div>
                    {clues.length === 0 ? (
                      <p>{en.main.noClues}</p>
                    ) : (
                      <ul style={{ maxHeight: '32vh', overflow: 'auto', paddingRight: 6 }}>
                        {(activeClueTab === 'all' ? clues : clues.filter(c => c.type === activeClueTab)).map((c, i) => (
                          <li key={i}>
                            <span>[{c.type}] </span>
                            <span style={{ color: suspectNameToColor[c.subject] || '#dc2626', fontWeight: 600 }}>{c.subject}</span>
                            <span>: </span>
                            <span dangerouslySetInnerHTML={{ __html: colorizeText({ text: c.note, weaponKeywordMap, suspectNameToColor, suspectTokenToColor }) }} />
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600 }}>{en.main.weaponsMentioned}</div>
                      {Array.from(mentionedWeapons).length === 0 ? (
                        <div>{en.main.noneYet}</div>
                      ) : (
                        <ul>
                          {Array.from(mentionedWeapons).map((w) => (
                            <li key={w} style={{ color: '#b58900' }}>{w}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {debug && scenario.relationships?.length > 0 && (
              <>
                <h3>{en.main.relationshipsTitle}</h3>
                <ul>
                  {scenario.relationships.map((r: any, i: number) => {
                    const nameById: Record<string, string> = Object.fromEntries((scenario.suspects ?? []).map((s: any) => [s.id, s.name]));
                    const between = Array.isArray(r.between) ? r.between : [];
                    const betweenNames = between.map((id: string) => nameById[id] ?? id).join(' ↔ ');
                    return (
                      <li key={i}>{betweenNames} — {r.type}{r.isSecret ? ' (secret)' : ''}{r.note ? `: ${r.note}` : ''}</li>
                    );
                  })}
                </ul>
              </>
            )}
            {debug && scenario.witnessedEvents?.length > 0 && (
              <>
                <h3>{en.main.witnessedEventsTitle}</h3>
                <ul>
                  {scenario.witnessedEvents.map((w: any, i: number) => {
                    const nameById: Record<string, string> = Object.fromEntries((scenario.suspects ?? []).map((s: any) => [s.id, s.name]));
                    const witnesses = (w.witnesses ?? []).map((id: string) => nameById[id] ?? id).join(', ');
                    const involves = (w.involves ?? []).map((id: string) => nameById[id] ?? id).join(', ');
                    return (
                      <li key={i}>
                        {w.time ? w.time + ' — ' : ''}{w.description}
                        {(witnesses || involves) && (
                          <>
                            {' '}
                            <em>
                              {witnesses && ` (witness: ${witnesses})`}
                              {involves && ` (involving: ${involves})`}
                            </em>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {debug && scenario && (
              <div style={{ marginTop: 16 }}>
                <h3>{en.debug.title}: AI Data</h3>
                <DebugPanel scenario={scenario} />
              </div>
            )}
          </>
        )}
      </>
    );
  }

  // --- MAIN RETURN ---
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 16,
        maxWidth: 1280,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
        color: '#f3f4f6',
      }}
    >
      <TopBar currentPage={page} onNavigate={setPage as any} />
      {page === 'game' && renderGamePage()}
      {page === 'about' && <AboutPage />}
      {page === 'how' && <HowItWorksPage />}
      {page === 'qa' && <QAPage />}
    </div>
  );
}

const App = () => (
  <LocaleProvider>
    <AppInner />
  </LocaleProvider>
)

createRoot(document.getElementById('root')!).render(<App />);
