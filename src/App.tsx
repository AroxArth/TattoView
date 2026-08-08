import { DesignPanel } from '@/features/tattoo-editor/components/DesignPanel'
import { EditorCanvas } from '@/features/tattoo-editor/components/EditorCanvas'
import { useHistoryShortcuts } from '@/features/tattoo-editor/hooks/useHistoryShortcuts'
import { useT } from '@/i18n'

export function App() {
  const t = useT()
  useHistoryShortcuts()

  return (
    <div className="flex h-full w-full">
      <DesignPanel />
      <main className="relative flex-1">
        <EditorCanvas />
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[11px] text-ink-400">
          {t('viewport.hint')}
        </p>
      </main>
    </div>
  )
}
