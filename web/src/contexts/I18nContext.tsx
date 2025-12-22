import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getCurrentLanguage,
  setLanguage as setLanguageStore,
  subscribe,
  toggleLanguage as toggleLanguageStore,
  translateFrom,
  translateRich,
  type Language,
  type TemplateValues,
  type TranslationValue,
} from '@/i18n'

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: string, values?: TemplateValues) => string
  tm: <T = TranslationValue>(key: string) => T | undefined
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage())

  useEffect(() => {
    const unsubscribe = subscribe((nextLang) => setLanguageState(nextLang))
    return () => {
      unsubscribe()
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageStore(lang)
  }, [])

  const toggleLanguage = useCallback(() => {
    toggleLanguageStore()
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const translate = (key: string, values?: TemplateValues) =>
      translateFrom(language, key, values) ?? key

    const translateRichValue = <T,>(key: string) =>
      translateRich<T>(language, key)

    return {
      language,
      setLanguage,
      toggleLanguage,
      t: translate,
      tm: translateRichValue,
    }
  }, [language, setLanguage, toggleLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
