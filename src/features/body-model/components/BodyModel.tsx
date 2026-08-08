import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { MeshStandardMaterial } from 'three'
import type { Material } from 'three'

import { normalizeGeometry } from '@/features/body-model/lib/normalizeGeometry'
import { getSkinTone } from '@/features/body-model/skin-tones'
import { useEditorStore } from '@/features/tattoo-editor/store/editorStore'

interface BodyModelProps {
  url: string
  onDoubleClick: (event: ThreeEvent<MouseEvent>) => void
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void
  children?: React.ReactNode
}

function firstMaterial(material: Material | Material[]): Material {
  return Array.isArray(material) ? material[0] : material
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
  const skinToneId = useEditorStore((s) => s.skinToneId)

  const normalized = useMemo(() => normalizeGeometry(scene), [scene])

  /**
   * The GLTF material is owned by useGLTF's global cache and shared by every
   * component that loads this url. Tinting it in place would leak the tone into
   * other mounts and survive a model switch, so the skin gets its own clone.
   */
  const skinMaterial = useMemo(() => {
    if (!normalized) return null
    return firstMaterial(normalized.material).clone() as MeshStandardMaterial
  }, [normalized])

  useEffect(() => {
    return () => skinMaterial?.dispose()
  }, [skinMaterial])

  useEffect(() => {
    if (!skinMaterial) return
    const [r, g, b] = getSkinTone(skinToneId).tint
    // Raw linear multipliers over the albedo texture — see skin-tones.ts for why
    // values above 1 are expected here.
    skinMaterial.color.setRGB(r, g, b)
    skinMaterial.needsUpdate = true
  }, [skinMaterial, skinToneId])

  useEffect(() => {
    if (normalized) setModelLengthUnits(normalized.lengthUnits)
  }, [normalized, setModelLengthUnits])

  if (!normalized || !skinMaterial) return null

  return (
    <mesh
      geometry={normalized.geometry}
      material={skinMaterial}
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
