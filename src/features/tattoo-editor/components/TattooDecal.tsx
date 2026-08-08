import { useEffect, useMemo } from 'react'
import { Decal, useTexture } from '@react-three/drei'
import { MultiplyBlending, SRGBColorSpace } from 'three'

import type { TattooDesign } from '@/features/tattoo-editor/store/editorStore'
import {
  createInkUniforms,
  inkShaderPatch,
  INK_PROGRAM_CACHE_KEY,
} from '@/features/tattoo-editor/lib/inkMaterial'
import { decalRotation, projectionDepth } from '@/features/tattoo-editor/lib/surfacePlacement'

interface TattooDecalProps {
  design: TattooDesign
}

/**
 * A single tattoo projected onto the parent body mesh.
 *
 * Must be rendered as a direct child of the target `<mesh>`: `<Decal>` reads the
 * parent geometry to build the clipped projection.
 *
 * The ink model lives in `inkMaterial.ts` — read the header there before changing
 * any material flag on this component. The three blending flags are a package.
 */
export function TattooDecal({ design }: TattooDecalProps) {
  const texture = useTexture(design.textureUrl)

  /**
   * three's Texture defaults to NoColorSpace and drei's `useTexture` does not
   * change it, so an sRGB-encoded PNG was being fed to the shader as if its values
   * were already linear — the artwork rendered lighter than the file.
   *
   * The skin does not have this problem: GLTFLoader marks base colour textures as
   * sRGB. So the two were being decoded under different rules, which a multiply
   * blend turns into a visible error rather than a subtle one.
   *
   * Set during render rather than in an effect: colour space feeds into the
   * program parameters, so it has to be right before the material first compiles.
   */
  useMemo(() => {
    if (texture.colorSpace === SRGBColorSpace) return
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  const rotation = useMemo(
    () => decalRotation(design.normal, design.roll),
    [design.normal, design.roll],
  )

  // Created once and mutated in place: three keeps the reference it was handed at
  // compile time, so swapping the object stops the shader updating.
  const uniforms = useMemo(() => createInkUniforms(), [])
  const patch = useMemo(() => inkShaderPatch(uniforms), [uniforms])

  useEffect(() => {
    uniforms.uProjAxis.value.set(design.normal[0], design.normal[1], design.normal[2]).normalize()
    uniforms.uDepth.value = design.inkDepth
    uniforms.uDensity.value = design.opacity
  }, [design.normal, design.inkDepth, design.opacity, uniforms])

  // Before the first placement the design has no anchor; projecting from the
  // origin would smear it through the middle of the limb.
  if (!design.isPlaced) return null

  const width = design.widthUnits
  const height = width / design.aspect

  return (
    <Decal
      position={design.position}
      rotation={rotation}
      scale={[width, height, projectionDepth(width)]}
      // These three MUST be passed to Decal, not to the material below. drei sets
      // them via `material-*` props on its own mesh, which overwrite whatever the
      // child material declares. Its default `depthTest={false}` is what made
      // tattoos show through the limb from the far side.
      depthTest
      polygonOffsetFactor={-12}
      map={texture}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        // Density is applied inside the shader as `coverage`. Leaving opacity at 1
        // keeps `diffuseColor.a` equal to the texture's own alpha, so the two do
        // not multiply each other twice.
        opacity={1}
        roughness={0.65}
        metalness={0}
        blending={MultiplyBlending}
        // Not optional: three refuses to set a blend function for MultiplyBlending
        // unless the material is premultiplied.
        premultipliedAlpha
        // ACES maps 1.0 to ~0.8. Tone mapping a multiply factor would grey out the
        // whole limb through every transparent texel.
        toneMapped={false}
        onBeforeCompile={patch}
        customProgramCacheKey={INK_PROGRAM_CACHE_KEY}
        // Ink sits in the skin, so overlapping designs must not carve holes in
        // each other's depth.
        depthWrite={false}
      />
    </Decal>
  )
}
