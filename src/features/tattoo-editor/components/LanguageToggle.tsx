import { Languages } from 'lucide-react'

import { LANGUAGES, LANGUAGE_LABELS, useLanguageStore, useT } from '@/i18n'

/**
 * Two languages, so a segmented control beats a dropdown: the alternative is
 * visible without opening anything, and switching is one click.
 */
export function LanguageToggle() {
  const t = useT()
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('language.label')}>
      <Languages size={13} className="text-ink-400" />
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          aria-pressed={code === language}
          // The label stays in its own language — "English" never becomes "Inglés",
          // because the person looking for it is reading in the language they want.
          lang={code}
          className={`rounded-md px-2 py-0.5 text-[11px] transition ${
            code === language
              ? 'bg-ink-800 text-white'
              : 'text-ink-400 hover:text-white'
          }`}
        >
          {LANGUAGE_LABELS[code]}
        </button>
      ))}
    </div>
  )
}
