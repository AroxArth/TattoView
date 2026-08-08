import { useState } from 'react'
import { Info, X } from 'lucide-react'

import { BODY_MODELS } from '@/features/body-model/model-catalog'

/**
 * CC-BY-4.0 attribution surface.
 *
 * Every bundled model permits commercial use only on the condition that its
 * author is credited. This dialog is how TattooView satisfies that condition —
 * removing it puts the product in breach of the asset licenses.
 */
export function ModelCredits() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-ink-400 transition hover:text-white"
      >
        <Info size={13} />
        Model credits
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Model credits"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Model credits</h2>
                <p className="mt-1 text-xs text-ink-400">
                  The 3D models in TattooView are used under Creative Commons Attribution.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="text-ink-400 transition hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="flex flex-col gap-4">
              {BODY_MODELS.map(({ id, label, attribution }) => (
                <li key={id} className="rounded-lg border border-ink-700 bg-ink-800 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">
                    This work is based on{' '}
                    <a
                      href={attribution.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      &ldquo;{attribution.title}&rdquo;
                    </a>{' '}
                    by{' '}
                    <a
                      href={attribution.authorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      {attribution.author}
                    </a>{' '}
                    licensed under{' '}
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
