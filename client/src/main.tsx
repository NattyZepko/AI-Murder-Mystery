import React from 'react'
import { createRoot } from 'react-dom/client'
import { generateScenario, chat, extractClues } from './api'
import type { ChatMessage } from './types'
import { ChatPanel } from './components/ChatPanel'
import { DebugPanel } from './components/DebugPanel'
import { SubmitPanel } from './components/SubmitPanel'
import { AvatarFace } from './components/AvatarFace'

function App() {
  const [loading, setLoading] = React.useState(false)
  const [scenario, setScenario] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [retryNotice, setRetryNotice] = React.useState<string | null>(null)
  const [activeSuspectId, setActiveSuspectId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [thinking, setThinking] = React.useState(false)
  const [clues, setClues] = React.useState<Array<{ type: string, subject: string, note: string }>>([])
  const [mentionedWeapons, setMentionedWeapons] = React.useState<Set<string>>(new Set())
  const [histories, setHistories] = React.useState<Record<string, ChatMessage[]>>({})
  const [debug, setDebug] = React.useState(false)
  const [solved, setSolved] = React.useState(false)
  const [startTime, setStartTime] = React.useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = React.useState<number>(0)
  const timerRef = React.useRef<number | null>(null)
  const [activeClueTab, setActiveClueTab] = React.useState<string>('all')
  const MAX_CLUES = 60

  const suspectNames = React.useMemo(() => new Set((scenario?.suspects ?? []).map((s: any) => s.name).filter(Boolean)), [scenario])
  const weaponNames = React.useMemo(() => new Set((scenario?.weapons ?? []).map((w: any) => w.name).filter(Boolean)), [scenario])

  // Build keyword index for partial weapon matches (e.g., "Kitchen Knife (K-15)" matches "knife").
  const weaponKeywordMap = React.useMemo(() => {
    const map: Record<string, string[]> = {}
    const shortKeep = new Set(['gun', 'axe', 'saw', 'rod', 'bat', 'bow'])
    const normalize = (s: string) => s.toLowerCase()
    ;(scenario?.weapons ?? []).forEach((w: any) => {
      const name = String(w?.name || '')
      const base = name.replace(/\([^)]*\)/g, ' ') // drop codes like (K-15)
      const tokens = base
        .split(/[^a-zA-Z0-9]+/)
        .map(t => t.trim())
        .filter(Boolean)
        .filter(t => t.length >= 4 || shortKeep.has(t.toLowerCase()))
        .map(normalize)
      const uniq = Array.from(new Set(tokens))
      map[name] = uniq
    })
    return map
  }, [scenario])

  // Assign distinct colors to suspects and build token->color map for partial highlighting
  const suspectColorById = React.useMemo(() => {
    const arr: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : []
    const map: Record<string, string> = {}
    const n = arr.length || 1
    const colorAt = (i: number) => {
      const step = 360 / n
      let hue = (step * i) % 360
      // Avoid yellow-ish band reserved for weapons (#b58900 ~ 45°). Skip ~40–65°.
      const inYellowBand = (h: number) => h >= 40 && h <= 65
      if (inYellowBand(hue)) {
        hue = (hue + step / 2) % 360
        if (inYellowBand(hue)) hue = (hue + step) % 360
      }
      return `hsl(${Math.round(hue)}, 70%, 40%)`
    }
    arr
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((s, idx) => { map[s.id] = colorAt(idx) })
    return map
  }, [scenario])

  const suspectTokenToColor = React.useMemo(() => {
    const tokens: Array<{ t: string, color: string, owner: string }> = []
    const suspects: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : []
    suspects.forEach((s: any) => {
      const color = suspectColorById[s.id]
      const parts = String(s?.name || '').split(/[^a-zA-Z0-9]+/)
      parts.forEach(p => {
        const t = p.trim().toLowerCase()
        if (t && t.length >= 3) tokens.push({ t, color, owner: s.id })
      })
    })
    // Resolve duplicates by preferring longer tokens and then lexicographic owner
    tokens.sort((a, b) => (b.t.length - a.t.length) || String(a.owner).localeCompare(String(b.owner)))
    const map: Record<string, string> = {}
    tokens.forEach(({ t, color }) => { if (!map[t]) map[t] = color })
    return map
  }, [scenario, suspectColorById])

  // Map suspect name -> color for clue subject coloring
  const suspectNameToColor = React.useMemo(() => {
    const out: Record<string, string> = {}
    const suspects: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : []
    suspects.forEach((s: any) => { out[s.name] = suspectColorById[s.id] })
    return out
  }, [scenario, suspectColorById])

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const colorize = (text: string) => {
    // Highlight weapons (yellow) and names (red) using span styles with token-aware, word-boundary matching
    let out = text
    // Weapons: tokens from weaponKeywordMap
    const weaponTokens: string[] = Array.from(new Set(Object.values(weaponKeywordMap).flat()))
    if (weaponTokens.length) {
      const pattern = new RegExp(`\\b(${weaponTokens.map(escapeRe).sort((a,b)=>b.length-a.length).join('|')})\\b`, 'gi')
      out = out.replace(pattern, (m) => `<span style="color:#b58900">${m}</span>`)
    }
    // Suspects: tokens from names
    const suspectTokens: string[] = Object.keys(suspectTokenToColor)
    if (suspectTokens.length) {
      const pattern = new RegExp(`\\b(${suspectTokens.map(escapeRe).sort((a,b)=>b.length-a.length).join('|')})\\b`, 'gi')
      out = out.replace(pattern, (m) => {
        const key = m.toLowerCase()
        const color = suspectTokenToColor[key] || '#dc2626'
        return `<span style=\"color:${color}\">${m}</span>`
      })
    }
    return out
  }

  // Timer controls
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
  }

  React.useEffect(() => {
    // Start ticking when startTime is set and case not solved
    if (startTime && !solved) {
      // immediate update
      setElapsedMs(Date.now() - startTime)
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTime)
      }, 250)
      return () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }
    // Cleanup if solved or no startTime
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [startTime, solved])

  const generate = async () => {
    setError(null)
    setRetryNotice(null)
    setLoading(true)
    const funnyErrors = [
  'Suspects ran away. Fetching them back…',
  'Victim turned out to be alive. Searching another case…',
  'Evidence mislabeled. Rebuilding the crime scene…',
  'Detective spilled coffee on the file. Drying pages…',
  'Witness refuses to talk without snacks. Ordering chips…',
  'Fingerprint smudged by intern. Restarting analysis…',
  'Crime scene tape tangled. Untying knots…',
  'Suspect alibi is Netflix. Cross-checking seasons…',
  'Magnifying glass missing. Zooming digitally…',
  'Detective’s pen ran out of ink. Borrowing from judge…',
  'Case closed accidentally. Re-opening investigation…',
  'Dog ate the evidence bag. Walking the dog…',
  'Detective fell asleep on the typewriter. Removing zzz’s…',
  'Crime scene GPS recalculating… please make a U-turn…',
  'Suspect fled in clown car. Counting how many got out…',
];
    let sc: any = null
    try {
      sc = await generateScenario()
    } catch (e1: any) {
      setRetryNotice(funnyErrors[Math.floor(Math.random() * funnyErrors.length)])
      try {
        sc = await generateScenario()
      } catch (e2: any) {
        setError(e2.message || 'Failed to generate scenario')
      }
    }
    if (sc) {
      // Shuffle suspects locally to avoid consistent ordering (e.g., guilty first)
      try {
        if (Array.isArray(sc.suspects)) {
          const arr = [...sc.suspects]
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
          }
          sc = { ...sc, suspects: arr }
        }
      } catch {}
      setRetryNotice(null)
      setScenario(sc)
      setActiveSuspectId(null)
      setMessages([])
      setClues([])
      setMentionedWeapons(new Set())
      setHistories({})
      setSolved(false)
      setStartTime(Date.now())
      setElapsedMs(0)
    }
    setLoading(false)
  }

  const handleSolved = () => {
    setSolved(true)
    if (startTime) {
      const ms = Date.now() - startTime
      setElapsedMs(ms)
      // Simple popup per requirement
      window.alert(`Congratulations! You solved the mystery in ${formatDuration(ms)}.`)
    } else {
      window.alert('Congratulations! You solved the mystery.')
    }
  }

  const buildSystem = (suspect: any, sc: any) => {
    // Safe JSON (no spoilers): remove isGuilty and isMurderWeapon
    const redact = (obj: any, keys: string[]) => {
      if (!obj || typeof obj !== 'object') return obj
      const out: any = Array.isArray(obj) ? [] : {}
      for (const k of Object.keys(obj)) {
        if (keys.includes(k)) continue
        const v: any = (obj as any)[k]
        out[k] = (v && typeof v === 'object') ? redact(v, keys) : v
      }
      return out
    }
    const safeSuspect = redact(suspect, ['isGuilty'])
    const safeWeapons = (sc.weapons ?? []).map((w: any) => redact(w, ['isMurderWeapon']))
    const suspectsById: Record<string, any> = Object.fromEntries((sc.suspects ?? []).map((s: any) => [s.id, s]))
    const verifiers = (suspect.alibiVerifiedBy ?? []).map((id: string) => suspectsById[id]).filter(Boolean)
    const weaponsLinked = (sc.weapons ?? []).filter((w: any) => w.foundOnSuspectId === suspect.id || w.foundNearSuspectId === suspect.id)

    const shared = sc.sharedStory || 'Shared account of the evening; keep your story consistent.'

    return [
      'You are roleplaying as a suspect in a murder mystery.',
      'Stay in character; do not reveal meta info or the culprit.',
      'Avoid stage directions; convey emotion by word choice only.',
      `Shared scenario: ${shared}`,
      'Context (JSON, safe):',
      JSON.stringify({
        setting: sc.setting,
        victim: sc.victim,
        suspect: safeSuspect,
        weapons: safeWeapons,
        weaponsLinkedToYou: weaponsLinked,
        verifiers: verifiers.map((v: any) => ({ id: v.id, name: v.name, gender: v.gender, age: v.age, alibi: v.alibi })),
        relationships: sc.relationships,
        witnessedEvents: sc.witnessedEvents,
      }, null, 2)
    ].join('\n')
  }

  const openSuspect = (id: string) => {
    setActiveSuspectId(id)
    setMessages(histories[id] ?? [])
  }

  const localExtractClues = (reply: string, suspect: any, sc: any): Array<{ type: string, note: string }> => {
    const out: Array<{ type: string, note: string }> = []
    const lower = reply.toLowerCase()
    // Weapon mentions
    ;(sc.weapons ?? []).forEach((w: any) => {
      const name = String(w?.name || '')
      const keywords = weaponKeywordMap[name] || []
      const hit = keywords.some(tok => lower.includes(tok)) || (name && lower.includes(name.toLowerCase()))
      if (name && hit) {
        // Enrich: include linkage if known
        const byId: Record<string,string> = Object.fromEntries((sc.suspects ?? []).map((s:any)=>[s.id,s.name]))
        const onName = w.foundOnSuspectId ? (byId[w.foundOnSuspectId] || w.foundOnSuspectId) : null
        const nearName = w.foundNearSuspectId ? (byId[w.foundNearSuspectId] || w.foundNearSuspectId) : null
        const link = onName ? ` found on ${onName}` : nearName ? ` found near ${nearName}` : ''
        out.push({ type: 'weapon', note: `${suspect.name} referenced a weapon (${name})${link ? ',' + link : ''}.` })
      }
    })
    // Simple time pattern HH:MM
    const timeMatch = reply.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/)
    if (timeMatch) out.push({ type: 'time', note: `${suspect.name} anchored their story to a specific time (${timeMatch[0]}), which can be cross-checked.` })
    // Keywords for alibi/witness
    if (/\balibi\b/i.test(reply)) out.push({ type: 'alibi', note: `${suspect.name} described an alibi that can be verified against others or the timeline.` })
    if (/(saw|heard|witness)/i.test(reply)) out.push({ type: 'witness', note: `${suspect.name} claims firsthand observation (seeing/hearing), suggesting potential corroborating testimony.` })
    return out
  }

  const send = async (text: string) => {
    if (!scenario || !activeSuspectId || !text.trim()) return
    const suspect = (scenario.suspects ?? []).find((s: any) => s.id === activeSuspectId)
    const system = buildSystem(suspect, scenario)
    const next: ChatMessage[] = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setThinking(true)
    try {
      const resp = await chat(system, next, { temperature: 0.7, max_tokens: 180 })
      const reply = resp?.message?.content || '(no response)'
      setMessages([...next, { role: 'assistant' as const, content: reply }])
      // Persist per-suspect history
      setHistories(prev => ({ ...prev, [activeSuspectId]: [...next, { role: 'assistant' as const, content: reply }] }))
      // Track mentioned weapons with partial matching
      const lower = reply.toLowerCase()
      const newlyMentioned = new Set<string>(mentionedWeapons)
      ;(scenario.weapons ?? []).forEach((w: any) => {
        const name = String(w?.name || '')
        const keywords = weaponKeywordMap[name] || []
        if (!name) return
        const hit = lower.includes(name.toLowerCase()) || keywords.some(tok => lower.includes(tok))
        if (hit) newlyMentioned.add(name)
      })
      setMentionedWeapons(newlyMentioned)
      // Extract clues and store
      try {
        const newClues = await extractClues({ reply, lastUserText: text, suspect, scenario })
        const extracted = Array.isArray(newClues) ? newClues : []
        const finalClues = extracted.length ? extracted : localExtractClues(reply, suspect, scenario)
        if (finalClues.length) {
          setClues(prev => {
            const next = [...prev]
            finalClues.forEach(c => {
              if (!next.some(d => d.subject === suspect.name && d.note === c.note)) {
                next.push({ type: c.type, subject: suspect.name, note: c.note })
              }
            })
            return next.length > MAX_CLUES ? next.slice(-MAX_CLUES) : next
          })
        }
      } catch {
        const fallback = localExtractClues(reply, suspect, scenario)
        if (fallback.length) setClues(prev => {
          const next = [...prev]
          fallback.forEach(c => { if (!next.some(d => d.subject === suspect.name && d.note === c.note)) next.push({ type: c.type, subject: suspect.name, note: c.note }) })
          return next.length > MAX_CLUES ? next.slice(-MAX_CLUES) : next
        })
      }
    } catch (e: any) {
      setMessages([...next, { role: 'assistant' as const, content: `Error: ${e.message}` }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 1280, margin: '0 auto' }}>
      {/* Floating timer at upper right while ticking */}
      {startTime && !solved && (
        <div style={{ position: 'fixed', top: 12, right: 16, background: 'rgba(17,24,39,0.9)', color: '#fff', padding: '6px 10px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          ⏱ {formatDuration(elapsedMs)}
        </div>
      )}
      <h1>Murder Mystery</h1>
      <p>Generate a scenario and inspect suspects, relationships, and witnessed events. (It might take a minute)</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        {(!scenario || solved) && (
          <button disabled={loading} onClick={generate}>{loading ? 'Generating…' : (solved ? 'Generate New Mystery' : 'Generate Scenario')}</button>
        )}
        {scenario && (
          <button onClick={() => setDebug(v => !v)}>{debug ? 'Hide Debug' : 'Show Debug'}</button>
        )}
      </div>
  {retryNotice && <p style={{ color: 'crimson', margin: '6px 0' }}>{retryNotice}</p>}
  {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {scenario && (
        <div style={{ marginTop: 16 }}>
          <h2>{scenario.title}</h2>
          <p><strong>Setting:</strong> {scenario.setting}</p>
          {scenario.victim && <p><strong>Victim:</strong> {scenario.victim.name} — <em>{scenario.victim.timeOfDeath}</em></p>}
          <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(600px, 1fr) 360px', gap: 20, alignItems: 'start', marginTop: 8 }}>
            {/* Left sidebar: suspects */}
            <div>
              <h3>Suspects</h3>
              <ul>
    {scenario.suspects?.map((s: any) => (
                  <li key={s.id}>
                    <button onClick={() => openSuspect(s.id)} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '8px 10px', width: '100%', textAlign: 'left', background: activeSuspectId === s.id ? '#eef5ff' : '#fff' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '36px 8px 1fr', alignItems: 'center', columnGap: 8, minHeight: 36 }}>
                        <AvatarFace gender={s.gender} age={s.age} persona={s.persona || s.mannerisms?.join(' ')} size={36} accentColor={suspectColorById[s.id]} />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: suspectColorById[s.id] }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                          <strong style={{ wordBreak: 'break-word' }}>{s.name}</strong>
                          <span style={{ color: '#555', whiteSpace: 'nowrap', flex: '0 0 auto', fontSize: 12, lineHeight: 1 }}>({s.gender}, {s.age})</span>
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
            {/* Center: interrogation panel (bigger, centered column) */}
            <div>
              <h3>Interrogate</h3>
              {!activeSuspectId && <p>Select a suspect to start a conversation.</p>}
              {activeSuspectId && (
                <ChatPanel title={(scenario.suspects ?? []).find((s: any) => s.id === activeSuspectId)?.name || 'Suspect'} thinking={thinking} messages={messages} onSend={send} colorize={colorize} />
              )}
            </div>
            {/* Right sidebar: submit + clues */}
            <div>
              <SubmitPanel scenario={scenario} mentionedWeapons={mentionedWeapons} onSolved={handleSolved} />
              <div style={{ marginTop: 16 }}>
                <h3>Clues</h3>
                {/* Clue Tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0 8px' }}>
                  {['all','motive','contradiction','alibi','witness','weapon','location','time'].map(tab => {
                    const isActive = activeClueTab === tab
                    const count = tab === 'all' ? clues.length : clues.filter(c => c.type === tab).length
                    if (tab !== 'all' && count === 0) return null
                    return (
                      <button key={tab} onClick={() => setActiveClueTab(tab)}
                        style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #ccc', background: isActive ? '#111827' : '#fff', color: isActive ? '#fff' : '#111827', fontSize: 12 }}>
                        {tab} ({count})
                      </button>
                    )
                  })}
                </div>
                {clues.length === 0 ? (
                  <p>No clues yet.</p>
                ) : (
                  <ul style={{ maxHeight: '32vh', overflow: 'auto', paddingRight: 6 }}>
                    {(activeClueTab === 'all' ? clues : clues.filter(c => c.type === activeClueTab)).map((c, i) => (
                      <li key={i}>
                        <span>[{c.type}] </span>
                        <span style={{ color: suspectNameToColor[c.subject] || '#dc2626', fontWeight: 600 }}>{c.subject}</span>
                        <span>: </span>
                        <span dangerouslySetInnerHTML={{ __html: colorize(c.note) }} />
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600 }}>Weapons mentioned</div>
                  {Array.from(mentionedWeapons).length === 0 ? (
                    <div>- none yet</div>
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
          {debug && scenario.relationships?.length > 0 && (
            <>
              <h3>Relationships</h3>
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
              <h3>Witnessed Events</h3>
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
        </div>
      )}
      {debug && scenario && (
        <div style={{ marginTop: 16 }}>
          <h3>Debug: AI Data</h3>
          <DebugPanel scenario={scenario} />
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
