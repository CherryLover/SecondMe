import { translations, type Language, type TranslationValue } from './translations'

const STORAGE_KEY = 'secondme_lang'
const DEFAULT_LANGUAGE: Language = 'zh'

type TemplateValues = Record<string, string | number>
type Subscriber = (lang: Language) => void

let currentLanguage: Language = DEFAULT_LANGUAGE
const subscribers = new Set<Subscriber>()

const isBrowser = typeof window !== 'undefined'

if (isBrowser) {
  const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null
  if (saved === 'zh' || saved === 'en') {
    currentLanguage = saved
  }
}

const getValueByKey = (lang: Language, key: string): TranslationValue | undefined => {
  const segments = key.split('.')
  let current: TranslationValue | undefined = translations[lang]

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, TranslationValue>)[segment]
    } else {
      current = undefined
      break
    }
  }

  return current
}

const interpolate = (template: string, values?: TemplateValues) => {
  if (!values) return template
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const trimmed = key.trim()
    return Object.prototype.hasOwnProperty.call(values, trimmed)
      ? String(values[trimmed])
      : ''
  })
}

export const getCurrentLanguage = () => currentLanguage

export const setLanguage = (lang: Language) => {
  if (lang === currentLanguage) return
  currentLanguage = lang
  if (isBrowser) {
    window.localStorage.setItem(STORAGE_KEY, lang)
  }
  subscribers.forEach((listener) => listener(lang))
}

export const toggleLanguage = () => {
  setLanguage(currentLanguage === 'zh' ? 'en' : 'zh')
}

export const subscribe = (listener: Subscriber) => {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

export const translateFrom = (lang: Language, key: string, values?: TemplateValues) => {
  const value = getValueByKey(lang, key)
  if (typeof value === 'string') {
    return interpolate(value, values)
  }
  return undefined
}

export const translateRich = <T = TranslationValue>(lang: Language, key: string): T | undefined => {
  return getValueByKey(lang, key) as T | undefined
}

export const t = (key: string, values?: TemplateValues) => {
  return translateFrom(currentLanguage, key, values) ?? key
}

export const tr = <T = TranslationValue>(key: string): T | undefined => {
  return translateRich<T>(currentLanguage, key)
}

export { translations }
export type { Language, TemplateValues }
export type { TranslationValue } from './translations'
