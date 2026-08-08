# Proposal: mirroring and Spanish-first localization

## Why

Two gaps, unrelated to each other but both about meeting the user where they are.

**1. A design only fits one arm.** Placement, rotation and scale are all adjustable,
but the artwork itself is fixed. Anything with a direction — script, a figure facing
sideways, an asymmetric ornament — reads correctly on one arm and backwards on the
other. Today the only fix is to leave the app, flip the file in an image editor, and
upload it again as a second design.

**2. The app was English-only.** The studio and its clients speak Spanish. An
interface in a second language is friction on the one screen where a client is
supposed to be deciding something emotional.

## What changes

- A **mirror** toggle per design, flipping it horizontally.
- **Spanish becomes the default UI language**, with English one click away and the
  choice remembered.

## Key decisions

### Mirroring is a UV transform, not a negative scale

`scale.x = -1` on the decal is the obvious move and it is wrong. `DecalGeometry`
*consumes* the scale to build its projector box, so a negative axis inverts the
projection itself: the artwork lands reversed and the clipped geometry is built
inside out. Flipping the texture's own `u` (`repeat.x = -1`, `offset.x = 1`) leaves
the projection untouched and reverses only the image on it.

### Spanish is the source of truth, enforced by the compiler

`TranslationKey` is derived from the Spanish object, and English is typed as
`Record<TranslationKey, string>`. A Spanish key without its English counterpart is a
build error rather than a blank label found in production.

### The default is not negotiated with the browser

`navigator.language` is a guess about a person. Being predictably Spanish beats
being wrong on the first screen. An explicit choice is stored and always wins.

### No i18n library

87 keys across eleven components. A runtime, an ICU parser and plural rules would
cost more than a typed object, a zustand store and a `useT()` hook.

## Risks

- **Casts bypass the compiler.** `model.${id}` and `skin.${id}` are built from data,
  so a new model without dictionary entries renders its key. Mitigated by
  `pnpm verify:i18n`, which also catches placeholder drift and dead keys — neither
  of which types can see.
- **Attribution wording.** The credits dialog translates its connecting words only;
  titles, authors and license names stay verbatim, since those are the identifiers
  CC-BY requires to be reproduced.

## Out of scope

- More languages. The structure supports them; nobody has asked.
- Localized number and date formatting. The only figures shown are centimetres and
  degrees, which read the same either way.
