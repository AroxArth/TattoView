# TattooView

**English** · [Español](README.md)

Try a tattoo on a 3D arm before the needle touches skin. You upload a design, click where it goes, and it is **projected onto the real geometry of the limb** — wrapping around the wrist, following the forearm — not pasted flat on top of a photo. A calibration input turns world units into centimetres, so the size you see is the size that gets inked.

Runs entirely in the browser. No server, no upload of your artwork anywhere.

---

## Quick path

```bash
pnpm install
pnpm dev
```

Then, in the app:

1. Pick a body part (**Forearm** or **Full arm**) and a **skin tone**.
2. **Upload design** → a preview dialog opens. Toggle background removal if your file has one, then Accept.
3. Click on the skin to anchor the tattoo.
4. Adjust width, height, rotation, mirror, ink density and ink depth in the left panel. The **Proportions** lock scales both dimensions together; release it to stretch the design freely.
5. Enter your real measurement (e.g. elbow-to-fingertips in cm) to see the tattoo's true size.
6. **Photo** → pick a backdrop and save the view, or four angles at once.
7. **Save session** → one file with the placement and the artwork inside, to send to your artist.

Viewport controls: **double click** a tattoo to grab it, move the pointer, click again to drop (Escape cancels). Drag the skin to orbit, scroll to zoom. **Ctrl+Z** / **Ctrl+Y** undo and redo.

