import { DesignPanel } from '@/features/tattoo-editor/components/DesignPanel'
import { EditorCanvas } from '@/features/tattoo-editor/components/EditorCanvas'
import { useHistoryShortcuts } from '@/features/tattoo-editor/hooks/useHistoryShortcuts'

export function App() {
  useHistoryShortcuts()

  return (
    <div className="flex h-full w-full">
      <DesignPanel />
      <main className="relative flex-1">
        <EditorCanvas />
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-ink-400">
          Double click a tattoo to move it · drag the skin to orbit · scroll to zoom
        </p>
      </main>
    </div>
  )
}
