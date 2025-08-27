export type Translations = typeof import('./English.json')

export type LocaleShape = Translations & Record<string, any>