**The interface starts in Spanish.** English is one click away at the bottom of the panel, and the choice is remembered. See [Language](#language).

---

## Stack

| Layer | Choice |
|-------|--------|
| Build | Vite 8 + TypeScript 6, pnpm 11 |
| UI | React 19, Tailwind CSS 4, lucide-react, sonner |
| 3D | three.js 0.185 + @react-three/fiber + @react-three/drei |
| State | zustand |
| Assets | @gltf-transform (Node scripts), sharp |
| Lint | oxlint |

**No Next.js, deliberately.** TattooView is 100% client-side WebGL: nothing renders on a server, a 3D editor has no SEO surface, and the mobile target (Capacitor) needs a static SPA build. SSR would buy complexity and nothing else.

**No i18n runtime either.** See [Language](#language) for why 90 keys did not justify a library.

---

## How it works

### Decal projection, not 2D overlay

Designs are rendered with `three.js` `DecalGeometry` through drei's `<Decal>`. That clips the body mesh's actual triangles and produces new geometry that follows the limb's topography. This is the whole product differentiator — an image composited over a render would not wrap.

Two consequences worth knowing before touching this code:

- **`<Decal>` leaves its mesh at identity.** `position` / `rotation` / `scale` are consumed to build the geometry, not applied to the object. The vertices are baked into the *parent* mesh's local space.
- **`<Decal>` force-writes five material props** (`transparent`, `polygonOffset`, `polygonOffsetFactor`, `depthTest`, `map`) via `material-*`. Setting them on the child material is silently ignored — pass them on `<Decal>` itself.

### Orientation is a normal plus a roll

A surface normal fixes only two of the three rotational degrees of freedom. `Object3D.lookAt()` resolves the third one with its own internal up vector, which is why tattoos used to land crooked. [surfacePlacement.ts](src/features/tattoo-editor/lib/surfacePlacement.ts) instead builds an explicit orthonormal basis referenced to the limb axis (`+Y`), so designs run **along** the arm by default, with the user's `roll` applied in decal-local space on top.

Designs are therefore stored as `normal` + `roll`, never as a baked euler: the normal comes from the surface and changes on move, the roll is the user's choice and must stay independent.

### Mirroring is a UV transform, not a negative scale

Flipping a design for the other arm looks like a job for `scale.x = -1`. It is not. `DecalGeometry` **consumes** the scale to build its projector box, so a negative axis inverts the projection itself — the artwork lands reversed *and* the clipped geometry is built inside out.

So the mirror flips the texture's own `u` instead: `repeat.x = -1`, `offset.x = 1`, which maps `u` to `1 - u`. The projection is untouched; only the image on it reverses.

### Width and height are two dimensions, not one scale

The decal stores `widthUnits` and `heightUnits` separately, and keeps the file's intrinsic `aspect` alongside them. Stretching is therefore real state rather than a derived factor — and **restore proportions** can always get back to the original ratio, because that ratio was never lost.

With the lock on, the ratio preserved is the **current** one, not the file's: stretch deliberately and then scale, and the stretch survives. At the ends of the range the link gives way rather than letting a dimension leave the slider — clamping is visible, an off-scale value is not.

Projection box depth now derives from `max(width, height)`: a design stretched tall needs a deeper box or it would clip against the surface.

### Ink lives under the skin, not on it

A tattoo is pigment in the dermis with living tissue still on top of it. Three things follow, and none of them can be faked by lowering a texture's opacity:

- **Ink only ever subtracts light.** A tattoo can never be brighter than the skin around it. So the decal is a **multiply blend** against the already-rendered skin, not a lit surface drawn over it.
- **Multiplying against lit skin means the ink inherits the shading for free** — shadows, falloff, the lot. No second lighting pass, and no way for the artwork to float above the limb.
- **Tissue above the pigment scatters light**, so buried ink loses saturation and its blacks shift toward blue-grey. That is the **Ink depth** slider.

The warmth you see in the result comes from the multiply against warm skin, not from tinting the ink warm — tint both and black work turns muddy brown.

[inkMaterial.ts](src/features/tattoo-editor/lib/inkMaterial.ts) holds the whole model. Three material flags are a package and must move together:

| Flag | Why |
|---|---|
| `blending={MultiplyBlending}` | the blend itself |
| `premultipliedAlpha` | three **refuses** to set a blend function for `MultiplyBlending` without it — it logs an error and silently leaves blending unset |
| `toneMapped={false}` | ACES maps 1.0 to ~0.8, so tone mapping a multiply factor would grey out the whole limb through every transparent texel |

The shader writes raw ink in `.rgb` and coverage in `.a`; three's own `premultiplied_alpha_fragment` runs *after* the colour-space conversion, which is what makes this a Photoshop-style multiply in display space rather than a linear one.

**Known consequence:** a multiply cannot lighten. White and very pale ink are invisible against skin. That is physically honest — white ink barely shows on real skin either — but it will surprise anyone expecting a sticker preview.

### Grazing-angle fade

`DecalGeometry` is a **box projection** — the texture is cast along one axis like a slide projector. Where the surface turns away from that axis, each texel covers more skin and the artwork smears; at 90° the stretch is infinite. This is projection maths, **not polygon count** — it happens identically at 3.5k triangles and at 3M.

[TattooDecal.tsx](src/features/tattoo-editor/components/TattooDecal.tsx) patches `MeshStandardMaterial` via `onBeforeCompile` to fade coverage out as the surface rotates away from the projection axis, and discards fully transparent fragments. Two things keep it working:

- `customProgramCacheKey` is **mandatory** — three caches programs by material parameters and ignores `onBeforeCompile`. Without a distinct key the decal and the skin (also a `MeshStandardMaterial`) can share one compiled program.
- The material must stay `transparent`. `opaque_fragment` resets `diffuseColor.a = 1.0` under `#ifdef OPAQUE`, which would erase the fade.

### Skin tone tints, it does not replace

[skin-tones.ts](src/features/body-model/skin-tones.ts) stores **linear multipliers** applied to the model's albedo texture through `material.color`. Multiplying keeps the pores, veins and painted shading of the source texture; a flat replacement colour produces a plastic mannequin. Values above 1 are legitimate — the source texture is a mid tone, so the lighter entries have to scale it up.

The material is **cloned** before tinting. `useGLTF` caches the scene globally, so tinting in place would leak the tone into every other mount and survive a model switch.

### Undo frees textures by reachability, not by lifecycle

Deleting a design used to revoke its object URL immediately. Correct right up until undo exists — the history still holds a snapshot pointing at that URL, so undoing the delete would restore a design whose texture had already been destroyed. A blank tattoo, and nothing in the console to explain it.

So [textureRegistry.ts](src/features/tattoo-editor/lib/textureRegistry.ts) revokes a URL only once no snapshot in the past, present or future references it — exactly when the user can no longer reach it by any sequence of undo or redo. History is bounded at 60 entries, which bounds the leak.

Slider and pointer drags collapse into a single history entry via a merge key, so one drag of the size slider is one Ctrl+Z, not a hundred.

### Calibration returns null, never a guess

`useCmPerUnit()` yields `null` until both the model span and the user's reference measurement exist; the UI shows an em dash. A tattoo artist marks permanent ink from that number — a plausible estimate is more dangerous than a blank.

### Background removal by colour distance

[removeBackground.ts](src/features/tattoo-editor/lib/removeBackground.ts) derives alpha from each pixel's **RGB Euclidean distance** to a background colour sampled from four corner patches — not from brightness. A brightness threshold erases every pale colour regardless of hue, so a watercolour design would lose its yellows and pinks along with the paper.

Default tolerance is `0.08`, calibrated to keep pale yellow and pale pink alive on white. The principle: fail toward *leaving background behind* (fixable with the slider) rather than eating the artwork (looks broken).

---

## Language

**Spanish is the default, and it is not negotiated with the browser.** A visitor whose laptop reports `en-US` still lands in Spanish. What the browser reports is a guess about a person; guessing wrong on the very first screen is worse than being predictable. An explicit choice is stored in `localStorage` and always wins.

[src/i18n/dictionary.ts](src/i18n/dictionary.ts) holds all 90 strings, and **Spanish is the source of truth**:

```ts
const es = { /* written freely */ }
export type TranslationKey = keyof typeof es
const en: Record<TranslationKey, string> = { /* completeness enforced by the compiler */ }
```

Adding a Spanish key without its English counterpart is a **build error**, not a blank label found by a user.

No i18n library. 90 keys across eleven components did not justify a runtime, an ICU parser or plural rules — the whole implementation is a typed object, a zustand store and a `useT()` hook.

### What types cannot catch, `pnpm verify:i18n` does

Three failure modes slip past the compiler:

1. **Keys derived from ids.** `model-labels.ts` builds `model.${id}` with a cast, because the id is data rather than a literal. Add a body part without its entries and the UI renders the key itself.
2. **Placeholder drift.** `{count}` in Spanish and no `{count}` in English are two perfectly valid strings — and the number silently vanishes from one language.
3. **Dead keys** left behind by rewritten components.

The script exits non-zero on all three. It was tested by deliberately breaking the dictionary before being trusted.

Library code never throws an English sentence: it throws a [`TranslatedError`](src/i18n/index.ts) carrying a key, and the component decides the language.

---

## Project structure

```
src/
  i18n/               dictionary.ts, index.ts
  features/
    body-model/
      components/   BodyModel.tsx, ModelCredits.tsx
      lib/          normalizeGeometry.ts
      model-catalog.ts, skin-tones.ts, model-labels.ts
    tattoo-editor/
      components/   EditorCanvas.tsx, DesignPanel.tsx, TattooDecal.tsx,
                    DesignPreviewDialog.tsx, CapturePanel.tsx, CaptureRig.tsx,
                    SessionActions.tsx, LanguageToggle.tsx
      hooks/        useHistoryShortcuts.ts
      lib/          surfacePlacement.ts, inkMaterial.ts, removeBackground.ts,
                    captureCanvas.ts, sessionFile.ts, textureRegistry.ts
      store/        editorStore.ts
scripts/            prepare-model.mjs, verify-model.mjs,
                    verify-shader.mjs, verify-i18n.mjs
public/models/      forearm.glb, fullarm.glb
openspec/           spec-driven development artifacts
```

Feature-sliced: each feature owns its `components/`, `lib/` and `store/`. `i18n` sits outside them because it is cross-cutting, not a feature. Path alias `@/*` → `./src/*`.

### Geometry normalization is load-bearing

The source models differ by ~60× in scale and point down different axes. [normalizeGeometry.ts](src/features/body-model/lib/normalizeGeometry.ts) bakes the world matrix into a cloned geometry, rotates the dominant axis to `+Y`, centers it, and scales it to a fixed limb length — so the mesh renders at **identity transform**.

That is not cosmetic. `<Decal>` positions live in the parent mesh's local space while raycast hits arrive in world space; identity makes them the same space. Wrapping the model in a scaled `<group>` would silently offset every placement.

---

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b` + production build |
| `pnpm lint` | oxlint |
| `pnpm preview` | Serve the production build |
| `pnpm prepare:model <in> <out.glb>` | Convert a downloaded model into a shippable GLB |
| `pnpm verify:model <glb...>` | Assert a GLB is loadable and correctly normalized |
| `pnpm verify:shader` | Assert the ink shader's injection anchors still exist in three's source |
| `pnpm verify:i18n` | Assert the dictionary is complete, consistent and free of dead keys |

All three `verify:*` scripts exit non-zero on failure, and none of them is ceremony. `onBeforeCompile` patches shaders with `String.replace()`: a missed anchor returns the string untouched and reports nothing, so build, types and lint all stay green while the tattoo renders wrong. Run `verify:shader` after any three upgrade.

Requires Node 24+ and pnpm 11.

---

## Adding a body model

**Blender is not part of this pipeline and must never become one.** Everything runs through `@gltf-transform`.

1. Download a **CC0 or CC-BY** model from Sketchfab (*Download 3D Model → glTF*). Sketchfab's download endpoint requires an authenticated session, so this step is manual. The public metadata endpoint `https://api.sketchfab.com/v3/models/{uid}` is open and returns license, author and triangle count — use it to verify the license without logging in.
2. `pnpm prepare:model path/to/scene.gltf public/models/<name>.glb`
3. `pnpm verify:model public/models/<name>.glb`
4. Add an entry to [model-catalog.ts](src/features/body-model/model-catalog.ts). `attribution` is a **required field** on the type, so a model cannot be added without credit data.
5. Add `model.<id>` and `model.<id>.measurement` to **both** dictionaries, then run `pnpm verify:i18n`.

What `prepare:model` fixes for you:

- **`KHR_materials_pbrSpecularGlossiness` in `extensionsRequired`.** Sketchfab still exports it; three.js dropped it, and `GLTFLoader` *rejects* an asset whose required extension it cannot satisfy — the model would not load at all, not merely look grey. `metalRough()` rewrites the materials and clears the flag.
- **The pnpm + sharp version mismatch.** The `gltf-transform` CLI resolves its own bundled sharp, which under pnpm can pair one release's JS with another release's libvips binary (`colourspace: parameter space not set`). The script passes an explicitly pinned `sharp` instance instead.

The CLI package itself is **not a dependency**. It was the only thing pulling a second sharp release into the store, and a second sharp release means a second unapproved build script — which pnpm 11 treats as a hard error that also takes down `pnpm dev`, since the pre-run dependency check shells out to `pnpm install`. Nothing imports the CLI, so it is gone.

Results so far: forearm 10.84 MB → 1.13 MB, full arm 4.2 MB → 0.47 MB (WebP q88).

### Licensing policy for assets

Only **CC0** or **CC-BY**. `CC-BY-SA` is rejected (ShareAlike is viral and would contaminate a commercial product); `CC-BY-NC` is rejected (blocks monetization). CC-BY obliges a visible credits screen — [ModelCredits.tsx](src/features/body-model/components/ModelCredits.tsx) is that obligation, not a nicety. Removing it puts the product in breach.

The credits dialog translates only its connecting words. Titles, author names and license names stay exactly as their authors published them, in every language — those are the identifiers the license requires to be reproduced.

---

## Sharing a session

Sessions save to a **file**, not a link. That is a constraint, not a shortcut.

TattooView has no backend, and the artwork is the bulk of a session — one 2048px design is megabytes once encoded, orders of magnitude past what any url can carry. A real share link means hosting other people's artwork somewhere, which is an account, a storage bill and a privacy decision.

The file travels over WhatsApp, mail or Drive, which is how these conversations already happen. It also keeps the promise that a design never leaves the machine unless its owner sends it. See [sessionFile.ts](src/features/tattoo-editor/lib/sessionFile.ts).

---

## Known limitations

- **Multiply blending cannot lighten.** White and very pale ink are invisible against skin. Physically honest, still surprising.
- **Texel stretch at grazing angles** is inherent to box projection. The fade hides it; it does not eliminate it. A higher-poly mesh would not help.
- **Both bundled models are very low-poly** (3,533 and 2,135 triangles). Expect faceting, and a very small tattoo may intersect only a couple of triangles.
- **Switching body part clears all designs** — placement coordinates only mean something on the limb they were recorded against. Undo brings them back.
- **Skin tones are eyeballed multipliers**, not measured values.

---

## Roadmap

- Ageing simulation — how the tattoo reads at 2, 5 and 10 years.
- Contact sheet: the four captured angles composited into one image.
- Mobile build via Capacitor.
- More body parts.

---

## Credits

3D models used under [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/):

- ["arm"](https://sketchfab.com/3d-models/arm-696f4493d39a44d7b5cf4c85b4239ae8) by [DJMaesen](https://sketchfab.com/bumstrum) — CC-BY-4.0
- ["Anatomy - male arm"](https://sketchfab.com/3d-models/anatomy-male-arm-af9a4101fa2c483cab363cf0a629762f) by [3dmaven](https://sketchfab.com/3Dmaven) — CC-BY-4.0

The same credits are shown in-app under **Créditos de los modelos** / **Model credits**.
