import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Eraser, X } from 'lucide-react'

import {
  canvasToObjectUrl,
  rasterize,
  removeBackground,
} from '@/features/tattoo-editor/lib/removeBackground'
import { useT } from '@/i18n'

/** Edge length of the interactive preview. Keeps the tolerance slider responsive. */
const PREVIEW_EDGE = 480

/**
 * Deliberately conservative. Measured against white paper: at 0.16 a pale yellow
 * or pale pink is erased along with the background, at 0.08 white and off-white
 * scans still drop to zero alpha while pale colours survive. Failing toward
 * leaving background behind is recoverable with the slider; failing toward
 * eating the artwork looks like the tool is broken.
 */
const DEFAULT_TOLERANCE = 0.08

export interface AcceptedDesign {
  name: string
  textureUrl: string
  aspect: number
}

interface DesignPreviewDialogProps {
  file: File
  onAccept: (design: AcceptedDesign) => void
  onCancel: () => void
}

/**
 * Confirmation step between picking a file and placing it on the model.
 *
 * Exists because an upload is not reversible in a useful way once the design is
 * on the skin, and because formats without an alpha channel need background
 * removal before they are usable as a tattoo at all.
 */
export function DesignPreviewDialog({ file, onAccept, onCancel }: DesignPreviewDialogProps) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<ImageBitmap | null>(null)

  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [shouldRemoveBackground, setShouldRemoveBackground] = useState(false)
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE)
  const [hasError, setHasError] = useState<'read' | 'process' | null>(null)

  // JPEG carries no alpha channel, so its background is always opaque. Placed
  // as-is it renders a solid rectangle on the skin rather than a tattoo.
  const lacksAlpha = file.type === 'image/jpeg'

  useEffect(() => {
    // `cancelled` is not optional here. StrictMode mounts, cleans up, and mounts
    // again, so without it the discarded first decode can still reach setState
    // and leave a permanent error on a perfectly valid file.
    let cancelled = false
    let bitmap: ImageBitmap | null = null

    createImageBitmap(file)
      .then((decoded) => {
        if (cancelled) {
          decoded.close()
          return
        }
        bitmap = decoded
        imageRef.current = decoded
        setHasError(null)
        setIsReady(true)
      })
      .catch(() => {
        if (!cancelled) setHasError('read')
      })

    return () => {
      cancelled = true
      bitmap?.close()
      imageRef.current = null
      setIsReady(false)
    }
  }, [file])

  useEffect(() => {
    if (lacksAlpha) setShouldRemoveBackground(true)
  }, [lacksAlpha])

  const renderPreview = useCallback(() => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return

    const small = rasterize(image, PREVIEW_EDGE)
    const result = shouldRemoveBackground ? removeBackground(small, tolerance) : small

    canvas.width = result.width
    canvas.height = result.height
    canvas.getContext('2d')?.drawImage(result, 0, 0)
  }, [shouldRemoveBackground, tolerance])

  useEffect(() => {
    if (isReady) renderPreview()
  }, [isReady, renderPreview])

  async function handleAccept() {
    const image = imageRef.current
    if (!image) return

    setIsProcessing(true)
    try {
      const full = rasterize(image)
      const processed = shouldRemoveBackground ? removeBackground(full, tolerance) : full
      const textureUrl = await canvasToObjectUrl(processed)

      onAccept({
        name: file.name,
        textureUrl,
        aspect: processed.width / processed.height,
      })
    } catch {
      setHasError('process')
      setIsProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('preview.title')}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t('preview.title')}</h2>
            <p className="truncate text-xs text-ink-400">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.close')}
            className="text-ink-400 transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Checkerboard reveals which areas are actually transparent. */}
        <div
          className="flex min-h-56 items-center justify-center rounded-lg border border-ink-700 p-3"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #2a2a31 25%, transparent 25%), linear-gradient(-45deg, #2a2a31 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a31 75%), linear-gradient(-45deg, transparent 75%, #2a2a31 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        >
          {hasError ? (
            <p className="text-xs text-red-400">
              {t(hasError === 'read' ? 'error.readImage' : 'error.processImage')}
            </p>
          ) : (
            <canvas ref={canvasRef} className="max-h-56 max-w-full object-contain" />
          )}
        </div>

        {lacksAlpha && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span>{t('preview.jpegWarning')}</span>
          </p>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={shouldRemoveBackground}
            onChange={(event) => setShouldRemoveBackground(event.target.checked)}
            className="size-4 accent-accent"
          />
          <Eraser size={15} className="text-ink-400" />
          {t('preview.removeBackground')}
        </label>

        {shouldRemoveBackground && (
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-ink-400">
              {t('preview.tolerance')}
              <span>{Math.round(tolerance * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.02}
              max={0.5}
              step={0.01}
              value={tolerance}
              onChange={(event) => setTolerance(Number(event.target.value))}
              className="accent-accent"
            />
            <span className="text-ink-400">{t('preview.toleranceHint')}</span>
          </label>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-ink-700 px-4 py-2.5 text-sm transition hover:bg-ink-800"
          >
            {t('preview.cancel')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!isReady || isProcessing || hasError !== null}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Check size={16} />
            {isProcessing ? t('preview.processing') : t('preview.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
