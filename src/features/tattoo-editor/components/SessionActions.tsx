import { useRef, useState } from 'react'
import { FolderOpen, Redo2, Save, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  downloadSession,
  parseSession,
  serializeSession,
  SESSION_FILE_EXTENSION,
} from '@/features/tattoo-editor/lib/sessionFile'
import { currentDocument, useEditorStore } from '@/features/tattoo-editor/store/editorStore'

export function SessionActions() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isBusy, setIsBusy] = useState(false)

  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const hasDesigns = useEditorStore((s) => s.designs.length > 0)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const loadDocument = useEditorStore((s) => s.loadDocument)

  async function handleSave() {
    setIsBusy(true)
    try {
      const session = await serializeSession(currentDocument())
      downloadSession(session, `tattooview-session${SESSION_FILE_EXTENSION}`)
      toast.success('Session saved — send that file to share it')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the session')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleOpen(file: File) {
    setIsBusy(true)
    try {
      loadDocument(await parseSession(await file.text()))
      toast.success('Session loaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open that session')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-2 border-t border-ink-700 pt-4">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 size={13} />
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 size={13} />
          Redo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleOpen(file)
          event.target.value = ''
        }}
      />

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isBusy || !hasDesigns}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={13} />
          Save session
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-xs transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FolderOpen size={13} />
          Open
        </button>
      </div>
    </section>
  )
}
