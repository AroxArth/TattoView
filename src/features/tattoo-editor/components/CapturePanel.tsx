import { Camera, Orbit } from 'lucide-react'

import { useEditorStore } from '@/features/tattoo-editor/store/editorStore'
import type { CaptureBackground } from '@/features/tattoo-editor/store/editorStore'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n'

const BACKGROUNDS: { id: CaptureBackground; labelKey: TranslationKey; swatch: string }[] = [
  { id: 'studio', labelKey: 'capture.bg.studio', swatch: '#121215' },
  { id: 'white', labelKey: 'capture.bg.white', swatch: '#ffffff' },
  { id: 'black', labelKey: 'capture.bg.black', swatch: '#000000' },
  // Rendered as a checkerboard so it does not read as "white" in the picker.
  { id: 'transparent', labelKey: 'capture.bg.transparent', swatch: 'transparent' },
]

const SCALES = [1, 2, 3]

const CHECKERBOARD = 'repeating-conic-gradient(#3a3a42 0% 25%, #23232a 0% 50%) 50% / 8px 8px'

export function CapturePanel() {
  const t = useT()
  const background = useEditorStore((s) => s.captureBackground)
  const scale = useEditorStore((s) => s.captureScale)
  const isCapturing = useEditorStore((s) => s.captureRequest !== null)
  const setCaptureBackground = useEditorStore((s) => s.setCaptureBackground)
  const setCaptureScale = useEditorStore((s) => s.setCaptureScale)
  const requestCapture = useEditorStore((s) => s.requestCapture)
  const hasPlacedDesign = useEditorStore((s) => s.designs.some((d) => d.isPlaced))

  return (
    <section className="flex flex-col gap-3 border-t border-ink-700 pt-4">
      <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
        <Camera size={13} />
        {t('capture.title')}
      </h2>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-400">{t('capture.background')}</span>
        <div className="grid grid-cols-4 gap-1.5">
          {BACKGROUNDS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setCaptureBackground(option.id)}
              title={t(option.labelKey)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-[10px] transition ${
                option.id === background
                  ? 'border-accent text-white'
                  : 'border-ink-700 text-ink-400 hover:text-white'
              }`}
            >
              <span
                className="h-5 w-full rounded border border-ink-700"
                style={
                  option.swatch === 'transparent'
                    ? { background: CHECKERBOARD }
                    : { backgroundColor: option.swatch }
                }
              />
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-400">{t('capture.resolution')}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {SCALES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCaptureScale(value)}
              className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                value === scale
                  ? 'border-accent bg-ink-800 text-white'
                  : 'border-ink-700 text-ink-400 hover:text-white'
              }`}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={isCapturing || !hasPlacedDesign}
          onClick={() => requestCapture('current')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Camera size={13} />
          {t('capture.thisView')}
        </button>
        <button
          type="button"
          disabled={isCapturing || !hasPlacedDesign}
          onClick={() => requestCapture('turntable')}
          title={t('capture.fourAnglesHint')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Orbit size={13} />
          {t('capture.fourAngles')}
        </button>
      </div>

      {!hasPlacedDesign && <p className="text-xs text-ink-400">{t('capture.needDesign')}</p>}
    </section>
  )
}
