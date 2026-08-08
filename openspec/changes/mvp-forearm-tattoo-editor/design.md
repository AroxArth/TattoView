# Design — MVP Forearm Tattoo Editor

## Decision 1 — Projected decals, not UV painting or 2D overlay

**Chosen:** `three.js` `DecalGeometry` through drei's `<Decal>`.

`DecalGeometry` clips the target mesh's actual triangles inside a projector box
and emits new geometry from the result. The design therefore inherits the limb's
curvature for free.

Rejected alternatives:

- **2D overlay composited over the render.** Cheapest, and exactly what the
  product exists to replace. A flat overlay cannot show foreshortening at the
  edge of a forearm, which is where clients are misled today.
- **Painting into the model's UV texture.** Highest fidelity and correct under any
  lighting, but requires a render-to-texture pipeline, per-model UV knowledge, and
  breaks as soon as a user-supplied model has overlapping UVs. Too much machinery
  for an MVP.

**Consequence that constrains everything else:** wrap quality is bounded by mesh
density. Both bundled models are low-poly (3,533 and 2,135 triangles). A small
design may intersect too few triangles and flatten into a quad. If that shows up
in testing, the fix is `TessellateModifier` at load time — not a different model,
since license-clean anatomical assets are scarce.

### Decision 1b — Fade the decal at grazing angles

Box projection stretches. Where the surface rotates away from the projection axis,
each texel covers progressively more skin, approaching infinite stretch as the
normal turns perpendicular. Users read this as the design "expanding" in patches.

**This is projection maths, not mesh resolution.** A denser mesh smears identically,
only with smoother triangles — so neither tessellation nor a higher-poly scan
addresses it. Testing this assumption before spending effort on a new asset saved
that effort.

The fix is to stop drawing where the projection stops being valid:
`TattooDecal` injects a facing test into the standard material, ramping alpha to
zero as `dot(normal, projectionAxis)` falls, and discarding below the floor.

**The projection axis must be supplied as a uniform.** Deriving it from the decal's
own matrix — `normalMatrix * vec3(0,0,1)` — looks right and is wrong: drei consumes
`position`, `rotation` and `scale` to *build* the DecalGeometry and leaves the mesh
at identity, with the geometry baked into the parent's space. That expression
therefore returns the camera's axis, and the first implementation faded the artwork
by viewing angle until it nearly vanished. The design's stored surface normal is
the projection axis by definition, so it is passed through as a world vector and
converted with `mat3(viewMatrix)` in the shader.

`customProgramCacheKey` is mandatory here. three caches compiled programs by
material parameters and ignores `onBeforeCompile`; the body skin is also a
`MeshStandardMaterial`, so without a distinct key the two could share a program and
the fade would land on the skin or vanish entirely.

Verified against three 0.185 sources: `begin_vertex` and `opaque_fragment` chunks
exist, `vec3 normal` is declared at line 178 of `meshphysical` well before the
injection point at 216, and `viewMatrix` is injected into every shader by
`WebGLProgram`. A `.replace()` that misses its anchor fails silently, so these were
checked rather than assumed.

### Decision 1c — Decal render flags belong on `<Decal>`, not on the material

drei's `Decal` applies `transparent`, `polygonOffset`, `polygonOffsetFactor`,
`depthTest` and `map` to its own mesh through `material-*` props, which overwrite
whatever the child material declares.

Its default is `depthTest={false}`, which draws the decal over everything in the
frame regardless of occlusion — a tattoo on the back of the hand stayed visible
through the palm. Passing `depthTest` explicitly restores correct occlusion, and
`polygonOffsetFactor` keeps it from z-fighting the skin.

## Decision 2 — Bake normalization into the geometry

**Chosen:** clone the primary mesh geometry, apply its world matrix, rotate the
dominant axis to +Y, centre it, and scale it to a fixed length. The rendered mesh
then sits at identity transform.

Rationale: `<Decal>` expresses position in the parent mesh's local space, while
raycast hits arrive in world space. Identity transform collapses those two spaces
into one, which removes an entire class of "the tattoo lands somewhere else" bugs.

Rejected: wrapping the model in a scaled/rotated `<group>`. It is one line shorter
and silently offsets every placement.

This is not premature: the two source assets differ by roughly 60× in scale and
point down different axes (forearm dominant on Z at 129 units, full arm dominant
on Y at 2 units). Without normalization each model would need its own camera,
decal defaults, and calibration constants.

## Decision 3 — Asset pipeline as a committed script, not ad-hoc CLI calls

**Chosen:** `scripts/prepare-model.mjs` using the glTF-Transform JS API, plus
`scripts/verify-model.mjs` which replicates the normalization maths headlessly.

Two concrete failures forced this:

1. Sketchfab exports `KHR_materials_pbrSpecularGlossiness` in `extensionsRequired`.
   three.js dropped that extension, and its loader **rejects** an asset whose
   required extension it cannot satisfy — the model does not render at all. The
   pipeline runs `metalRough()` to clear it.
2. The `gltf-transform` CLI resolves its own bundled `sharp`. Under pnpm this
   paired one release's JavaScript with another release's libvips binary, failing
   every texture operation with `colourspace: parameter space not set`. Passing an
   explicitly pinned `sharp` instance to `textureCompress` avoids it.

Measured result: 10.84 MB → 1.13 MB for the forearm, no resolution loss (WebP q88).

`verify-model.mjs` exists because a mis-normalized model is invisible in code
review — it only shows up as a model that renders sideways, tiny, or off-screen.

Blender is excluded by constraint and must never enter this pipeline.

## Decision 4 — Calibration returns null rather than an estimate

`useCmPerUnit()` yields `null` until both the model span and the user's real
measurement are known, and the UI renders an em dash instead of a number.

A tattoo artist marks permanent ink from this figure. A plausible-looking guess is
more dangerous than a blank, because a blank prompts a question and a wrong number
does not.

## Component structure

```
src/features/
  body-model/
    components/BodyModel.tsx      loads GLB, renders normalized mesh
    components/ModelCredits.tsx   CC-BY attribution dialog
    lib/normalizeGeometry.ts      bake transform, stand on +Y, centre, scale
    model-catalog.ts              model list + attribution metadata
  tattoo-editor/
    components/EditorCanvas.tsx   R3F canvas, lighting, orbit, placement handler
    components/TattooDecal.tsx    single projected design
    components/DesignPanel.tsx    upload, model picker, sliders, calibration
    lib/surfacePlacement.ts       hit -> decal transform, projection depth
    store/editorStore.ts          zustand state + cm conversion
```

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Low-poly mesh flattens small decals | Core differentiator fails | `TessellateModifier` at load |
| Decal bleeds to the far side of the limb | Mirrored ghost tattoo | Projection depth capped in `projectionDepth()` |
| Bundle is 339 KB gzip and growing | Slow first paint on mobile | Code-split three.js when export lands |
| Only two models, both CC-BY | Attribution debt grows per model | `model-catalog.ts` makes attribution a required field |
