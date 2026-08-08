import { BufferGeometry, Material, Matrix4, Mesh, Object3D, Vector3 } from 'three'

/** Limb length in world units after normalization. Keeps the camera framing stable. */
export const TARGET_LIMB_LENGTH = 2.2

export interface NormalizedModel {
  geometry: BufferGeometry
  /** Skin material authored with the model, reused as-is. */
  material: Material | Material[]
  /** Length of the limb's dominant axis, in world units. Basis for cm calibration. */
  lengthUnits: number
}

/** Picks the mesh carrying the most triangles — the limb, not a stray prop. */
function findPrimaryMesh(root: Object3D): Mesh | null {
  let best: Mesh | null = null
  let bestCount = -1

  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh || !mesh.geometry) return

    const count = mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0
    if (count > bestCount) {
      best = mesh
      bestCount = count
    }
  })

  return best
}

/**
 * Bakes position, rotation and scale into the geometry so the rendered mesh can
 * sit at identity transform.
 *
 * This is not cosmetic. `<Decal>` positions are expressed in the parent mesh's
 * local space, and our raycast placement reads world-space hit points. Keeping
 * the mesh at identity makes those two spaces the same, which removes an entire
 * class of placement bugs. Wrapping the model in a scaled group would silently
 * offset every tattoo.
 *
 * Source models arrive in arbitrary units and orientations — the two Sketchfab
 * assets differ by ~70x in scale and point down different axes — so the limb is
 * also rotated to stand along +Y and rescaled to a fixed length.
 */
export function normalizeGeometry(root: Object3D): NormalizedModel | null {
  const mesh = findPrimaryMesh(root)
  if (!mesh) return null

  mesh.updateWorldMatrix(true, false)

  const geometry = mesh.geometry.clone()
  geometry.applyMatrix4(mesh.matrixWorld)

  geometry.computeBoundingBox()
  const size = geometry.boundingBox!.getSize(new Vector3())

  // Stand the limb up along +Y so every model shares one camera framing.
  const dominant = Math.max(size.x, size.y, size.z)
  if (dominant === size.z) {
    geometry.applyMatrix4(new Matrix4().makeRotationX(-Math.PI / 2))
  } else if (dominant === size.x) {
    geometry.applyMatrix4(new Matrix4().makeRotationZ(Math.PI / 2))
  }

  geometry.computeBoundingBox()
  const center = geometry.boundingBox!.getCenter(new Vector3())
  const scale = TARGET_LIMB_LENGTH / dominant

  geometry.translate(-center.x, -center.y, -center.z)
  geometry.scale(scale, scale, scale)
  geometry.computeBoundingSphere()

  return { geometry, material: mesh.material, lengthUnits: TARGET_LIMB_LENGTH }
}
