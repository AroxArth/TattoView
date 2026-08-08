# Tasks: mirroring and Spanish-first localization

## 1. Mirror

- [x] 1.1 `mirrored` on the design model, default false
- [x] 1.2 Flip via texture `repeat.x` / `offset.x`, never a negative decal scale
- [x] 1.3 Mirror toggle in the Adjust section
- [x] 1.4 Included in history, so Ctrl+Z reverses it
- [x] 1.5 Serialized in sessions, with a default for files saved before it existed

## 2. i18n core

- [x] 2.1 `src/i18n/dictionary.ts` — Spanish as source of truth, English typed
      against it so the compiler enforces completeness
- [x] 2.2 `src/i18n/index.ts` — zustand store, `localStorage`, `useT()`
- [x] 2.3 Spanish default, deliberately not derived from `navigator.language`
- [x] 2.4 `document.documentElement.lang` kept in sync
- [x] 2.5 `TranslatedError` so lib code carries a key, not a sentence
- [x] 2.6 Key fallback renders the key itself rather than an empty label

## 3. Translation

- [x] 3.1 DesignPanel, CapturePanel, SessionActions, DesignPreviewDialog
- [x] 3.2 ModelCredits — connecting words only; title, author and license verbatim
- [x] 3.3 EditorCanvas and CaptureRig toasts, loading state, viewport hint
- [x] 3.4 `model-labels.ts` bridging catalog ids to keys
- [x] 3.5 Catalog `label` fields kept as developer-facing identifiers, documented
- [x] 3.6 `LanguageToggle`, with each option labelled in its own language
- [x] 3.7 `index.html` defaults to `lang="es"`

## 4. Verification

- [x] 4.1 `pnpm build` passes
- [x] 4.2 `pnpm lint` passes
- [x] 4.3 `pnpm verify:shader` still passes — the mirror touches the same material
- [x] 4.4 New `pnpm verify:i18n`: key parity, placeholder parity, id-derived keys,
      dead keys
- [x] 4.5 Guard tested by deliberately breaking the dictionary — caught all three
      failure classes and exited 1
- [ ] 4.6 Manual browser check: mirror flips without moving the design, language
      switch reaches every string, choice survives a reload

## 5. Docs

- [x] 5.1 `README.md` is now Spanish, matching the product's default
- [x] 5.2 `README.en.md` carries the English version, cross-linked both ways
- [x] 5.3 Both document the mirror decision, the language policy and `verify:i18n`

## 6. Deferred

- [ ] 6.1 More languages — the structure supports them, nobody has asked
- [ ] 6.2 Vertical flip. Horizontal solves the left/right arm problem; vertical has
      no equivalent use case yet
- [ ] 6.3 Localized number formatting — only cm and degrees are shown

## Review Workload Forecast

- Estimated changed lines: ~900 across 20 files (7 new, 13 modified), of which
  ~450 are dictionary entries and README prose
- 400-line budget risk: **Medium** — the logic surface is small; the volume is
  translation data
- Chained PRs recommended: Yes, ideally — mirror and i18n are independent
- Decision needed before apply: No — the user asked for both together
