import { useCallback, useEffect, useMemo } from 'react'
import { Decal, useTexture } from '@react-three/drei'
import { Vector3 } from 'three'
import type { WebGLProgramParametersWithUniforms } from 'three'

import type { TattooDesign } from '@/features/tattoo-editor/store/editorStore'
import { decalRotation, projectionDepth } from '@/features/tattoo-editor/lib/surfacePlacement'

/**
 * Distinguishes this program from a stock MeshStandardMaterial.
 *
 * three caches compiled programs by material parameters and does NOT account for
 * `onBeforeCompile`. The body skin is also a MeshStandardMaterial, so without a
 * distinct key the two could share one program and the fade would land on the
 * skin, or never land at all.
 */
const PROGRAM_CACHE_KEY = () => 'tattoo-decal-projection-fade'

interface TattooDecalProps {
  design: TattooDesign
}

/**
 * A single tattoo projected onto the parent body mesh.
 *
 * Must be rendered as a direct child of the target `<mesh>`: `<Decal>` reads the
 * parent geometry to build the clipped projection.
 */
export function TattooDecal({ design }: TattooDecalProps) {
  const texture = useTexture(design.textureUrl)
  const rotation = useMemo(
    () => decalRotation(design.normal, design.roll),
    [design.normal, design.roll],
  )

  /**
   * Projection axis in WORLD space, fed to the shader as a uniform.
   *
   * It cannot be derived from the decal's own matrix: drei consumes `position`,
   * `rotation` and `scale` to *build* the DecalGeometry and leaves the mesh at
   * identity, with the geometry baked into the parent's space. Reading
   * `normalMatrix * vec3(0,0,1)` therefore yields the camera's axis, not the
   * projector's — which faded the artwork according to viewing angle.
   *
   * The design's stored surface normal is the projection axis by definition, and
   * the body mesh is at identity transform, so this world vector needs no
   * conversion beyond the view matrix inside the shader.
   */
  const projectionAxis = useMemo(() => ({ value: new Vector3(0, 0, 1) }), [])

  useEffect(() => {
    projectionAxis.value.set(design.normal[0], design.normal[1], design.normal[2]).normalize()
  }, [design.normal, projectionAxis])

  /**
   * Fades the decal out where the skin turns away from the projection axis.
   *
   * `DecalGeometry` is a box projection: the texture is cast along one axis like a
   * slide projector. Where the surface rotates away from that axis each texel
   * covers progressively more skin, approaching infinite stretch as the normal
   * turns perpendicular. This is projection maths, not mesh resolution — a denser
   * mesh smears identically. The only real fix is to stop drawing where the
   * projection stops being valid.
   */
  const applyProjectionFade = useCallback(
    (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uProjAxis = projectionAxis

      shader.vertexShader = `uniform vec3 uProjAxis;\nvarying vec3 vProjAxis;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vProjAxis = normalize(mat3(viewMatrix) * uProjAxis);`,
      )

      shader.fragmentShader = `varying vec3 vProjAxis;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>',
        `float facing = dot(normalize(normal), normalize(vProjAxis));
         diffuseColor.a *= smoothstep(0.02, 0.30, facing);
         if (diffuseColor.a < 0.01) discard;
         #include <opaque_fragment>`,
      )
    },
    [projectionAxis],
  )

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
        opacity={design.opacity}
        roughness={0.65}
        metalness={0}
        onBeforeCompile={applyProjectionFade}
        customProgramCacheKey={PROGRAM_CACHE_KEY}
        // Ink sits in the skin, so overlapping designs must not carve holes in
        // each other's depth.
        depthWrite={false}
      />
    </Decal>
  )
}
