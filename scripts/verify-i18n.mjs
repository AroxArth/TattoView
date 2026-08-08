/**
 * Asserts the dictionary is complete and consistent.
 *
 * Usage:
 *   pnpm verify:i18n
 *
 * WHAT THE COMPILER ALREADY COVERS
 *
 * `en` is typed as `Record<TranslationKey, string>`, so a missing English string is
 * a build error. That is the biggest failure mode, and it is already handled.
 *
 * WHAT IT CANNOT COVER — which is why this exists
 *
 *  1. KEYS DERIVED FROM IDS. `model-labels.ts` builds `model.${id}` with a cast,
 *     because the id is data, not a literal. Add a body part or a skin tone without
 *     its dictionary entries and the UI renders the key itself — visible, but only
 *     if someone happens to look at that control.
 *  2. PLACEHOLDER DRIFT. `{count}` in Spanish and no `{count}` in English is two
 *     valid strings as far as types are concerned, and the number silently vanishes
 *     from one language.
 *  3. DEAD KEYS. Strings kept alive long after the component that used them was
 *     rewritten.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { BODY_MODELS } from '../src/features/body-model/model-catalog.ts'
import { SKIN_TONES } from '../src/features/body-model/skin-tones.ts'
import { DICTIONARY, LANGUAGES } from '../src/i18n/dictionary.ts'

const SOURCE_ROOT = 'src'

const problems = []

function fail(message) {
  problems.push(message)
}

// --- 1. Both languages carry exactly the same keys -----------------------------
const keySets = LANGUAGES.map((language) => new Set(Object.keys(DICTIONARY[language])))
const [reference] = keySets

for (const [index, language] of LANGUAGES.entries()) {
  for (const key of reference) {
    if (!keySets[index].has(key)) fail(`[${language}] missing key: ${key}`)
  }
  for (const key of keySets[index]) {
    if (!reference.has(key)) fail(`[${language}] extra key not in the source language: ${key}`)
  }
}

// --- 2. Placeholders match across languages ------------------------------------
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

for (const key of reference) {
  const signatures = LANGUAGES.map((language) => placeholders(DICTIONARY[language][key]).join(','))
  const [expected] = signatures

  for (const [index, signature] of signatures.entries()) {
    if (signature !== expected) {
      fail(
        `placeholder mismatch on "${key}": ${LANGUAGES[0]} has [${expected}], ` +
          `${LANGUAGES[index]} has [${signature}]`,
      )
    }
  }
}

// --- 3. Every id-derived key exists --------------------------------------------
for (const model of BODY_MODELS) {
  for (const key of [`model.${model.id}`, `model.${model.id}.measurement`]) {
    if (!reference.has(key)) fail(`body model "${model.id}" has no dictionary entry: ${key}`)
  }
}

for (const tone of SKIN_TONES) {
  const key = `skin.${tone.id}`
  if (!reference.has(key)) fail(`skin tone "${tone.id}" has no dictionary entry: ${key}`)
}

// --- 4. No dead keys ------------------------------------------------------------
function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !path.includes('dictionary') ? [path] : []
  })
}

const source = sourceFiles(SOURCE_ROOT)
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n')

// Keys reached through a cast are matched by their prefix, since the id half is
// only known at runtime.
const DERIVED_PREFIXES = ['model.', 'skin.']

for (const key of reference) {
  if (DERIVED_PREFIXES.some((prefix) => key.startsWith(prefix))) continue
  if (!source.includes(`'${key}'`)) fail(`unused key, nothing references it: ${key}`)
}

// --- Report ---------------------------------------------------------------------
if (problems.length > 0) {
  for (const problem of problems) console.error(`FAIL  ${problem}`)
  console.error(`\n${problems.length} translation problem(s).`)
  process.exit(1)
}

const count = reference.size
console.log(`ok    ${count} keys × ${LANGUAGES.length} languages, complete and consistent.`)
console.log(`ok    every body model and skin tone id has its entries.`)
console.log(`ok    no placeholder drift, no dead keys.`)
