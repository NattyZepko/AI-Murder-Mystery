import React from 'react'

export function DebugPanel({ scenario }: { scenario: any }) {
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
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>Field</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>Title</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.title}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>Setting</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.setting}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>Victim</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.victim?.name} — {scenario.victim?.timeOfDeath}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>Truth (guiltySuspectId)</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.truth?.guiltySuspectId} {nameById[scenario.truth?.guiltySuspectId] ? `(${nameById[scenario.truth?.guiltySuspectId]})` : ''}</td></tr>
            <tr><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>Truth (murderWeaponId)</td><td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{scenario.truth?.murderWeaponId}</td></tr>
            <tr><td style={{ padding: 6, borderRight: '1px solid #eee' }}>Motive core</td><td style={{ padding: 6, borderRight: '1px solid #eee' }}>{scenario.truth?.motiveCore}</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <h4>Suspects</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr>
              {['name','gender','age','isGuilty','motive','alibi','verifiedBy'].map((h) => (
                <th key={h} onClick={() => setSuspectSort(prev => ({ key: h === 'verifiedBy' ? 'alibiVerifiedBy' : h, dir: prev.key === (h === 'verifiedBy' ? 'alibiVerifiedBy' : h) && prev.dir === 'asc' ? 'desc' : 'asc' }))}
                    style={{ textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                  {h}
                  {suspectSort.key === (h === 'verifiedBy' ? 'alibiVerifiedBy' : h) ? (suspectSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSuspects.map((s: any) => (
              <tr key={s.id}>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.name}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.gender}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.age}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{String(Boolean(s.isGuilty))}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.motive || ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{s.alibi || ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(s.alibiVerifiedBy || []).map((id: string) => nameById[id] || id).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4>Weapons</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr>
              {['name','isMurderWeapon','foundOn','foundNear'].map((h) => (
                <th key={h} onClick={() => setWeaponSort(prev => ({ key: h === 'foundOn' ? 'foundOnSuspectId' : h === 'foundNear' ? 'foundNearSuspectId' : h, dir: prev.key === (h === 'foundOn' ? 'foundOnSuspectId' : h === 'foundNear' ? 'foundNearSuspectId' : h) && prev.dir === 'asc' ? 'desc' : 'asc' }))}
                    style={{ textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                  {h}
                  {weaponSort.key === (h === 'foundOn' ? 'foundOnSuspectId' : h === 'foundNear' ? 'foundNearSuspectId' : h) ? (weaponSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedWeapons.map((w: any) => (
              <tr key={w.id}>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.name}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{String(Boolean(w.isMurderWeapon))}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.foundOnSuspectId ? (nameById[w.foundOnSuspectId] || w.foundOnSuspectId) : ''}</td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.foundNearSuspectId ? (nameById[w.foundNearSuspectId] || w.foundNearSuspectId) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedRels.length > 0 && (
        <div>
          <h4>Relationships</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr>
                {['between','type','secret','note'].map((h) => (
                  <th key={h} onClick={() => setRelSort(prev => ({ key: h === 'secret' ? 'isSecret' : h, dir: prev.key === (h === 'secret' ? 'isSecret' : h) && prev.dir === 'asc' ? 'desc' : 'asc' }))}
                      style={{ textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                    {h}
                    {relSort.key === (h === 'secret' ? 'isSecret' : h) ? (relSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRels.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{[r.between?.[0], r.between?.[1]].map((id: string) => nameById[id] || id).join(' ↔ ')}</td>
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
          <h4>Witnessed Events</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr>
                {['time','description','witnesses','involves'].map((h) => (
                  <th key={h} onClick={() => setEventSort(prev => ({ key: h, dir: prev.key === h && prev.dir === 'asc' ? 'desc' : 'asc' }))}
                      style={{ textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #ccc', padding: 6, borderRight: '1px solid #ddd' }}>
                    {h}
                    {eventSort.key === h ? (eventSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((w: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.time || ''}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{w.description}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(w.witnesses || []).map((id: string) => nameById[id] || id).join(', ')}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{(w.involves || []).map((id: string) => nameById[id] || id).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
