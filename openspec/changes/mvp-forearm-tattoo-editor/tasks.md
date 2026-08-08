# Tasks — MVP Forearm Tattoo Editor

## 1. Project foundation

- [x] 1.1 Scaffold Vite 8 + React 19 + TypeScript 6
- [x] 1.2 Wire Tailwind CSS 4 via `@tailwindcss/vite`
- [x] 1.3 Install three, @react-three/fiber, @react-three/drei, zustand, lucide-react, sonner
- [x] 1.4 Configure `@/*` path alias (drop `baseUrl`, deprecated in TS 6)
- [x] 1.5 Initialize git and the `openspec/` structure

## 2. Asset pipeline

- [x] 2.1 Verify licenses of both Sketchfab models via the public API
- [x] 2.2 Write `scripts/prepare-model.mjs` (metalRough, dedup, prune, WebP)
- [x] 2.3 Convert `KHR_materials_pbrSpecularGlossiness` so three.js can load the forearm
- [x] 2.4 Produce `public/models/forearm.glb` and `public/models/fullarm.glb`
- [x] 2.5 Write `scripts/verify-model.mjs` and confirm both models normalize

## 3. 3D viewport

- [x] 3.1 R3F canvas with `preserveDrawingBuffer` for future PNG export
- [x] 3.2 Lighting rig and contact shadows
- [x] 3.3 Orbit controls with distance clamps
- [x] 3.4 `normalizeGeometry` — bake transform, stand on +Y, centre, scale
- [x] 3.5 `BodyModel` loading GLB via `useGLTF` with a suspense fallback

## 4. Tattoo placement

- [x] 4.1 Upload PNG/WebP/JPEG, reject other types, read intrinsic aspect ratio
- [x] 4.1a Preview dialog with cancel/accept before a design enters the editor
- [x] 4.1b Background removal by colour distance, with live preview and tolerance
- [x] 4.1c Warn that JPEG has no alpha; enable removal by default for it
- [x] 4.2 Derive decal transform from raycast hit and surface normal
- [x] 4.3 Cap projection depth to prevent bleed-through
- [x] 4.4 Render designs as `<Decal>` children of the body mesh
- [x] 4.5 Size and ink-opacity controls
- [x] 4.6 Orient designs along the limb axis instead of `lookAt`'s arbitrary roll
- [x] 4.7 Rotation control around the surface normal
- [x] 4.8 Drag a placed design across the skin, suspending orbit during the drag
- [x] 4.9 Grab by anchor distance, smallest design wins on overlap
- [x] 4.10 Fade the decal at grazing angles to stop projection smear
- [x] 4.11 Require a double click to grab, so stray clicks cannot displace work
- [x] 4.12 Feed the projection axis as a uniform; the decal mesh is at identity
- [x] 4.13 Force `depthTest` on the decal so tattoos stop showing through the limb

## 5. Measurement and licensing

- [x] 5.1 Measure model span in world units on load
- [x] 5.2 Centimetre conversion that returns null when uncalibrated
- [x] 5.3 Body-part picker that clears placements on model change
- [x] 5.4 CC-BY credits dialog fed by `model-catalog.ts`

## 6. Verification

- [x] 6.1 `pnpm build` passes
- [x] 6.2 `pnpm verify:model` passes for both models
- [ ] 6.3 Manual browser check: models render with skin texture, decals wrap
- [ ] 6.4 Judge whether small decals degenerate on the low-poly mesh

## 7. Deferred — not in this change

- [ ] 7.1 PNG export with custom backgrounds
- [ ] 7.2 `TessellateModifier` if 6.4 shows decal degeneration
- [ ] 7.3 Code-split three.js to cut the 339 KB gzip bundle
- [ ] 7.4 Additional body parts (leg, back, chest, head)
- [ ] 7.5 Automated tests — no runner configured yet

## Review Workload Forecast

- Estimated changed lines: ~1,150 (greenfield, no modified files)
- 400-line budget risk: **High** — but every line is new scaffolding on an empty
  repository, so there is no diff to review against prior behaviour
- Chained PRs recommended: No
- Decision needed before apply: No
