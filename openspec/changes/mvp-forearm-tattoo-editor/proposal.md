# Proposal — MVP Forearm Tattoo Editor

## Outcome

A tattoo artist opens TattooView in a browser, sees a 3D forearm, uploads a PNG
design, clicks the skin to place it, and reads back the tattoo's real size in
centimetres. They can orbit the model to judge the result from any angle.

This is the smallest slice that proves the product thesis. If the design does not
convincingly wrap the limb and the centimetre figure is not trustworthy, nothing
built on top of it matters.

## Problem

Tattoo artists currently sell an idea by holding a paper stencil against a client's
arm, or by pasting a flat design over a photo. Both misrepresent the result: skin is
curved, and a flat overlay hides how the design deforms around the limb. Clients
commit to permanent work from a preview that structurally cannot show the truth.

## Approach

Project the design with `DecalGeometry` (via drei `<Decal>`) rather than compositing
it in 2D. The decal clips the body mesh's actual triangles, so the artwork follows
the limb's real topography.

Scale is derived from a single user-supplied measurement. The app measures the model
span in world units, the user declares that span in centimetres, and every design
size is reported through that ratio.

## Scope

In scope:

- One body model: forearm with hand
- Upload PNG/WebP with transparency
- Click-to-place on the mesh surface, using the hit face normal for orientation
- Resize and ink-opacity controls
- Centimetre calibration and real-size readout
- 360° orbit view
- Credits screen for CC-BY model attribution

Out of scope for this change:

- Multi-model library (upper arm, leg, back, chest, head)
- PNG export with custom backgrounds
- Free-form design distortion
- Sleeve planning across multiple pieces
- Accounts, persistence, sharing

## Constraints

- **No Blender.** Asset preparation must run through `@gltf-transform/cli` only.
- **Licensing.** Only CC0 or CC-BY models. CC-BY-SA is viral, CC-BY-NC blocks
  commercial use — both are disqualified. CC-BY obliges a visible credits screen.
- **Mesh density caps fidelity.** The two selected CC-BY models carry 3.5k and 2.1k
  triangles. `DecalGeometry` clips real triangles, so a small tattoo may intersect
  too few of them and collapse into a flat quad. Mitigation is
  `TessellateModifier` (three.js addon, runs in the browser at load).
- **Static SPA only.** Mobile via Capacitor is a later goal; no SSR may be
  introduced.

## Current state

A walking skeleton is already running to de-risk the pipeline before the licensed
assets land: Vite + React + Tailwind shell, R3F canvas with orbit controls, upload,
click-to-place decal, size and opacity controls, calibration readout. It renders on
a **placeholder capsule**, not an anatomical model — the capsule exists only so the
interaction loop is testable today and is deleted when the GLB arrives.

## Rollback plan

The change is additive and self-contained under `src/features/`. Rollback is
reverting the branch; there is no data migration, no persisted state, and no
external service to unwind.

## Open questions

- Which model becomes the default: the forearm-only asset or the shoulder-to-fingers
  asset?
- Does the decal hold up at small sizes on a 3.5k-triangle mesh, or is tessellation
  required before the MVP is credible?
