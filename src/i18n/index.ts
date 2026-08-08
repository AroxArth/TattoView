/**
 * Language selection and lookup.
 *
 * SPANISH IS THE DEFAULT, and deliberately not negotiated with the browser. This
 * is a tool for a specific studio and its clients; a visitor whose laptop reports
 * `en-US` should still land in Spanish. What the browser reports is a guess about
 * a person, and guessing wrong on the first screen is worse than being predictable.
 * An explicit choice is remembered, and that choice always wins.
 */
import { useCallback } from 'react'
import { create } from 'zustand'

import { DICTIONARY, LANGUAGES } from '@/i18n/dictionary'
import type { Language, TranslationKey } from '@/i18n/dictionary'

const STORAGE_KEY = 'tattooview.language'

const DEFAULT_LANGUAGE: Language = 'es'

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/** Private-mode browsers throw on storage access, which must not break the app. */
function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function persist(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // A preference that cannot be saved is still a preference for this session.
  }
}

/** Keeps the document in sync for screen readers, spellcheck and hyphenation. */
function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = language
}

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>((set) => {
  const initial = readStoredLanguage()
  applyDocumentLanguage(initial)

  return {
    language: initial,
    setLanguage: (language) => {
      persist(language)
      applyDocumentLanguage(language)
      set({ language })
    },
  }
})

export type TranslateParams = Record<string, string | number>

export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  // Falling back to the key keeps a missing entry visible and greppable instead of
  // rendering an empty label. Reachable only through the id-to-key casts in
  // `model-labels.ts`; every literal key is checked by the compiler.
  const template = DICTIONARY[language][key] ?? key
  if (!params) return template

  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  )
}

export type Translate = (key: TranslationKey, params?: TranslateParams) => string

/** Subscribes the component to language changes and returns a lookup function. */
export function useT(): Translate {
  const language = useLanguageStore((s) => s.language)
  return useCallback(
    (key: TranslationKey, params?: TranslateParams) => translate(language, key, params),
    [language],
  )
}

/**
 * An error that knows which message to show without knowing the language.
 *
 * Library code throwing a literal English sentence would either leak that sentence
 * into a Spanish UI or force every lib module to subscribe to the language store.
 * Carrying the key instead keeps the decision where the rendering happens.
 */
export class TranslatedError extends Error {
  // Declared explicitly rather than as a constructor parameter property: the
  // project builds with `erasableSyntaxOnly`, so nothing may survive type
  // stripping as runtime behaviour.
  readonly key: TranslationKey

  constructor(key: TranslationKey) {
    // The key doubles as the `message`, so an uncaught throw is still traceable.
    super(key)
    this.name = 'TranslatedError'
    this.key = key
  }
}

/** Resolves any thrown value to a message, falling back for unexpected errors. */
export function messageFor(t: Translate, error: unknown, fallback: TranslationKey): string {
  return error instanceof TranslatedError ? t(error.key) : t(fallback)
}

export { LANGUAGES, LANGUAGE_LABELS } from '@/i18n/dictionary'
export type { Language, TranslationKey } from '@/i18n/dictionary'
