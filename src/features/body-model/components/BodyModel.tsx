import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

import { normalizeGeometry } from '@/features/body-model/lib/normalizeGeometry'
import { useEditorStore } from '@/features/tattoo-editor/store/editorStore'

interface BodyModelProps {
  url: string
  onDoubleClick: (event: ThreeEvent<MouseEvent>) => void
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void
  children?: React.ReactNode
}

/**
 * Renders a CC-BY body model with its transform baked into the geometry, so the
 * mesh sits at identity and decal placement can treat world and local space as
 * one. See `normalizeGeometry` for why that matters.
 */
export function BodyModel({
  url,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  children,
}: BodyModelProps) {
  const { scene } = useGLTF(url)
  const setModelLengthUnits = useEditorStore((s) => s.setModelLengthUnits)

  const normalized = useMemo(() => normalizeGeometry(scene), [scene])

  useEffect(() => {
    if (normalized) setModelLengthUnits(normalized.lengthUnits)
  }, [normalized, setModelLengthUnits])

  if (!normalized) return null

  return (
    <mesh
      geometry={normalized.geometry}
      material={normalized.material}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      castShadow
      receiveShadow
    >
      {children}
    </mesh>
  )
}

useGLTF.preload('/models/forearm.glb')
