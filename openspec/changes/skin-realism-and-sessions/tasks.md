# Tasks: skin realism and portable sessions

## 1. Subsurface ink

- [x] 1.1 Extract the decal shader patch into `lib/inkMaterial.ts`
- [x] 1.2 Switch the decal to `MultiplyBlending` + `premultipliedAlpha` + `toneMapped={false}`
- [x] 1.3 Output raw ink in `.rgb` and coverage in `.a`, letting three premultiply
      after the colour-space conversion
- [x] 1.4 Add depth-driven desaturation and dermis tint
- [x] 1.5 Keep the grazing-angle fade, folded into `coverage`
- [x] 1.6 Mark design textures as sRGB — they were being decoded as linear
- [x] 1.7 Add `inkDepth` to the design model and an Ink depth slider

## 2. Skin tone

- [x] 2.1 `body-model/skin-tones.ts` with linear tint multipliers
- [x] 2.2 Clone the GLTF material in `BodyModel` so the cached asset is never mutated
- [x] 2.3 Dispose the clone on unmount
- [x] 2.4 Swatch picker in the panel
- [x] 2.5 `skinToneId` in the store, included in history and sessions

## 3. Photo capture

- [x] 3.1 `lib/captureCanvas.ts` — snapshot/restore of pixel ratio, background,
      clear alpha and ground shadow
- [x] 3.2 `captureFrame` and `captureTurntable`
- [x] 3.3 `CaptureRig` inside the Canvas, driven by a store request token
- [x] 3.4 `alpha: true` on the WebGL context for transparent capture
- [x] 3.5 Name the ContactShadows so a transparent capture can hide it
- [x] 3.6 Capture panel: backdrop, resolution, this view / 4 angles
- [x] 3.7 Gap between downloads so browsers do not drop the later files

## 4. Sessions

- [x] 4.1 `lib/sessionFile.ts` — serialize, download, parse
- [x] 4.2 Embed artwork as data URLs so the file is self-contained
- [x] 4.3 Paranoid validation of every field on import
- [x] 4.4 Tolerate sessions saved before `inkDepth` existed
- [x] 4.5 Save / Open buttons

## 5. Undo and redo

- [x] 5.1 Split the store into document state and transient state
- [x] 5.2 `commit()` with past/future stacks and a 60-entry bound
- [x] 5.3 Merge key so a slider drag or a pointer drag is one step
- [x] 5.4 `lib/textureRegistry.ts` — revoke by reachability, not by lifecycle
- [x] 5.5 `useHistoryShortcuts` with Ctrl+Z / Ctrl+Y / Cmd+Shift+Z
- [x] 5.6 Skip shortcuts inside text entry fields
- [x] 5.7 Undo / Redo buttons

## 6. Verification

- [x] 6.1 `pnpm build` passes
- [x] 6.2 `pnpm lint` passes
- [x] 6.3 `pnpm verify:model` still passes for both models
- [x] 6.4 New `pnpm verify:shader` — asserts every shader anchor and the chunk
      ordering the multiply blend depends on
- [ ] 6.5 Manual browser check: ink reads as under the skin, tones look right,
      capture downloads, session round-trips, Ctrl+Z behaves
- [ ] 6.6 Judge whether the default ink depth of 0.55 is too strong on colour work

## 7. Deferred

- [ ] 7.1 Ageing simulation (blur + fade at 2 / 5 / 10 years)
- [ ] 7.2 Hosted share links — needs a backend, see the proposal's non-goal
- [ ] 7.3 Contact sheet: the four angles composited into one image
- [ ] 7.4 Code-split three.js to cut the 347 KB gzip bundle

## Review Workload Forecast

- Estimated changed lines: ~1,100 across 14 files (8 new, 6 modified)
- 400-line budget risk: **High**
- Chained PRs recommended: Yes — the five features are independent and could ship
  as separate slices
- Decision needed before apply: No — the user asked for all five together
