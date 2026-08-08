/**
 * Asserts that the ink shader's injection points still exist in three's source.
 *
 * Usage:
 *   pnpm verify:shader
 *
 * WHY THIS SCRIPT EXISTS
 *
 * `onBeforeCompile` patches a shader with `String.replace()`. When an anchor stops
 * matching — because a three upgrade renamed a chunk, reordered an include, or the
 * material resolves to a different ShaderLib entry — `replace()` returns the string
 * untouched and reports nothing. The build passes, the types pass, the lint passes,
 * and the tattoo silently renders wrong. This project has already lost an afternoon
 * to exactly that failure mode.
 *
 * So the anchors are checked mechanically against the ShaderLib entry the material
 * actually compiles from, and the run exits non-zero when one goes missing.
 */
import { ShaderLib } from 'three'

import { createInkUniforms, inkShaderPatch } from '../src/features/tattoo-editor/lib/inkMaterial.ts'

/** MeshStandardMaterial compiles from ShaderLib.standard (meshphysical). */
const SOURCE = ShaderLib.standard

const checks = []

function check(label, passed, detail) {
  checks.push({ label, passed, detail })
}

// --- 1. The anchors exist in the shader we are actually patching -------------
check(
  'vertex shader contains #include <begin_vertex>',
  SOURCE.vertexShader.includes('#include <begin_vertex>'),
)
check(
  'fragment shader contains #include <opaque_fragment>',
  SOURCE.fragmentShader.includes('#include <opaque_fragment>'),
)

// --- 2. `normal` is in scope where the grazing fade reads it ------------------
// normal_fragment_begin declares `vec3 normal`. If it ever moves below our
// injection point the shader stops compiling, which at least fails loudly — but
// catching it here explains why.
const normalIndex = SOURCE.fragmentShader.indexOf('#include <normal_fragment_begin>')
const opaqueIndex = SOURCE.fragmentShader.indexOf('#include <opaque_fragment>')
check(
  '`normal` is declared before the injection point',
  normalIndex !== -1 && normalIndex < opaqueIndex,
  `normal_fragment_begin at ${normalIndex}, opaque_fragment at ${opaqueIndex}`,
)

// --- 3. three still premultiplies AFTER the colour-space conversion -----------
// The multiply blend depends on that order: our raw ink is encoded to display
// space first, then scaled by coverage. Swap the two and the blend turns linear
// and every tattoo comes out too dark.
const colorspaceIndex = SOURCE.fragmentShader.indexOf('#include <colorspace_fragment>')
const premultiplyIndex = SOURCE.fragmentShader.indexOf('#include <premultiplied_alpha_fragment>')
check(
  'premultiplied alpha runs after the colour-space conversion',
  colorspaceIndex !== -1 && premultiplyIndex > colorspaceIndex,
  `colorspace at ${colorspaceIndex}, premultiplied at ${premultiplyIndex}`,
)

// --- 4. The patch actually changes the shader --------------------------------
const shader = {
  uniforms: {},
  vertexShader: SOURCE.vertexShader,
  fragmentShader: SOURCE.fragmentShader,
}
inkShaderPatch(createInkUniforms())(shader)

check(
  'patch injected the projection axis into the vertex shader',
  shader.vertexShader.includes('vProjAxis = normalize(mat3(viewMatrix) * uProjAxis)'),
)
check(
  'patch injected the ink blend into the fragment shader',
  shader.fragmentShader.includes('gl_FragColor = vec4(ink, coverage)'),
)
check(
  'patch bound every uniform it declares',
  ['uProjAxis', 'uDepth', 'uDensity', 'uDermisTint'].every((name) => name in shader.uniforms),
  Object.keys(shader.uniforms).join(', '),
)

// --- 5. Every declared uniform is actually used, and vice versa ---------------
const declared = [...shader.fragmentShader.matchAll(/^\s*uniform\s+\w+\s+(u[A-Z]\w*)/gm)].map(
  (match) => match[1],
)
const unusedDeclarations = declared.filter(
  (name) => shader.fragmentShader.split(name).length - 1 < 2,
)
check(
  'no fragment uniform is declared but never read',
  unusedDeclarations.length === 0,
  unusedDeclarations.join(', '),
)

// --- Report -------------------------------------------------------------------
let failed = 0
for (const { label, passed, detail } of checks) {
  const suffix = detail ? ` (${detail})` : ''
  console.log(`${passed ? 'ok  ' : 'FAIL'}  ${label}${suffix}`)
  if (!passed) failed += 1
}

if (failed > 0) {
  console.error(`\n${failed} shader assumption(s) no longer hold. Read inkMaterial.ts before fixing.`)
  process.exit(1)
}

console.log(`\nAll ${checks.length} shader assumptions hold.`)
