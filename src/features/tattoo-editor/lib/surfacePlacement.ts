import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'

/**
 * The limb's long axis. Models are normalized to stand on +Y, so this is the
 * direction a tattoo should run by default — along the arm, not across it.
 */
const LIMB_AXIS = new Vector3(0, 1, 0)

/** Above this alignment the limb axis is useless as a reference and we fall back. */
const PARALLEL_LIMIT = 0.99

const FALLBACK_AXIS = new Vector3(0, 0, 1)

export interface SurfaceHit {
  position: [number, number, number]
  normal: [number, number, number]
}

/**
 * Reads the contact point and surface normal from a raycast hit.
 *
 * Assumes the body mesh has an identity world transform, which keeps world and
 * local space interchangeable — see `normalizeGeometry`.
 */
export function surfaceHit(event: ThreeEvent<PointerEvent>): SurfaceHit | null {
  if (!event.face) return null

  const normal = event.face.normal.clone().transformDirection(event.object.matrixWorld).normalize()

  return {
    position: [event.point.x, event.point.y, event.point.z],
    normal: [normal.x, normal.y, normal.z],
  }
}

/**
 * Builds the decal orientation from a surface normal plus a roll angle.
 *
 * `DecalGeometry` projects along the orientation's +Z, so the normal fixes two of
 * the three degrees of freedom. The third — the spin around that normal — is what
 * decides whether the design reads upright or crooked, and it is NOT determined
 * by the normal alone.
 *
 * Using `Object3D.lookAt` here was the original bug: it resolves that spin with
 * its own internal up vector, so the design's heading drifted with the surface
 * angle and tattoos landed tilted. Instead the up vector is the limb axis
 * projected onto the surface plane, which makes designs run along the arm by
 * default, and `roll` then rotates deliberately around the normal.
 */
export function decalRotation(
  normal: [number, number, number],
  roll: number,
): [number, number, number] {
  const forward = new Vector3(normal[0], normal[1], normal[2]).normalize()

  // Near the fingertips the surface faces along the limb axis, leaving the cross
  // product degenerate. Any other reference works there.
  const reference =
    Math.abs(forward.dot(LIMB_AXIS)) > PARALLEL_LIMIT ? FALLBACK_AXIS : LIMB_AXIS

  const right = new Vector3().crossVectors(reference, forward).normalize()
  const up = new Vector3().crossVectors(forward, right).normalize()

  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(right, up, forward),
  )
  // Post-multiplying applies the roll in the decal's own space, i.e. around the
  // surface normal rather than a world axis.
  quaternion.multiply(new Quaternion().setFromAxisAngle(FALLBACK_AXIS, roll))

  const euler = new Euler().setFromQuaternion(quaternion)
  return [euler.x, euler.y, euler.z]
}

/**
 * Projection depth for the decal box, in world units.
 *
 * Kept shallow on purpose: a box deep enough to reach the far side of a limb
 * makes the design bleed through and appear mirrored on the back of the arm.
 */
export function projectionDepth(widthUnits: number): number {
  return Math.max(0.06, widthUnits * 0.5)
}

interface Grabbable {
  position: [number, number, number]
  widthUnits: number
  aspect: number
}

/**
 * Finds which placed design the user grabbed, by distance from each design's
 * anchor point.
 *
 * Deliberately NOT a raycast against the decal meshes. Decal geometry is
 * coincident with the body surface — the depth offset that keeps it visible is a
 * rasterization trick, not a change in geometry — so ray hit ordering between the
 * decal and the skin underneath is a coin flip. A radius test against the anchor
 * is deterministic.
 *
 * The smallest match wins, so a small design layered over a large one stays
 * reachable.
 */
export function findDesignAtPoint<T extends Grabbable>(
  designs: readonly T[],
  point: [number, number, number],
): T | null {
  let best: T | null = null
  let bestRadius = Infinity

  for (const design of designs) {
    const height = design.widthUnits / design.aspect
    const radius = Math.max(design.widthUnits, height) / 2

    const dx = point[0] - design.position[0]
    const dy = point[1] - design.position[1]
    const dz = point[2] - design.position[2]

    if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius && radius < bestRadius) {
      best = design
      bestRadius = radius
    }
  }

  return best
}
