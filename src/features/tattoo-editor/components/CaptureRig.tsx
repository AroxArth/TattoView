import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { toast } from 'sonner'

import {
  captureFilename,
  captureFrame,
  captureTurntable,
  downloadBlob,
} from '@/features/tattoo-editor/lib/captureCanvas'
import { useEditorStore } from '@/features/tattoo-editor/store/editorStore'
import { messageFor, useT } from '@/i18n'

/** Four views — front, both sides, back — is what a client actually asks for. */
const TURNTABLE_FRAMES = 4

/**
 * Browsers rate-limit programmatic downloads fired in a tight loop and will drop
 * the later ones silently. A short gap between saves is the difference between
 * four files and one.
 */
const DOWNLOAD_GAP_MS = 350

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Lives inside the Canvas and performs capture requests raised from the panel.
 *
 * It renders nothing. It exists because capturing needs the renderer, scene,
 * camera and orbit target, and those are only reachable from inside the R3F tree.
 */
export function CaptureRig() {
  const t = useT()
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)

  const request = useEditorStore((s) => s.captureRequest)
  const background = useEditorStore((s) => s.captureBackground)
  const scale = useEditorStore((s) => s.captureScale)
  const clearCaptureRequest = useEditorStore((s) => s.clearCaptureRequest)

  useEffect(() => {
    if (!request) return

    let cancelled = false

    async function run() {
      try {
        if (request?.mode === 'turntable') {
          const orbit = controls as unknown as { target?: Vector3 } | null
          const target = orbit?.target?.clone() ?? new Vector3(0, 0, 0)

          const frames = await captureTurntable(
            gl,
            scene,
            camera,
            target,
            background,
            scale,
            TURNTABLE_FRAMES,
          )
          if (cancelled) return

          for (const [index, frame] of frames.entries()) {
            downloadBlob(frame, captureFilename(index))
            await delay(DOWNLOAD_GAP_MS)
          }
          toast.success(t('toast.viewsSaved', { count: frames.length }))
          return
        }

        const frame = await captureFrame(gl, scene, camera, background, scale)
        if (cancelled) return

        downloadBlob(frame, captureFilename())
        toast.success(t('toast.photoSaved'))
      } catch (error) {
        if (!cancelled) {
          toast.error(messageFor(t, error, 'error.captureFailed'))
        }
      } finally {
        if (!cancelled) clearCaptureRequest()
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [request, background, scale, gl, scene, camera, controls, clearCaptureRequest, t])

  return null
}
