import { useRef, useState } from 'react'
import { Crosshair, ImagePlus, Ruler, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ModelCredits } from '@/features/body-model/components/ModelCredits'
import { BODY_MODELS, getModel } from '@/features/body-model/model-catalog'
import { SKIN_TONES } from '@/features/body-model/skin-tones'
import { CapturePanel } from '@/features/tattoo-editor/components/CapturePanel'
import { DesignPreviewDialog } from '@/features/tattoo-editor/components/DesignPreviewDialog'
import type { AcceptedDesign } from '@/features/tattoo-editor/components/DesignPreviewDialog'
import { SessionActions } from '@/features/tattoo-editor/components/SessionActions'
import { useCmPerUnit, useEditorStore } from '@/features/tattoo-editor/store/editorStore'

const ACCEPTED_TYPES = ['image/png', 'image/webp', 'image/jpeg']

/**
 * Rough mid tone of the bundled skin textures, used only to preview a tint in the
 * picker swatches. The real tint is applied to the full texture in the material.
 */
const BASE_SKIN_RGB = [206, 158, 126]

function swatchColor(tint: [number, number, number]): string {
  const channels = BASE_SKIN_RGB.map((channel, index) =>
    Math.round(Math.min(255, channel * tint[index])),
  )
  return `rgb(${channels.join(' ')})`
}

export function DesignPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const designs = useEditorStore((s) => s.designs)
  const selectedId = useEditorStore((s) => s.selectedId)
  const isPlacing = useEditorStore((s) => s.isPlacing)
  const modelId = useEditorStore((s) => s.modelId)
  const setModelId = useEditorStore((s) => s.setModelId)
  const skinToneId = useEditorStore((s) => s.skinToneId)
  const setSkinToneId = useEditorStore((s) => s.setSkinToneId)
  const referenceLengthCm = useEditorStore((s) => s.referenceLengthCm)
  const addDesign = useEditorStore((s) => s.addDesign)
  const removeDesign = useEditorStore((s) => s.removeDesign)
  const selectDesign = useEditorStore((s) => s.selectDesign)
  const setPlacing = useEditorStore((s) => s.setPlacing)
  const updateSelected = useEditorStore((s) => s.updateSelected)
  const setReferenceLengthCm = useEditorStore((s) => s.setReferenceLengthCm)

  const cmPerUnit = useCmPerUnit()
  const model = getModel(modelId)
  const selected = designs.find((d) => d.id === selectedId) ?? null

  function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Use a PNG, WebP or JPEG file')
      return
    }
    setPendingFile(file)
  }

  function handleAccept(design: AcceptedDesign) {
    addDesign({ id: crypto.randomUUID(), ...design })
    setPendingFile(null)
    toast.info('Now click the model to place the design')
  }

  const widthCm = selected && cmPerUnit ? selected.widthUnits * cmPerUnit : null
  const heightCm = widthCm && selected ? widthCm / selected.aspect : null

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-ink-700 bg-ink-900 p-5">
      {pendingFile && (
        <DesignPreviewDialog
          file={pendingFile}
          onAccept={handleAccept}
          onCancel={() => setPendingFile(null)}
        />
      )}

      <header>
        <h1 className="text-lg font-semibold tracking-tight">TattooView</h1>
        <p className="text-xs text-ink-400">3D tattoo preview</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-400">Body part</h2>
        <div className="grid grid-cols-2 gap-2">
          {BODY_MODELS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setModelId(entry.id, entry.defaultReferenceCm)}
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                entry.id === modelId
                  ? 'border-accent bg-ink-800 text-white'
                  : 'border-ink-700 text-ink-400 hover:text-white'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-400">Skin tone</h2>
        <div className="flex gap-1.5">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => setSkinToneId(tone.id)}
              title={tone.label}
              aria-label={tone.label}
              aria-pressed={tone.id === skinToneId}
              className={`h-7 flex-1 rounded-md border transition ${
                tone.id === skinToneId
                  ? 'border-accent ring-1 ring-accent'
                  : 'border-ink-700 hover:border-ink-400'
              }`}
              style={{ backgroundColor: swatchColor(tone.tint) }}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleFile(file)
            // Reset so picking the same file twice still fires a change event.
            event.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          <ImagePlus size={16} />
          Upload design
        </button>
        {isPlacing && (
          <p className="flex items-center gap-1.5 text-xs text-accent">
            <Crosshair size={13} />
            Click the model to place it
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-400">Designs</h2>
        {designs.length === 0 && <p className="text-xs text-ink-400">No designs yet.</p>}
        {designs.map((design) => (
          <div
            key={design.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              design.id === selectedId ? 'border-accent bg-ink-800' : 'border-ink-700'
            }`}
          >
            <button
              type="button"
              onClick={() => selectDesign(design.id)}
              className="flex-1 truncate text-left text-xs"
            >
              {design.name}
            </button>
            <button
              type="button"
              onClick={() => setPlacing(true)}
              title="Reposition"
              className="text-ink-400 transition hover:text-white"
            >
              <Crosshair size={14} />
            </button>
            <button
              type="button"
              onClick={() => removeDesign(design.id)}
              title="Remove"
              className="text-ink-400 transition hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </section>

      {selected && (
        <section className="flex flex-col gap-4 border-t border-ink-700 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-400">Adjust</h2>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-ink-400">
              Size
              <span>{widthCm ? `${widthCm.toFixed(1)} × ${heightCm?.toFixed(1)} cm` : '—'}</span>
            </span>
            <input
              type="range"
              min={0.04}
              max={1.2}
              step={0.01}
              value={selected.widthUnits}
              onChange={(e) => updateSelected({ widthUnits: Number(e.target.value) })}
              className="accent-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-ink-400">
              Rotation
              <span>{Math.round((selected.roll * 180) / Math.PI)}°</span>
            </span>
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={0.01}
              value={selected.roll}
              onChange={(e) => updateSelected({ roll: Number(e.target.value) })}
              className="accent-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-ink-400">
              Ink density
              <span>{Math.round(selected.opacity * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={selected.opacity}
              onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
              className="accent-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-ink-400">
              Ink depth
              <span>{selected.inkDepth < 0.34 ? 'Fresh' : selected.inkDepth < 0.7 ? 'Healed' : 'Settled'}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selected.inkDepth}
              onChange={(e) => updateSelected({ inkDepth: Number(e.target.value) })}
              className="accent-accent"
            />
            <span className="text-[11px] leading-snug text-ink-400">
              How far the pigment sits under the epidermis. Deeper ink loses saturation and shifts
              toward blue-grey, the way healed work does.
            </span>
          </label>
        </section>
      )}

      <CapturePanel />

      <SessionActions />

      <section className="mt-auto flex flex-col gap-2 border-t border-ink-700 pt-4">
        <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
          <Ruler size={13} />
          Calibration
        </h2>
        <label className="flex flex-col gap-1.5 text-xs text-ink-400">
          {model.measurementLabel} (cm)
          <input
            type="number"
            min={1}
            placeholder={String(model.defaultReferenceCm)}
            value={referenceLengthCm ?? ''}
            onChange={(e) =>
              setReferenceLengthCm(e.target.value === '' ? null : Number(e.target.value))
            }
            className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
        </label>
        {!cmPerUnit && (
          <p className="text-xs text-ink-400">
            Enter a real measurement to convert design size into centimetres.
          </p>
        )}
        <div className="pt-2">
          <ModelCredits />
        </div>
      </section>
    </aside>
  )
}
