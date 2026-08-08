/**
 * Bridges catalog ids to translation keys.
 *
 * The catalog and the skin tone table keep their English `label` fields as
 * developer-facing identifiers — they are what shows up in a console or a session
 * file, and they should not shift with the UI language. What the user reads comes
 * from the dictionary instead.
 *
 * The cast is contained here rather than spread across components: an id without a
 * matching key falls back to the key string itself, which is visible and searchable
 * rather than blank. Adding a model means adding `model.<id>` and
 * `model.<id>.measurement` to both dictionaries.
 */
import type { TranslationKey } from '@/i18n'

export function modelLabelKey(id: string): TranslationKey {
  return `model.${id}` as TranslationKey
}

export function modelMeasurementKey(id: string): TranslationKey {
  return `model.${id}.measurement` as TranslationKey
}

export function skinToneLabelKey(id: string): TranslationKey {
  return `skin.${id}` as TranslationKey
}
