import { Suspense, useCallback, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls } from '@react-three/drei'
import { toast } from 'sonner'

import { BodyModel } from '@/features/body-model/components/BodyModel'
import { getModel } from '@/features/body-model/model-catalog'
import { CaptureRig } from '@/features/tattoo-editor/components/CaptureRig'
import { TattooDecal } from '@/features/tattoo-editor/components/TattooDecal'
import { GROUND_SHADOW_NAME } from '@/features/tattoo-editor/lib/captureCanvas'
import { findDesignAtPoint, surfaceHit } from '@/features/tattoo-editor/lib/surfacePlacement'
import { useEditorStore } from '@/features/tattoo-editor/store/editorStore'

function Scene() {
  const designs = useEditorStore((s) => s.designs)
  const selectedId = useEditorStore((s) => s.selectedId)
  const isPlacing = useEditorStore((s) => s.isPlacing)
  const isDragging = useEditorStore((s) => s.isDragging)
  const modelId = useEditorStore((s) => s.modelId)
  const placeSelected = useEditorStore((s) => s.placeSelected)
  const moveDesign = useEditorStore((s) => s.moveDesign)
  const selectDesign = useEditorStore((s) => s.selectDesign)
  const setDragging = useEditorStore((s) => s.setDragging)

  const controls = useThree((s) => s.controls)
  const model = getModel(modelId)

  // While a design is being moved, orbit must stay off — otherwise the click that
  // drops the design also starts spinning the camera.
  useEffect(() => {
    const orbit = controls as unknown as { enabled: boolean } | null
    if (!orbit) return

    orbit.enabled = !isDragging
    return () => {
      orbit.enabled = true
    }
  }, [controls, isDragging])

  // Escape is the way out of a move that was started by mistake.
  useEffect(() => {
    if (!isDragging) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDragging(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDragging, setDragging])

  /**
   * Grabbing requires a deliberate double click. A single click used to start the
   * move, which meant any stray click on the skin dragged a tattoo away.
   */
  const handleDoubleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isPlacing || !event.face) return
      event.stopPropagation()

      const point: [number, number, number] = [event.point.x, event.point.y, event.point.z]
      const grabbed = findDesignAtPoint(
        designs.filter((design) => design.isPlaced),
        point,
      )
      if (!grabbed) return

      selectDesign(grabbed.id)
      setDragging(true)
      toast.info('Move the pointer to reposition · click to drop · Esc to cancel')
    },
    [designs, isPlacing, selectDesign, setDragging],
  )

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // A design in hand is dropped by the next click, wherever it currently sits.
      if (isDragging) {
        event.stopPropagation()
        setDragging(false)
        return
      }

      if (!isPlacing) return

      const hit = surfaceHit(event)
      if (!hit) return
      // Only the nearest hit is meaningful; the rest of the ray is noise.
      event.stopPropagation()

      placeSelected(hit.position, hit.normal)
      toast.success('Design placed — double click it to move it')
    },
    [isDragging, isPlacing, placeSelected, setDragging],
  )

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDragging || !selectedId) return

      const hit = surfaceHit(event)
      if (!hit) return

      event.stopPropagation()
      moveDesign(selectedId, hit.position, hit.normal)
    },
    [isDragging, moveDesign, selectedId],
  )

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} castShadow />
      <directionalLight position={[-5, 2, -4]} intensity={0.7} color="#9db4ff" />

      {/* Remounting on model change discards stale geometry and decal state. */}
      <BodyModel
        key={model.id}
        url={model.url}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {designs.map((design) => (
          <TattooDecal key={design.id} design={design} />
        ))}
      </BodyModel>

      <ContactShadows
        name={GROUND_SHADOW_NAME}
        position={[0, -1.25, 0]}
        opacity={0.4}
        scale={7}
        blur={2.6}
        far={3}
      />
      <OrbitControls makeDefault enablePan={false} minDistance={1.2} maxDistance={7} />
      <CaptureRig />
    </>
  )
}

function LoadingIndicator() {
  return (
    <Html center>
      <span className="text-xs text-ink-400">Loading model…</span>
    </Html>
  )
}

export function EditorCanvas() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.2, 3.4], fov: 42 }}
      // preserveDrawingBuffer: without it the drawing buffer is cleared once the
      // frame is presented and toBlob returns a blank image.
      // alpha: required for transparent PNG capture — an opaque context has no
      // alpha channel to write, and the backdrop would come out black.
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
    >
      <color attach="background" args={['#121215']} />
      <Suspense fallback={<LoadingIndicator />}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
