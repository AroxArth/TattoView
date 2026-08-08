# TattooView

Try a tattoo on a 3D arm before the needle touches skin. You upload a design, click where it goes, and it is **projected onto the real geometry of the limb** — wrapping around the wrist, following the forearm — not pasted flat on top of a photo. A calibration input turns world units into centimetres, so the size you see is the size that gets inked.

Runs entirely in the browser. No server, no upload of your artwork anywhere.

---

## Quick path

```bash
pnpm install
pnpm dev
```

Then, in the app:

1. Pick a body part (**Forearm** or **Full arm**).
2. **Add design** → a preview dialog opens. Toggle background removal if your file has one, then Accept.
3. Click on the skin to anchor the tattoo.
4. Adjust size, opacity and rotation in the left panel.
5. Enter your real measurement (e.g. elbow-to-fingertips in cm) to see the tattoo's true size.

Viewport controls: **double click** a tattoo to grab it, move the pointer, click again to drop (Escape cancels). Drag the skin to orbit, scroll to zoom.

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

### Grazing-angle fade

`DecalGeometry` is a **box projection** — the texture is cast along one axis like a slide projector. Where the surface turns away from that axis, each texel covers more skin and the artwork smears; at 90° the stretch is infinite. This is projection maths, **not polygon count** — it happens identically at 3.5k triangles and at 3M.

[TattooDecal.tsx](src/features/tattoo-editor/components/TattooDecal.tsx) patches `MeshStandardMaterial` via `onBeforeCompile` to fade alpha out as the surface rotates away from the projection axis, and discards fully transparent fragments. Two things keep it working:

- `customProgramCacheKey` is **mandatory** — three caches programs by material parameters and ignores `onBeforeCompile`. Without a distinct key the decal and the skin (also a `MeshStandardMaterial`) can share one compiled program.
- The material must stay `transparent`. `opaque_fragment` resets `diffuseColor.a = 1.0` under `#ifdef OPAQUE`, which would erase the fade.

### Calibration returns null, never a guess

`useCmPerUnit()` yields `null` until both the model span and the user's reference measurement exist; the UI shows an em dash. A tattoo artist marks permanent ink from that number — a plausible estimate is more dangerous than a blank.

### Background removal by colour distance

[removeBackground.ts](src/features/tattoo-editor/lib/removeBackground.ts) derives alpha from each pixel's **RGB Euclidean distance** to a background colour sampled from four corner patches — not from brightness. A brightness threshold erases every pale colour regardless of hue, so a watercolour design would lose its yellows and pinks along with the paper.

Default tolerance is `0.08`, calibrated to keep pale yellow and pale pink alive on white. The principle: fail toward *leaving background behind* (fixable with the slider) rather than eating the artwork (looks broken).

---

## Project structure

```
src/
  features/
    body-model/
      components/   BodyModel.tsx, ModelCredits.tsx
      lib/          normalizeGeometry.ts
      model-catalog.ts
    tattoo-editor/
      components/   EditorCanvas.tsx, DesignPanel.tsx, TattooDecal.tsx, DesignPreviewDialog.tsx
      lib/          surfacePlacement.ts, removeBackground.ts
      store/        editorStore.ts
scripts/            prepare-model.mjs, verify-model.mjs
public/models/      forearm.glb, fullarm.glb
openspec/           spec-driven development artifacts
```

Feature-sliced: each feature owns its `components/`, `lib/` and `store/`. Path alias `@/*` → `./src/*`.

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
| `pnpm verify:model <glb...>` | Assert a GLB is loadable and correctly normalized (exits non-zero on failure) |

Requires Node 24+ and pnpm 11.

---

## Adding a body model

**Blender is not part of this pipeline and must never become one.** Everything runs through `@gltf-transform`.

1. Download a **CC0 or CC-BY** model from Sketchfab (*Download 3D Model → glTF*). Sketchfab's download endpoint requires an authenticated session, so this step is manual. The public metadata endpoint `https://api.sketchfab.com/v3/models/{uid}` is open and returns license, author and triangle count — use it to verify the license without logging in.
2. `pnpm prepare:model path/to/scene.gltf public/models/<name>.glb`
3. `pnpm verify:model public/models/<name>.glb`
4. Add an entry to [model-catalog.ts](src/features/body-model/model-catalog.ts). `attribution` is a **required field** on the type, so a model cannot be added without credit data.

What `prepare:model` fixes for you:

- **`KHR_materials_pbrSpecularGlossiness` in `extensionsRequired`.** Sketchfab still exports it; three.js dropped it, and `GLTFLoader` *rejects* an asset whose required extension it cannot satisfy — the model would not load at all, not merely look grey. `metalRough()` rewrites the materials and clears the flag.
- **The pnpm + sharp version mismatch.** The `gltf-transform` CLI resolves its own bundled sharp, which under pnpm can pair one release's JS with another release's libvips binary (`colourspace: parameter space not set`). The script passes an explicitly pinned `sharp` instance instead.

Results so far: forearm 10.84 MB → 1.13 MB, full arm 4.2 MB → 0.47 MB (WebP q88).

### Licensing policy for assets

Only **CC0** or **CC-BY**. `CC-BY-SA` is rejected (ShareAlike is viral and would contaminate a commercial product); `CC-BY-NC` is rejected (blocks monetization). CC-BY obliges a visible credits screen — [ModelCredits.tsx](src/features/body-model/components/ModelCredits.tsx) is that obligation, not a nicety. Removing it puts the product in breach.

---

## Known limitations

- **Texel stretch at grazing angles** is inherent to box projection. The fade hides it; it does not eliminate it. A higher-poly mesh would not help.
- **Both bundled models are very low-poly** (3,533 and 2,135 triangles). Expect faceting, and a very small tattoo may intersect only a couple of triangles.
- **Switching body part clears all designs** — placement coordinates only mean something on the limb they were recorded against.

---

## Roadmap

- High-resolution PNG export of the composed view (the canvas is already created with `preserveDrawingBuffer: true` for this).
- Mobile build via Capacitor.
- More body parts.

---

## Credits

3D models used under [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/):

- ["arm"](https://sketchfab.com/3d-models/arm-696f4493d39a44d7b5cf4c85b4239ae8) by [DJMaesen](https://sketchfab.com/bumstrum) — CC-BY-4.0
- ["Anatomy - male arm"](https://sketchfab.com/3d-models/anatomy-male-arm-af9a4101fa2c483cab363cf0a629762f) by [3dmaven](https://sketchfab.com/3Dmaven) — CC-BY-4.0

The same credits are shown in-app under **Model credits**.
