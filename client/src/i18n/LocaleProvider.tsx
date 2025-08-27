import React from 'react'
import defaultLocale from './English.json'
import type { LocaleShape } from './types'

const AVAILABLE = ['English', 'Hebrew', 'French'] as const

const LocalContext = React.createContext<{
  locale: LocaleShape
  language: string
  setLanguage: (l: string) => void
  available: string[]
}>({ locale: defaultLocale as LocaleShape, language: 'English', setLanguage() {}, available: AVAILABLE as unknown as string[] })

const LOCALES: Record<string, () => Promise<any>> = {
  English: () => import('./English.json'),
  Hebrew: () => import('./Hebrew.json'),
  French: () => import('./French.json'),
}

async function loadLocale(name: string): Promise<LocaleShape> {
  const loader = LOCALES[name] || LOCALES['English']
  try {
    const mod = await loader()
    return (mod && (mod.default || mod)) as any
  } catch (err) {
    console.warn('Failed to load locale', name, err)
    const mod = await LOCALES['English']()
    return (mod && (mod.default || mod)) as any
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<string>(() => {
    try { return (localStorage.getItem('app.language') as string) || 'English' } catch (_) { return 'English' }
  })
  const [locale, setLocale] = React.useState<LocaleShape>(defaultLocale)

  React.useEffect(() => {
    let mounted = true
    loadLocale(language).then(l => { if (mounted) setLocale(l) })
    try { localStorage.setItem('app.language', language) } catch (_) {}
    // set document direction for RTL languages
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = language === 'Hebrew' ? 'rtl' : 'ltr'
      }
    } catch (_) {}
    return () => { mounted = false }
  }, [language])

  const setLanguage = (l: string) => {
    if (!AVAILABLE.includes(l as any)) l = 'English'
    setLanguageState(l)
  }

  return (
    <LocalContext.Provider value={{ locale, language, setLanguage, available: AVAILABLE as unknown as string[] }}>
      {children}
    </LocalContext.Provider>
  )
}

export function useLocale(): LocaleShape {
  const ctx = React.useContext(LocalContext)
  return ctx.locale as LocaleShape
}

export function useLanguage() {
  const ctx = React.useContext(LocalContext)
  return { language: ctx.language, setLanguage: ctx.setLanguage, available: ctx.available }
}

export default LocaleProvider
