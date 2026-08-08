# Tasks: stretchable designs

## 1. Model

- [x] 1.1 `heightUnits` on the design, stored rather than derived
- [x] 1.2 `lockAspect`, default true
- [x] 1.3 `aspect` kept as the file's intrinsic ratio, so restore stays possible
- [x] 1.4 `DEFAULT_WIDTH_UNITS` named instead of a literal in two places
- [x] 1.5 `lockAspect` treated as discrete in history, like `mirrored`

## 2. Geometry

- [x] 2.1 `TattooDecal` reads `heightUnits` instead of `width / aspect`
- [x] 2.2 `projectionDepth(width, height)` derives from the larger dimension —
      a tall design was getting a box too shallow for it
- [x] 2.3 `findDesignAtPoint` measures the grab radius from both dimensions, so a
      stretched design stays grabbable across its real extent

## 3. UI

- [x] 3.1 Width and height sliders, each with its own centimetre readout
- [x] 3.2 Proportions lock toggle
- [x] 3.3 Restore-proportions action
- [x] 3.4 `resize()` preserves the current ratio while locked, clamping the linked
      dimension at the ends of the range rather than letting it leave the slider
- [x] 3.5 Four new dictionary keys in both languages; `adjust.size` retired

## 4. Persistence

- [x] 4.1 `heightUnits` and `lockAspect` serialized
- [x] 4.2 Files saved before this change read back at the intrinsic ratio

## 5. Verification

- [x] 5.1 `pnpm build` passes
- [x] 5.2 `pnpm lint` passes
- [x] 5.3 `pnpm verify:shader` still passes
- [x] 5.4 `pnpm verify:i18n` — 90 keys, and it caught `adjust.size` going dead
- [ ] 5.5 Manual browser check: stretch holds, lock scales both, restore returns to
      the original ratio, a tall design does not clip

## 6. Deferred

- [ ] 6.1 Shear and free-form corner handles
- [ ] 6.2 Dragging edges in the viewport — same decal/skin hit-test ambiguity that
      made grabbing use anchor distance instead of a raycast
- [ ] 6.3 Numeric cm entry as an alternative to the sliders

## Review Workload Forecast

- Estimated changed lines: ~250 across 9 files (3 new artifacts, 6 modified)
- 400-line budget risk: **Low**
- Chained PRs recommended: No
- Decision needed before apply: No
