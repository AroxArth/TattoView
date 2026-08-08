/**
 * Validates that a prepared .glb will normalize into a usable limb.
 *
 * Usage:
 *   pnpm verify:model public/models/forearm.glb
 *
 * Mirrors `src/features/body-model/lib/normalizeGeometry.ts` outside the browser,
 * so a bad asset is caught at build time rather than as an invisible or
 * mis-scaled model in the viewport. Also fails loudly on glTF extensions that
 * three.js cannot load.
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { Box3, Matrix4, Vector3 } from 'three'

const TARGET_LIMB_LENGTH = 2.2

/** Extensions three.js GLTFLoader cannot handle. A required one aborts the load. */
const UNSUPPORTED = ['KHR_materials_pbrSpecularGlossiness', 'KHR_texture_basisu']

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: pnpm verify:model <file.glb> [...]')
  process.exit(1)
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
let failed = false

for (const file of files) {
  const document = await io.read(file)
  const root = document.getRoot()
  const scene = root.getDefaultScene() ?? root.listScenes()[0]

  console.log(`\n${file}`)

  const extensions = root.listExtensionsUsed().map((e) => e.extensionName)
  const blocking = extensions.filter((e) => UNSUPPORTED.includes(e))
  if (blocking.length > 0) {
    console.log(`  ✗ unsupported by three.js: ${blocking.join(', ')}`)
    failed = true
  }

  // Accumulate world matrices the same way three's updateWorldMatrix does.
  let primary = null
  const walk = (node, parentMatrix) => {
    const world = new Matrix4().multiplyMatrices(
      parentMatrix,
      new Matrix4().fromArray(node.getMatrix()),
    )
    const mesh = node.getMesh()
    if (mesh) {
      for (const primitive of mesh.listPrimitives()) {
        const count =
          primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()
        if (!primary || count > primary.count) primary = { primitive, world, count }
      }
    }
    node.listChildren().forEach((child) => walk(child, world))
  }
  scene.listChildren().forEach((node) => walk(node, new Matrix4()))

  if (!primary) {
    console.log('  ✗ no mesh found')
    failed = true
    continue
  }

  const position = primary.primitive.getAttribute('POSITION')
  const points = []
  const element = [0, 0, 0]
  for (let i = 0; i < position.getCount(); i++) {
    position.getElement(i, element)
    points.push(new Vector3(element[0], element[1], element[2]).applyMatrix4(primary.world))
  }

  const rawSize = new Box3().setFromPoints(points).getSize(new Vector3())
  const dominant = Math.max(rawSize.x, rawSize.y, rawSize.z)
  const axis = dominant === rawSize.x ? 'X' : dominant === rawSize.y ? 'Y' : 'Z'

  let rotation = null
  if (dominant === rawSize.z) rotation = new Matrix4().makeRotationX(-Math.PI / 2)
  else if (dominant === rawSize.x) rotation = new Matrix4().makeRotationZ(Math.PI / 2)
  if (rotation) points.forEach((point) => point.applyMatrix4(rotation))

  const center = new Box3().setFromPoints(points).getCenter(new Vector3())
  const scale = TARGET_LIMB_LENGTH / dominant
  points.forEach((point) => point.sub(center).multiplyScalar(scale))

  const final = new Box3().setFromPoints(points)
  const size = final.getSize(new Vector3())
  const finalCenter = final.getCenter(new Vector3())

  const standsUp = size.y >= size.x && size.y >= size.z
  const centered = finalCenter.length() < 1e-6
  const lengthOk = Math.abs(size.y - TARGET_LIMB_LENGTH) < 1e-3

  const fmt = (v) => v.toArray().map((n) => n.toFixed(2)).join(' × ')
  console.log(`  triangles     : ${primary.count / 3}`)
  console.log(`  raw size      : ${fmt(rawSize)}  (dominant ${axis})`)
  console.log(`  final size    : ${fmt(size)}`)
  console.log(`  ${standsUp ? '✓' : '✗'} limb stands along +Y`)
  console.log(`  ${centered ? '✓' : '✗'} centered at origin`)
  console.log(`  ${lengthOk ? '✓' : '✗'} length normalized to ${TARGET_LIMB_LENGTH}`)

  if (!standsUp || !centered || !lengthOk) failed = true
}

console.log(failed ? '\nFAILED' : '\nAll models OK')
process.exit(failed ? 1 : 0)
