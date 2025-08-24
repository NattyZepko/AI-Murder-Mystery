import React from 'react'

type Props = {
  gender?: string
  age?: number
  persona?: string
  size?: number // px
  accentColor?: string // suspect color for clothing/accents
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return h >>> 0
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function subSeed(seed: number, salt: number) { return (seed ^ (salt * 2654435761)) >>> 0 }
function chance(seed: number, denom: number) { return (seed % denom) === 0 }
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }

function getMood(persona?: string): 'angry'|'sad'|'happy'|'neutral'|'nervous'|'icy' {
  const p = (persona || '').toLowerCase()
  if (/angry|furious|bitter|hostile/.test(p)) return 'angry'
  if (/grief|sad|melanch|tearful|mourning/.test(p)) return 'sad'
  if (/funny|cheer|bubbly|friendly|warm|charm/.test(p)) return 'happy'
  if (/nervous|frantic|anxious|fidget/.test(p)) return 'nervous'
  if (/icy|cold|arrogant|aloof|stoic/.test(p)) return 'icy'
  return 'neutral'
}

function skinTone(seed: number): string {
  // A small palette spanning different skin tones
  const tones = ['#F9D7B9','#EDC2A2','#D6A184','#B87E5A','#9C684A','#7A4F36']
  return pick(tones, seed)
}

function hairColor(seed: number): string {
  // Natural palette plus occasional dyed colors
  const natural = ['#2f1e12','#3b2a1b','#513a2a','#704a2a','#2b2b2b','#0f0f0f','#654321','#80461b',
    '#d8b384', /* blonde */ '#f0d9b5', /* light blonde */ '#b36b3f', /* auburn */ '#a63a2b', /* red */ '#bfbfbf', /* gray */ '#d9d9d9' /* silver */]
  const dyed = ['#4a90e2', /* blue */ '#ff6fae', /* pink */ '#8e44ad', /* purple */ '#2ecc71', /* green */ '#ff8c00' /* orange */]
  const useDyed = chance(subSeed(seed, 17), 7) // ~1/7 chance
  const palette = useDyed ? dyed : natural
  return pick(palette, seed + 13)
}

function hairStyle(gender?: string, persona?: string, seed = 0): 'short'|'long'|'bangs'|'bun'|'ponytail'|'curly'|'shaved'|'mohawk' {
  const g = (gender || '').toLowerCase()
  const p = (persona || '').toLowerCase()
  if (g === 'female') {
    if (/icy|arrogant|executive/.test(p)) return 'bun'
    if (/funny|bubbly|artist|free/.test(p)) return 'bangs'
    const opts: any = ['long','bangs','ponytail','curly']
    return pick(opts, subSeed(seed, 3)) as any
  }
  if (g === 'male') {
    const opts: any = ['short','short','bangs','curly','mohawk','shaved']
    return pick(opts, subSeed(seed, 4)) as any
  }
  return pick(['short','long','bangs','curly'], subSeed(seed, 5)) as any
}

