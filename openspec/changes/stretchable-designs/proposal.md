# Proposal: stretchable designs

## Why

A design could be scaled, but only at its file's aspect ratio. Real placement does
not work that way: lettering gets condensed to fit between two moles, an ornament
gets pulled long to follow the forearm, a piece gets squashed to sit inside a gap.
Right now the only way to do any of that is to leave the app, distort the file in an
image editor, and re-upload it — which also means losing the placement.

## What changes

- Width and height become **independent dimensions**, each with its own slider and
  its own centimetre readout.
- A **proportions lock**, on by default, scales both together.
- A **restore proportions** action returns to the file's original ratio.

## Key decisions

### Height becomes real state, and `aspect` stays

`heightUnits` is stored rather than derived from `aspect`, and `aspect` is kept as
the file's intrinsic ratio. Deriving height would have made stretching impossible;
dropping `aspect` once stretched would have made "restore proportions" impossible.
Keeping both costs one number per design and leaves every operation reversible.

### The lock preserves the current ratio, not the file's

Locking after a deliberate stretch keeps that stretch. Snapping back to the file's
ratio on lock would silently discard work the user just did — and there is already
an explicit control for going back.

### At the extremes, the link gives way

When the linked dimension would leave the slider range it clamps, which breaks the
ratio. The alternative — letting a value sit off-scale — hides the state from the
control that is supposed to show it. A visible clamp is recoverable; an invisible
out-of-range value is not.

### Projection depth follows the larger dimension

`projectionDepth` took only the width. A design stretched tall would have been given
a box too shallow for it and clipped against the surface. It now derives from
`max(width, height)`.

## Risks

- **Extreme stretches expose texture filtering.** Pulling a small design very long
  magnifies its pixels. Nothing to fix in code; it is what the source file allows.
- **Old sessions.** Files written before this change carry no `heightUnits`. They
  are read back at the intrinsic ratio, which is exactly what their author saw.

## Out of scope

- Shearing or free-form corner handles. Two axes cover the stated need.
- Dragging the design's edges in the viewport. The decal is coincident with the
  skin, so handle hit-testing has the same ambiguity that made grabbing use anchor
  distance instead of a raycast.
