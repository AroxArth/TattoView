# Proposal: skin realism and portable sessions

## Why

The MVP proves a design can be projected onto a limb. It does not yet answer the
question a client actually asks before committing: *what will this look like on
me, and can I show it to someone?*

Four gaps stand between the two:

1. **The ink looked painted on.** The decal was a lit surface drawn over the skin,
   so it could end up brighter than the limb it sat on — something pigment under
   living tissue physically cannot do.
2. **One skin tone.** The bundled models carry a single baked skin texture.
   Contrast between ink and surrounding tone is most of what a client is judging,
   so a preview on someone else's skin answers the wrong question.
3. **Nothing left the browser.** A session existed only until the tab closed.
4. **No way back.** A misplaced drag or a slider overshoot was unrecoverable.

## What changes

- Decals render as a **multiply blend against the already-lit skin**, with a depth
  control that desaturates the pigment and shifts it toward a dermis tint.
- A **skin tone** selector applying a linear tint over the model's albedo texture.
- **Photo capture**: chosen backdrop (studio, white, black, transparent), 1–3×
  resolution, single view or four evenly spaced angles.
- **Save / open session** as a self-contained file with the artwork embedded.
- **Undo / redo**, wired to Ctrl+Z and Ctrl+Y (plus Cmd+Shift+Z).

## What does not change

- Placement, orientation and calibration maths are untouched.
- No new 3D assets, and no new licensing obligations.
- Still no backend, and no artwork leaves the machine.

## Explicit non-goal: the share link

A url the client sends to the artist is the obvious shape for "share", and it is
not buildable without a backend. The artwork is the bulk of a session — one 2048px
design is megabytes encoded, orders of magnitude past what a url can carry. A real
link means hosting other people's artwork, which is an account, a storage bill and
a privacy decision, not an afternoon of work.

A file was chosen instead. It travels over WhatsApp, mail or Drive — which is how
these conversations already happen — and it keeps the promise that the design never
leaves the machine unless its owner sends it.

## Risks

- **Multiply cannot lighten.** White or very pale ink becomes invisible against
  skin. This is physically honest rather than a defect, but it will surprise anyone
  who expects white ink to preview like a sticker.
- **Shader anchors are load-bearing.** The blend depends on three's chunk order,
  and a missed `String.replace()` fails silently. Mitigated by `pnpm verify:shader`.
- **Skin tones are eyeballed multipliers**, not measured Fitzpatrick values.