export function AvatarFace({ gender, age, persona, size = 36, accentColor }: Props) {
  const seed = hashCode([gender || '', String(age ?? ''), persona || ''].join('|'))
  const mood = getMood(persona)
  const skin = skinTone(seed)
  const hair = hairColor(seed)
  const style = hairStyle(gender, persona, seed)
  const stroke = '#222'
  const eyeY = 12
  const eyeDX = 5 + (subSeed(seed, 7) % 3) // 5–7
  const baseEye = 1.3 + ((subSeed(seed, 9) % 10) / 10) // 1.3–2.2
  const eyeR = clamp(baseEye + ((gender || '').toLowerCase() === 'female' ? 0.2 : 0), 1.2, 2.4)
  const browOffset = 3.5
  const mouthY = 17
  const wrinkled = typeof age === 'number' && age >= 55
  const w = size, h = size

  // Mouth path by mood
  let mouthPath = ''
  if (mood === 'happy') mouthPath = `M ${12-4} ${mouthY} Q 12 ${mouthY+3} ${12+4} ${mouthY}`
  else if (mood === 'sad' || mood === 'angry') mouthPath = `M ${12-4} ${mouthY+2} Q 12 ${mouthY-1.5} ${12+4} ${mouthY+2}`
  else if (mood === 'nervous') mouthPath = `M ${12-2.5} ${mouthY} L ${12+2.5} ${mouthY}`
  else if (mood === 'icy') mouthPath = `M ${12-4} ${mouthY} L ${12+4} ${mouthY}`
  else mouthPath = `M ${12-3.5} ${mouthY} Q 12 ${mouthY+1} ${12+3.5} ${mouthY}`

  // Brows by mood
  const browLeft = (() => {
    if (mood === 'angry') return `M ${12-eyeDX-2} ${eyeY-browOffset} L ${12-eyeDX+2} ${eyeY-browOffset-1.5}`
    if (mood === 'sad') return `M ${12-eyeDX-2} ${eyeY-browOffset-0.5} L ${12-eyeDX+2} ${eyeY-browOffset-0.2}`
    return `M ${12-eyeDX-2} ${eyeY-browOffset} L ${12-eyeDX+2} ${eyeY-browOffset}`
  })()
  const browRight = (() => {
    if (mood === 'angry') return `M ${12+eyeDX-2} ${eyeY-browOffset-1.5} L ${12+eyeDX+2} ${eyeY-browOffset}`
    if (mood === 'sad') return `M ${12+eyeDX-2} ${eyeY-browOffset-0.2} L ${12+eyeDX+2} ${eyeY-browOffset-0.5}`
    return `M ${12+eyeDX-2} ${eyeY-browOffset} L ${12+eyeDX+2} ${eyeY-browOffset}`
  })()

  // Hair shapes
  const hairPath = (() => {
    if (style === 'bun') return `M 4 8 C 8 2, 16 2, 20 8 L 20 9 C 18 6, 6 6, 4 9 Z M 9 3 A 3 3 0 1 0 15 3 A 3 3 0 1 0 9 3 Z`
    if (style === 'long') return `M 4 10 C 6 3, 18 3, 20 10 L 20 20 C 16 22, 8 22, 4 20 Z`
    if (style === 'bangs') return `M 4 8 C 8 4, 16 4, 20 8 L 20 10 C 16 8, 8 8, 4 10 Z`
    if (style === 'ponytail') return `M 4 8 C 8 3, 16 3, 20 8 L 20 9 C 17 7, 7 7, 4 9 Z M 18 7 C 21 9, 21 14, 18 16`
    if (style === 'curly') return `M 4 8 C 6 4, 9 4, 11 7 C 13 4, 16 4, 20 8 L 20 10 C 16 8, 8 8, 4 10 Z`
    if (style === 'shaved') return `M 4 8 C 8 6, 16 6, 20 8 L 20 8.5 C 16 7.5, 8 7.5, 4 8.5 Z`
    if (style === 'mohawk') return `M 4 8 C 8 4, 16 4, 20 8 L 20 9 C 16 7, 8 7, 4 9 Z M 11.5 2 L 12.5 2 L 12.5 10 L 11.5 10 Z`
    return `M 4 8 C 8 4, 16 4, 20 8 L 20 9 C 16 7, 8 7, 4 9 Z`
  })()
  // Hair fringe/overlay drawn in front so hair is clearly visible
  const hairFront = (() => {
    if (style === 'bangs') return `M 6 9 C 9 7.5, 15 7.5, 18 9 L 18 10 C 15 9, 9 9, 6 10 Z`
    if (style === 'long') return `M 6.5 9.5 C 9 8.5, 15 8.5, 17.5 9.5 L 17.5 10.2 C 15 9.6, 9 9.6, 6.5 10.2 Z`
    if (style === 'ponytail') return `M 6.5 9 C 9 8, 15 8, 17.5 9 L 17.5 9.8 C 15 9, 9 9, 6.5 9.8 Z`
    if (style === 'curly') return `M 6.2 9 C 8 8, 10 8.2, 12 8.8 C 14 8.2, 16 8, 17.8 9 L 17.8 10 C 16 9.4, 8 9.4, 6.2 10 Z`
    if (style === 'bun') return `M 7 8.6 C 10 7.8, 14 7.8, 17 8.6 L 17 9.4 C 14 8.8, 10 8.8, 7 9.4 Z`
    return ''
  })()

  // Slight face outline shade varies by age
  const strokeWidth = age && age > 60 ? 1.2 : 1

  const female = (gender || '').toLowerCase() === 'female'
  const male = (gender || '').toLowerCase() === 'male'
  // Eyelashes for feminine look
  const lashes = female ? [
    `M ${12-eyeDX-1.5} ${eyeY-1.5} L ${12-eyeDX-2.5} ${eyeY-2.5}`,
    `M ${12-eyeDX+1.5} ${eyeY-1.5} L ${12-eyeDX+2.5} ${eyeY-2.5}`,
    `M ${12+eyeDX-1.5} ${eyeY-1.5} L ${12+eyeDX-2.5} ${eyeY-2.5}`,
    `M ${12+eyeDX+1.5} ${eyeY-1.5} L ${12+eyeDX+2.5} ${eyeY-2.5}`,
  ] : []
  // Occasional stubble for masculine look
  const hasStubble = male && ((seed % 3) === 0)
  const hasBeard = male && chance(subSeed(seed, 21), 5)
  const hasMoustache = male && chance(subSeed(seed, 23), 4)
  const hasGlasses = chance(subSeed(seed, 25), 4)
  const hasEarrings = female && chance(subSeed(seed, 27), 3)
  const hasFreckles = chance(subSeed(seed, 29), 3) && !wrinkled
  const hasScar = male && chance(subSeed(seed, 31), 6)
  const hasHat = chance(subSeed(seed, 33), 5)
  const hatStyle = pick(['cap','beanie','brim'], subSeed(seed, 35))
  const cloth = accentColor || '#6b7280'

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: 'block', width: w, height: h, minWidth: w, minHeight: h, flex: '0 0 auto' }}
    >
      {/* Clothing (shoulders) tinted by suspect color */}
      <path d={`M 2 24 L 22 24 L 20 18 C 16 17 8 17 4 18 Z`} fill={cloth} opacity={0.9} />
      {/* Hair behind */}
      <path d={hairPath} fill={hair} />
      {/* Head */}
      <circle cx={12} cy={12} r={9} fill={skin} stroke={stroke} strokeWidth={strokeWidth} />
  {/* Hair front overlay (for visibility) */}
  {hairFront && <path d={hairFront} fill={hair} />}
      {/* Hat (optional) */}
      {hasHat && (
        hatStyle === 'cap' ? (
          <>
            <path d={`M 5 7 C 8 4, 16 4, 19 7 L 19 9 C 15 7.5, 9 7.5, 5 9 Z`} fill={cloth} />
            <path d={`M 19 8 C 21 8.5, 22 9, 22.5 10`} stroke={cloth} strokeWidth={1} />
          </>
        ) : hatStyle === 'beanie' ? (
          <>
            <path d={`M 5 8 C 8 5, 16 5, 19 8 L 19 9 C 16 8, 8 8, 5 9 Z`} fill={cloth} />
            <circle cx={12} cy={5.5} r={1} fill={cloth} />
          </>
        ) : (
          <>
            <path d={`M 5 7 C 8 4, 16 4, 19 7 L 19 8 C 16 7, 8 7, 5 8 Z`} fill={cloth} />
            <path d={`M 3 9 C 8 8, 16 8, 21 9`} stroke={cloth} strokeWidth={1.2} />
          </>
        )
      )}
      {/* Eyes */}
      <circle cx={12-eyeDX} cy={eyeY} r={eyeR} fill={stroke} />
      <circle cx={12+eyeDX} cy={eyeY} r={eyeR} fill={stroke} />
      {/* Brows */}
      <path d={browLeft} stroke={stroke} strokeWidth={male ? 1.2 : 0.8} strokeLinecap="round" />
      <path d={browRight} stroke={stroke} strokeWidth={male ? 1.2 : 0.8} strokeLinecap="round" />
      {/* Eyelashes for female */}
      {lashes.map((d, i) => (
        <path key={i} d={d} stroke={stroke} strokeWidth={0.6} strokeLinecap="round" />
      ))}
      {/* Mouth */}
      <path d={mouthPath} stroke={stroke} strokeWidth={1} fill="none" strokeLinecap="round" />
      {/* Glasses */}
      {hasGlasses && (
        <>
          <circle cx={12-eyeDX} cy={eyeY} r={eyeR+1.2} fill="none" stroke={stroke} strokeWidth={0.6} />
          <circle cx={12+eyeDX} cy={eyeY} r={eyeR+1.2} fill="none" stroke={stroke} strokeWidth={0.6} />
          <path d={`M ${12-eyeDX+eyeR+1.2} ${eyeY} L ${12+eyeDX-eyeR-1.2} ${eyeY}`} stroke={stroke} strokeWidth={0.6} />
        </>
      )}
      {/* Freckles */}
      {hasFreckles && (
        <>
          {Array.from({ length: 6 }).map((_, i) => {
            const sx = (subSeed(seed, 100 + i) % 7) - 3 // -3..3
            const sy = (subSeed(seed, 200 + i) % 3) // 0..2
            return <circle key={i} cx={12 + sx} cy={14 + sy} r={0.35} fill="#8b5e3c" opacity={0.7} />
          })}
        </>
      )}
      {/* Subtle stubble */}
      {hasStubble && (
        <path d={`M ${12-6} ${mouthY+2.5} Q 12 ${mouthY+4.5} ${12+6} ${mouthY+2.5}`} stroke="#444" strokeWidth={0.6} opacity={0.45} />
      )}
      {/* Beard / Moustache */}
      {hasBeard && (
        <path d={`M ${12-6.5} ${mouthY+1.5} Q 12 ${mouthY+6} ${12+6.5} ${mouthY+1.5}`} stroke="#333" strokeWidth={1} opacity={0.5} />
      )}
      {hasMoustache && (
        <path d={`M ${12-4} ${mouthY-1.5} Q 12 ${mouthY} ${12+4} ${mouthY-1.5}`} stroke="#333" strokeWidth={1} opacity={0.7} />
      )}
      {/* Scar (male only, small) */}
      {hasScar && (
        <path d={`M ${9.6} ${14.2} L ${10.6} ${15.2}`} stroke="#8b0000" strokeWidth={0.45} opacity={0.65} />
      )}
      {/* Wrinkles for older characters */}
      {wrinkled && (
        <>
          <path d={`M ${12-eyeDX-2} ${eyeY+2.5} L ${12-eyeDX+2} ${eyeY+2.5}`} stroke="#555" strokeWidth={0.5} />
          <path d={`M ${12+eyeDX-2} ${eyeY+2.5} L ${12+eyeDX+2} ${eyeY+2.5}`} stroke="#555" strokeWidth={0.5} />
        </>
      )}
      {/* Earrings */}
      {hasEarrings && (
        <>
          <circle cx={5} cy={15} r={0.9} fill="#d4af37" />
          <circle cx={19} cy={15} r={0.9} fill="#d4af37" />
        </>
      )}
    </svg>
  )
}

export default AvatarFace
