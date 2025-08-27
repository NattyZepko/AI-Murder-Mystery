import React from 'react'
import type { ChatMessage } from '../types'
import { useLocale } from '../i18n/LocaleProvider'

export function ChatPanel({ title, messages, onSend, thinking, colorize }: { title: string, messages: ChatMessage[], onSend: (text: string) => void, thinking: boolean, colorize?: (text: string) => string }) {
  const [input, setInput] = React.useState('')
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const en = useLocale()

  React.useEffect(() => {
    const el = listRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, thinking])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t) return
    onSend(t)
    setInput('')
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div ref={listRef} style={{ height: '60vh', overflow: 'auto', padding: 8, background: '#2c2a49ff', borderRadius: 6, marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '8px 10px', borderRadius: 8, background: m.role === 'user' ? '#6c36d1ff' : '#519b7eff' }}>
              <div style={{ fontSize: 12, color: '#f3b8b8ff', marginBottom: 4 }}>{m.role === 'user' ? en.chat.you : en.chat.suspect}</div>
              {m.role === 'assistant' && colorize ? (
                <div dangerouslySetInnerHTML={{ __html: colorize(m.content) }} />
              ) : (
                <div>{m.content}</div>
              )}
            </div>
          </div>
        ))}
  {thinking && <div style={{ fontStyle: 'italic', color: '#ffffffff' }}>{en.chat.thinking}</div>}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
  <input value={input} onChange={e => setInput(e.target.value)} placeholder={en.chat.placeholder} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }} />
  <button type="submit" disabled={thinking} style={{ padding: '8px 12px' }}>{en.chat.send}</button>
      </form>
    </div>
  )
}
