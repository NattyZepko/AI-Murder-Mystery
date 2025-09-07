import React from 'react'
import { useLocale } from '../i18n/LocaleProvider'

export function DebugPanel({ scenario }: { scenario: any }) {
  const en = useLocale()
  const [suspectSort, setSuspectSort] = React.useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [weaponSort, setWeaponSort] = React.useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [relSort, setRelSort] = React.useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'between', dir: 'asc' })
  const [eventSort, setEventSort] = React.useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'time', dir: 'asc' })
  const suspects: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : []
  const weapons: any[] = Array.isArray(scenario?.weapons) ? scenario.weapons : []
  const nameById: Record<string, string> = Object.fromEntries(suspects.map((s: any) => [s.id, s.name]))
  const rels: any[] = Array.isArray(scenario?.relationships) ? scenario.relationships : []
  const events: any[] = Array.isArray(scenario?.witnessedEvents) ? scenario.witnessedEvents : []

  const sortDir = (dir: 'asc' | 'desc') => dir === 'asc' ? 1 : -1
  const sortedSuspects = React.useMemo(() => {
    const arr = [...suspects]
    arr.sort((a: any, b: any) => {
      const k = suspectSort.key
      const av = k === 'name' ? a.name : k === 'gender' ? a.gender : k === 'age' ? a.age : k === 'isGuilty' ? Boolean(a.isGuilty) : (a[k] ?? '')
      const bv = k === 'name' ? b.name : k === 'gender' ? b.gender : k === 'age' ? b.age : k === 'isGuilty' ? Boolean(b.isGuilty) : (b[k] ?? '')
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir(suspectSort.dir)
      return String(av).localeCompare(String(bv)) * sortDir(suspectSort.dir)
    })
    return arr
  }, [suspects, suspectSort])
  const sortedWeapons = React.useMemo(() => {
    const arr = [...(weapons || [])]
    arr.sort((a: any, b: any) => {
      const k = weaponSort.key
      const av = k === 'name' ? a.name : k === 'isMurderWeapon' ? Boolean(a.isMurderWeapon) : (a[k] ?? '')
      const bv = k === 'name' ? b.name : k === 'isMurderWeapon' ? Boolean(b.isMurderWeapon) : (b[k] ?? '')
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir(weaponSort.dir)
      return String(av).localeCompare(String(bv)) * sortDir(weaponSort.dir)
    })
    return arr
  }, [weapons, weaponSort])
  const sortedRels = React.useMemo(() => {
    const arr = [...(rels || [])]
    arr.sort((a: any, b: any) => {
      const k = relSort.key
      const aKey = k === 'between' ? `${nameById[a.between?.[0]] || ''} ${nameById[a.between?.[1]] || ''}` : k === 'type' ? a.type : (a[k] ?? '')
      const bKey = k === 'between' ? `${nameById[b.between?.[0]] || ''} ${nameById[b.between?.[1]] || ''}` : k === 'type' ? b.type : (b[k] ?? '')
      return String(aKey).localeCompare(String(bKey)) * sortDir(relSort.dir)
    })
    return arr
  }, [rels, relSort])
  const sortedEvents = React.useMemo(() => {
    const arr = [...(events || [])]
    arr.sort((a: any, b: any) => {
      const k = eventSort.key
      const aKey = k === 'time' ? (a.time || '') : k === 'description' ? a.description : (a[k] ?? '')
      const bKey = k === 'time' ? (b.time || '') : k === 'description' ? b.description : (b[k] ?? '')
      return String(aKey).localeCompare(String(bKey)) * sortDir(eventSort.dir)
    })
    return arr
  }, [events, eventSort])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>{en.debug.field}</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>{en.debug.value}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{en.debug.title}</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.title}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{en.debug.setting}</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.setting}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{en.debug.victim}</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.victim?.name} — {scenario.victim?.timeOfDeath}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{en.debug.truthGuilty}</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.truth?.guiltySuspectId} {nameById[scenario.truth?.guiltySuspectId] ? `(${nameById[scenario.truth?.guiltySuspectId]})` : ''}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{en.debug.truthWeapon}</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.truth?.murderWeaponId}</td></tr>
            <tr><td style={{ padding: 6, borderRight: '1px solid #eee' }}>{en.debug.motiveCore}</td><td style={{ padding: 6, borderRight: '1px solid #eee' }}>{scenario.truth?.motiveCore}</td></tr>
            <tr><td style={{ padding: 6, borderRight: '1px solid #eee' }}>{en.debug.keyContradictions}</td><td style={{ padding: 6, borderRight: '1px solid #eee' }}>{(scenario.truth?.keyContradictions || []).join('; ')}</td></tr>
            <tr><td style={{ padding: 6, borderRight: '1px solid #eee' }}>{en.debug.rawTruth}</td><td style={{ padding: 6, borderRight: '1px solid #eee', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{JSON.stringify(scenario.truth || {}, null, 2)}</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <h4>{en.debug.suspects}</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr>
              {['id','name','gender','age','isGuilty','motive','alibi','verifiedBy','knowledge','contradictions','mannerisms','quirks','persona','backstory','catchphrase'].map((h) => (
                <th key={h}
                    style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSuspects.map((s: any) => (
              <tr key={s.id}>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.id}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.name}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.gender}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.age}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{String(Boolean(s.isGuilty))}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.motive || ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.alibi || ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(s.alibiVerifiedBy || []).map((id: string) => nameById[id] || id).join(', ')}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(s.knowledge || []).join('; ')}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(s.contradictions || []).join('; ')}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(s.mannerisms || []).join('; ')}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(s.quirks || []).join('; ')}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.persona || ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.backstory || ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.catchphrase || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4>{en.debug.weapons}</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr>
              {['id','name','isMurderWeapon','foundOn','foundNear','discoveredHints','description'].map((h: any) => (
                <th key={String(h)} style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>{String(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedWeapons.map((w: any) => (
              <tr key={w.id}>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.id}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.name}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{String(Boolean(w.isMurderWeapon))}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.foundOnSuspectId ? (nameById[w.foundOnSuspectId] || w.foundOnSuspectId) : ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.foundNearSuspectId ? (nameById[w.foundNearSuspectId] || w.foundNearSuspectId) : ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(w.discoveredHints || []).join('; ')}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.description || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedRels.length > 0 && (
        <div>
          <h4>{en.debug.relationships}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr>
                {en.debug.relColumns.map((h: any) => {
                  const key = String(h)
                  const sortKey = key === 'secret' ? 'isSecret' : key
                  return (
                    <th key={key} onClick={() => setRelSort(prev => ({ key: sortKey, dir: prev.key === sortKey && prev.dir === 'asc' ? 'desc' : 'asc' }))}
                        style={{ textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                      {String(h)}
                      {relSort.key === sortKey ? (relSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRels.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{[r.between?.[0], r.between?.[1]].map((id: string) => nameById[id] || id).join(en.debug.betweenSeparator)}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{r.type}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{String(Boolean(r.isSecret))}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{r.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sortedEvents.length > 0 && (
        <div>
          <h4>{en.debug.witnessedEvents}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr>
                {en.debug.eventColumns.map((h: any) => {
                  const key = String(h)
                  return (
                    <th key={key} onClick={() => setEventSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))}
                        style={{ textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                      {String(h)}
                      {eventSort.key === key ? (eventSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((w: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.time || ''}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.description}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(w.witnesses || []).map((id: string) => nameById[id] || id).join(', ')}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(w.involves || []).map((id: string) => nameById[id] || id).join(', ')}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.source || ''}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Raw scenario JSON for deep debugging */}
      <div>
        <h4>{en.debug.rawScenario}</h4>
        <pre style={{ background: '#f8f8f8', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 400 }}>{JSON.stringify(scenario || {}, null, 2)}</pre>
      </div>
    </div>
  )
}
