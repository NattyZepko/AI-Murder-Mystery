import React from 'react'

export function SubmitPanel({ scenario, mentionedWeapons, onSolved }: { scenario: any, mentionedWeapons: Set<string>, onSolved?: () => void }) {
  const [selectedSuspectIndex, setSelectedSuspectIndex] = React.useState<number>(-1)
  const [selectedWeaponIndex, setSelectedWeaponIndex] = React.useState<number>(-1)
  const [result, setResult] = React.useState<string>('')
  const [cooldown, setCooldown] = React.useState<number>(0)
  const timerRef = React.useRef<number | null>(null)

  const suspects: any[] = Array.isArray(scenario?.suspects) ? scenario.suspects : []
  const allWeapons: any[] = Array.isArray(scenario?.weapons) ? scenario.weapons : []
  const mentionedLower = new Set(Array.from(mentionedWeapons).map(w => String(w).toLowerCase()))
  const revealedWeapons = allWeapons.filter(w => mentionedLower.has(String(w?.name || '').toLowerCase()))

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null } }
  }, [])

  const startCooldown = (seconds = 5) => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
    setCooldown(seconds)
    timerRef.current = window.setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const submit = () => {
    if (cooldown > 0) return
    if (selectedSuspectIndex < 0) { setResult('Pick a suspect.'); return }
    if (revealedWeapons.length === 0) { setResult('You have not collected enough evidence yet. Mention some weapons in suspects\' dialogue.'); return }
    if (selectedWeaponIndex < 0) { setResult('Pick a weapon from the revealed list.'); return }
    const suspect = suspects[selectedSuspectIndex]
    const weapon = revealedWeapons[selectedWeaponIndex]
    const truthGuiltyId = scenario?.truth?.guiltySuspectId
    const truthWeaponId = scenario?.truth?.murderWeaponId
    const okSuspect = truthGuiltyId && suspect?.id === truthGuiltyId
    const okWeapon = truthWeaponId && weapon?.id === truthWeaponId
    if (okSuspect && okWeapon) {
      const motive = scenario?.truth?.motiveCore || (suspect?.motive || '')
      const contras: string[] = Array.isArray(scenario?.truth?.keyContradictions) ? scenario.truth.keyContradictions : []
      setResult(`Correct. ${suspect.name} used the ${weapon.name}. Motive: ${motive}${contras.length ? ' | Key contradictions: ' + contras.join('; ') : ''}`)
      if (onSolved) onSolved()
    } else {
      setResult('Not quite. Keep investigating and try again.')
      startCooldown(5)
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <h3>Submit Conclusion</h3>
      <div>
        <div style={{ fontWeight: 600, marginTop: 6 }}>Suspect</div>
        <select value={selectedSuspectIndex} onChange={e => setSelectedSuspectIndex(parseInt(e.target.value, 10))}>
          <option value={-1}>Select...</option>
          {suspects.map((s, idx) => (
            <option key={s.id} value={idx}>{idx + 1}. {s.name} ({s.gender}, {s.age})</option>
          ))}
        </select>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginTop: 6 }}>Weapon (only revealed)</div>
        {revealedWeapons.length === 0 ? (
          <div style={{ color: '#666' }}>No weapons revealed by dialogue yet.</div>
        ) : (
          <select value={selectedWeaponIndex} onChange={e => setSelectedWeaponIndex(parseInt(e.target.value, 10))}>
            <option value={-1}>Select...</option>
            {revealedWeapons.map((w, idx) => (
              <option key={w.id} value={idx}>{idx + 1}. {w.name}</option>
            ))}
          </select>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={submit} disabled={cooldown > 0}>
          {cooldown > 0 ? `Try in ${cooldown}s` : 'Submit'}
        </button>
      </div>
      {result && <div style={{ marginTop: 8 }}>{result}</div>}
    </div>
  )
}
