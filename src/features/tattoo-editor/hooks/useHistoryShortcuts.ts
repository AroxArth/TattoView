import { useEffect } from 'react'

import { useEditorStore } from '@/features/tattoo-editor/store/editorStore'

/** Fields where the browser's own undo stack is the right one to use. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Ctrl/Cmd+Z to undo, Ctrl+Y or Ctrl/Cmd+Shift+Z to redo.
 *
 * Both redo bindings are wired on purpose: Ctrl+Y is what Windows users reach for,
 * Cmd+Shift+Z is what Mac users reach for, and being wrong about which one someone
 * has in their fingers costs them work.
 *
 * Text inputs are skipped so the calibration field keeps its native undo — hijacking
 * Ctrl+Z there would silently roll back a tattoo while the user was fixing a typo.
 */
export function useHistoryShortcuts(): void {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return
      if (isTextEntry(event.target)) return

      const key = event.key.toLowerCase()

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])
}
