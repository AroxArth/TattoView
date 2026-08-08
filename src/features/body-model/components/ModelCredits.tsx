import { useState } from 'react'
import { Info, X } from 'lucide-react'

import { BODY_MODELS } from '@/features/body-model/model-catalog'
import { modelLabelKey } from '@/features/body-model/model-labels'
import { useT } from '@/i18n'

/**
 * CC-BY-4.0 attribution surface.
 *
 * Every bundled model permits commercial use only on the condition that its
 * author is credited. This dialog is how TattooView satisfies that condition —
 * removing it puts the product in breach of the asset licenses.
 *
 * The connecting words are translated; the title, author and license name are not.
 * Those are the identifiers the license requires to be reproduced, so they stay
 * exactly as their authors published them in every language.
 */
export function ModelCredits() {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-ink-400 transition hover:text-white"
      >
        <Info size={13} />
        {t('credits.button')}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('credits.button')}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">{t('credits.button')}</h2>
                <p className="mt-1 text-xs text-ink-400">{t('credits.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
                className="text-ink-400 transition hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="flex flex-col gap-4">
              {BODY_MODELS.map(({ id, attribution }) => (
                <li key={id} className="rounded-lg border border-ink-700 bg-ink-800 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    {t(modelLabelKey(id))}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">
                    {t('credits.basedOn')}{' '}
                    <a
                      href={attribution.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      &ldquo;{attribution.title}&rdquo;
                    </a>{' '}
                    {t('credits.by')}{' '}
                    <a
                      href={attribution.authorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      {attribution.author}
                    </a>{' '}
                    {t('credits.licensedUnder')}{' '}
                    <a
                      href={attribution.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      {attribution.license}
                    </a>
                    .
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
