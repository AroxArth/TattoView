/**
 * Asset pipeline for CC-BY body models downloaded from Sketchfab.
 *
 * Usage:
 *   pnpm prepare:model <input.gltf|input.glb> <output.glb>
 *
 * Why this exists instead of the `gltf-transform` CLI:
 *
 *  1. Sketchfab still exports `KHR_materials_pbrSpecularGlossiness`, and lists it
 *     in `extensionsRequired`. three.js dropped that extension, and its GLTFLoader
 *     REJECTS an asset whose required extension it cannot satisfy — the model does
 *     not load at all. `metalRough()` rewrites the material and clears the flag.
 *
 *  2. The CLI resolves its own bundled sharp, which under pnpm can pair one sharp
 *     release's JavaScript with another release's libvips binary. That mismatch
 *     surfaces as `colourspace: parameter space not set` on every texture op.
 *     Passing our own pinned sharp instance to `textureCompress` avoids it.
 *
 * Blender is deliberately not part of this pipeline and must never become one.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, metalRough, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'

const [input, output] = process.argv.slice(2)

if (!input || !output) {
  console.error('Usage: pnpm prepare:model <input.gltf|input.glb> <output.glb>')
  process.exit(1)
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const document = await io.read(input)

const before = document.getRoot().listExtensionsUsed().map((e) => e.extensionName)
console.log(`→ ${basename(input)}`)
console.log(`  extensions in: ${before.length ? before.join(', ') : 'none'}`)

await document.transform(
  // Order matters: metalRough must run before texture compression so the
  // regenerated metallicRoughness maps are the ones that get encoded.
  metalRough(),
  dedup(),
  prune({ keepAttributes: false }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88 }),
)

await io.write(output, document)

const after = document.getRoot().listExtensionsUsed().map((e) => e.extensionName)
const sizeMb = (readFileSync(output).byteLength / 1024 / 1024).toFixed(2)

console.log(`  extensions out: ${after.length ? after.join(', ') : 'none'}`)
console.log(`✓ ${basename(output)} — ${sizeMb} MB`)
