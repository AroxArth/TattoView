/**
 * Skin tones offered for the body model.
 *
 * WHY THIS EXISTS: a black tattoo on pale skin and the same tattoo on deep skin
 * are not the same tattoo. Contrast against the surrounding tone is most of what
 * a client is actually judging, and the bundled models ship with one baked skin
 * texture — so without this the preview only ever answers the question for one
 * person.
 *
 * HOW IT WORKS: the values are LINEAR multipliers applied to the model's existing
 * albedo texture through `material.color`, not replacement colours. Multiplying
 * preserves the pores, veins and shading painted into the source texture; a flat
 * replacement colour would produce a plastic mannequin.
 *
 * That also means values above 1 are legitimate and necessary — the source texture
 * is a mid tone, so the lighter entries have to scale it up. `Color.setRGB` takes
 * raw floats in the working (linear) colour space and does not clamp them.
 */
export interface SkinTone {
  id: string
  /** Developer-facing; the shown text is `skinToneLabelKey(id)`. */
  label: string
  /** Linear-space RGB multiplier over the model's albedo texture. */
  tint: [number, number, number]
}

export const SKIN_TONES: SkinTone[] = [
  { id: 'porcelain', label: 'Porcelain', tint: [1.32, 1.18, 1.08] },
  { id: 'fair', label: 'Fair', tint: [1.14, 1.04, 0.96] },
  { id: 'natural', label: 'Natural', tint: [1, 1, 1] },
  { id: 'olive', label: 'Olive', tint: [0.86, 0.78, 0.62] },
  { id: 'tan', label: 'Tan', tint: [0.68, 0.55, 0.41] },
  { id: 'brown', label: 'Brown', tint: [0.44, 0.32, 0.23] },
  { id: 'deep', label: 'Deep', tint: [0.24, 0.17, 0.13] },
]

/** The model's own texture, untouched. */
export const DEFAULT_SKIN_TONE_ID = 'natural'

export function getSkinTone(id: string): SkinTone {
  return SKIN_TONES.find((tone) => tone.id === id) ?? SKIN_TONES[2]
}
