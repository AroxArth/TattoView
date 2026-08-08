# TattooView

**Español** · [English](README.en.md)

Prueba un tatuaje sobre un brazo en 3D antes de que la aguja toque la piel. Subes un diseño, haces clic donde va, y se **proyecta sobre la geometría real del miembro** — envolviendo la muñeca, siguiendo el antebrazo — no pegado plano sobre una foto. Un campo de calibración convierte unidades de mundo en centímetros, así que el tamaño que ves es el tamaño que se tatúa.

Funciona por completo en el navegador. Sin servidor, y tu obra no se sube a ningún lado.

---

## Arranque rápido

```bash
pnpm install
pnpm dev
```

Y ya dentro de la app:

1. Elige la zona del cuerpo (**Antebrazo** o **Brazo completo**) y un **tono de piel**.
2. **Subir diseño** → se abre una vista previa. Activa el quitado de fondo si tu archivo lo necesita, y acepta.
3. Haz clic sobre la piel para anclar el tatuaje.
4. Ajusta ancho, alto, rotación, espejo, densidad y profundidad de tinta en el panel izquierdo. El candado de **Proporción** escala las dos dimensiones juntas; suéltalo para estirar el diseño a voluntad.
5. Introduce tu medida real (por ejemplo, del codo a la punta de los dedos en cm) para ver el tamaño verdadero.
6. **Foto** → elige un fondo y guarda la vista, o cuatro ángulos de una vez.
7. **Guardar sesión** → un archivo con la colocación y la obra dentro, para mandárselo a tu tatuador.

Controles del visor: **doble clic** sobre un tatuaje para tomarlo, mueve el puntero, clic otra vez para soltarlo (Escape cancela). Arrastra la piel para girar, rueda para acercar. **Ctrl+Z** / **Ctrl+Y** deshacen y rehacen.

**La interfaz arranca en español.** El inglés está a un clic al pie del panel, y la elección se recuerda. Ver [Idioma](#idioma).

---

## Stack

| Capa | Elección |
|-------|--------|
| Build | Vite 8 + TypeScript 6, pnpm 11 |
| UI | React 19, Tailwind CSS 4, lucide-react, sonner |
| 3D | three.js 0.185 + @react-three/fiber + @react-three/drei |
| Estado | zustand |
| Assets | @gltf-transform (scripts de Node), sharp |
| Lint | oxlint |

**Sin Next.js, a propósito.** TattooView es WebGL 100% del lado del cliente: no se renderiza nada en un servidor, un editor 3D no tiene superficie SEO, y el objetivo móvil (Capacitor) necesita un build SPA estático. SSR compraría complejidad y nada más.

**Tampoco hay librería de i18n.** En [Idioma](#idioma) está el porqué 90 claves no justificaron una dependencia.

---

## Cómo funciona

### Proyección de calcomanía, no superposición 2D

Los diseños se renderizan con `DecalGeometry` de `three.js` a través del `<Decal>` de drei. Eso recorta los triángulos reales de la malla del cuerpo y produce geometría nueva que sigue la topografía del miembro. Ahí está todo el diferencial del producto — una imagen compuesta sobre un render no envolvería.

Dos consecuencias que conviene saber antes de tocar este código:

- **`<Decal>` deja su malla en identidad.** `position` / `rotation` / `scale` se consumen para *construir* la geometría, no se aplican al objeto. Los vértices quedan horneados en el espacio local de la malla *padre*.
- **`<Decal>` escribe a la fuerza cinco props del material** (`transparent`, `polygonOffset`, `polygonOffsetFactor`, `depthTest`, `map`) vía `material-*`. Ponerlas en el material hijo se ignora en silencio — hay que pasarlas al propio `<Decal>`.

### La orientación es una normal más un giro

Una normal de superficie fija solo dos de los tres grados de libertad rotacionales. `Object3D.lookAt()` resuelve el tercero con su propio vector "arriba" interno, y por eso los tatuajes aterrizaban chuecos. En su lugar, [surfacePlacement.ts](src/features/tattoo-editor/lib/surfacePlacement.ts) construye una base ortonormal explícita referenciada al eje del miembro (`+Y`), así los diseños corren **a lo largo** del brazo por defecto, con el `roll` del usuario aplicado encima en espacio local de la calcomanía.

Por eso los diseños se guardan como `normal` + `roll`, nunca como un euler horneado: la normal viene de la superficie y cambia al mover, el giro es decisión del usuario y debe quedar independiente.

### El espejo es una transformación de UV, no una escala negativa

Voltear un diseño para el otro brazo parece trabajo de `scale.x = -1`. No lo es. `DecalGeometry` **consume** la escala para construir su caja de proyección, así que un eje negativo invierte la proyección misma — la obra aterriza al revés *y* la geometría recortada se construye del revés.

Por eso el espejo voltea la propia `u` de la textura: `repeat.x = -1`, `offset.x = 1`, que mapea `u` a `1 - u`. La proyección queda intacta; solo se invierte la imagen que va sobre ella.

### Ancho y alto son dos dimensiones, no una escala

El decal guarda `widthUnits` y `heightUnits` por separado, y conserva el `aspect` intrínseco del archivo aparte. Estirar es entonces un estado real, no un factor derivado — y el botón de **restaurar proporción** siempre puede volver al ratio original porque nunca se perdió.

Con el candado puesto se preserva la proporción **actual**, no la del archivo: si estiraste a propósito y luego escalas, el estirado se mantiene. En los extremos del rango el vínculo cede en lugar de dejar que una dimensión se salga del deslizador — recortar se ve, un valor fuera de escala no.

La profundidad de la caja de proyección pasó a derivarse de `max(ancho, alto)`: un diseño estirado a lo alto necesita una caja más profunda o se recortaría contra la superficie.

### La tinta vive bajo la piel, no encima

Un tatuaje es pigmento en la dermis con tejido vivo todavía por encima. De ahí salen tres cosas, y ninguna se finge bajando la opacidad de una textura:

- **La tinta solo resta luz, nunca la suma.** Un tatuaje jamás puede ser más brillante que la piel que lo rodea. Por eso la calcomanía es un **blend multiplicativo** contra la piel ya renderizada, no una superficie iluminada dibujada encima.
- **Multiplicar contra piel ya iluminada hace que la tinta herede el sombreado gratis** — sombras, caída, todo. Sin una segunda pasada de iluminación, y sin manera de que la obra flote sobre el miembro.
- **El tejido sobre el pigmento dispersa la luz**, así que la tinta enterrada pierde saturación y sus negros tiran a azul grisáceo. Eso es el deslizador de **Profundidad de tinta**.

La calidez que ves en el resultado viene del multiplicado contra piel cálida, no de teñir la tinta de cálido — tiñe las dos y el trabajo en negro sale marrón embarrado.

[inkMaterial.ts](src/features/tattoo-editor/lib/inkMaterial.ts) tiene el modelo completo. Tres flags del material son un paquete y se mueven juntas:

| Flag | Por qué |
|---|---|
| `blending={MultiplyBlending}` | el blend en sí |
| `premultipliedAlpha` | three **se niega** a fijar una función de blending para `MultiplyBlending` sin esto — registra un error y deja el blending sin configurar, en silencio |
| `toneMapped={false}` | ACES mapea 1.0 a ~0.8, así que aplicar tone mapping a un factor multiplicativo agrisaría el miembro entero a través de cada téxel transparente |

El shader escribe la tinta cruda en `.rgb` y la cobertura en `.a`; el propio `premultiplied_alpha_fragment` de three corre *después* de la conversión de espacio de color, y eso es lo que convierte esto en un multiplicado estilo Photoshop en espacio de pantalla en lugar de uno lineal.

**Consecuencia conocida:** un multiplicado no puede aclarar. La tinta blanca y las muy pálidas son invisibles sobre la piel. Es físicamente honesto — el blanco casi no se ve en piel real tampoco — pero va a sorprender a quien espere una vista previa tipo calcomanía.

### Desvanecido en ángulos rasantes

`DecalGeometry` es una **proyección de caja**: la textura se proyecta a lo largo de un solo eje, como un proyector de diapositivas. Donde la superficie se aleja de ese eje, cada téxel cubre más piel y la obra se estira; a 90° el estiramiento es infinito. Esto es matemática de proyección, **no cantidad de polígonos** — pasa igual con 3.500 triángulos que con 3 millones.

[TattooDecal.tsx](src/features/tattoo-editor/components/TattooDecal.tsx) parchea `MeshStandardMaterial` con `onBeforeCompile` para desvanecer la cobertura conforme la superficie gira lejos del eje de proyección, y descarta los fragmentos totalmente transparentes. Dos cosas lo mantienen vivo:

- `customProgramCacheKey` es **obligatorio** — three cachea programas por parámetros del material e ignora `onBeforeCompile`. Sin una clave distinta, la calcomanía y la piel (también `MeshStandardMaterial`) pueden compartir un mismo programa compilado.
- El material debe seguir siendo `transparent`. `opaque_fragment` reinicia `diffuseColor.a = 1.0` bajo `#ifdef OPAQUE`, lo que borraría el desvanecido.

### El tono de piel tiñe, no reemplaza

[skin-tones.ts](src/features/body-model/skin-tones.ts) guarda **multiplicadores lineales** aplicados a la textura de albedo del modelo mediante `material.color`. Multiplicar conserva los poros, las venas y el sombreado pintado de la textura original; un color plano de reemplazo produce un maniquí de plástico. Los valores por encima de 1 son legítimos — la textura original es un tono medio, así que las entradas más claras tienen que escalarla hacia arriba.

El material se **clona** antes de teñir. `useGLTF` cachea la escena globalmente, así que teñir en el sitio filtraría el tono a cualquier otro montaje y sobreviviría a un cambio de modelo.

### Deshacer libera texturas por alcanzabilidad, no por ciclo de vida

Borrar un diseño revocaba su object URL de inmediato. Correcto hasta el momento exacto en que existe el deshacer — el historial todavía guarda una instantánea que apunta a esa URL, así que deshacer el borrado devolvería un diseño cuya textura ya fue destruida. Un tatuaje en blanco, y nada en la consola que lo explique.

Por eso [textureRegistry.ts](src/features/tattoo-editor/lib/textureRegistry.ts) revoca una URL solo cuando ninguna instantánea del pasado, presente o futuro la referencia — exactamente cuando el usuario ya no puede alcanzarla con ninguna secuencia de deshacer o rehacer. El historial está acotado a 60 entradas, lo que acota la fuga.

Los arrastres de deslizador y de puntero se colapsan en una sola entrada de historial mediante una clave de fusión, así que arrastrar el deslizador de tamaño es **un** Ctrl+Z, no cien.

### La calibración devuelve null, nunca una estimación

`useCmPerUnit()` devuelve `null` hasta que existan tanto el largo del modelo como la medida de referencia del usuario; la interfaz muestra una raya. Un tatuador marca tinta permanente a partir de ese número — una estimación plausible es más peligrosa que un espacio en blanco.

### Quitado de fondo por distancia de color

[removeBackground.ts](src/features/tattoo-editor/lib/removeBackground.ts) deriva el alfa de la **distancia euclidiana RGB** de cada píxel a un color de fondo muestreado en cuatro parches de las esquinas — no del brillo. Un umbral por brillo borra todo color pálido sin importar el matiz, así que un diseño en acuarela perdería sus amarillos y rosas junto con el papel.

La tolerancia por defecto es `0.08`, calibrada para que el amarillo y el rosa pálidos sobrevivan sobre blanco. El principio: fallar hacia *dejar fondo de más* (recuperable con el deslizador) en lugar de comerse la obra (parece que la herramienta está rota).

---

## Idioma

**El español es el predeterminado, y no se negocia con el navegador.** Alguien cuya laptop reporta `en-US` igual aterriza en español. Lo que el navegador reporta es una conjetura sobre una persona; equivocarse en la primerísima pantalla es peor que ser predecible. Una elección explícita se guarda en `localStorage` y siempre gana.

[src/i18n/dictionary.ts](src/i18n/dictionary.ts) tiene las 90 cadenas, y **el español es la fuente de verdad**:

```ts
const es = { /* escrito con libertad */ }
export type TranslationKey = keyof typeof es
const en: Record<TranslationKey, string> = { /* el compilador exige que esté completo */ }
```

Agregar una clave en español sin su contraparte en inglés es un **error de compilación**, no una etiqueta en blanco que descubre un usuario.

Sin librería de i18n. 90 claves repartidas en once componentes no justificaban un runtime, un parser de ICU ni reglas de plural — toda la implementación es un objeto tipado, un store de zustand y un hook `useT()`.

### Lo que los tipos no pueden ver, lo ve `pnpm verify:i18n`

Tres modos de falla se le escapan al compilador:

1. **Claves derivadas de ids.** `model-labels.ts` arma `model.${id}` con un cast, porque el id es dato y no literal. Agrega una zona del cuerpo sin sus entradas y la interfaz muestra la clave misma.
2. **Deriva de placeholders.** `{count}` en español y sin `{count}` en inglés son dos cadenas perfectamente válidas — y el número desaparece en silencio en un idioma.
3. **Claves muertas** que quedaron de componentes reescritos.

El script sale con código distinto de cero en los tres casos. Se probó rompiendo el diccionario a propósito antes de confiar en él.

El código de librería nunca lanza una frase en inglés: lanza un [`TranslatedError`](src/i18n/index.ts) que lleva una clave, y el componente decide el idioma.

---

## Estructura del proyecto

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
openspec/           artefactos de desarrollo guiado por especificación
```

Feature-sliced: cada feature es dueña de sus `components/`, `lib/` y `store/`. `i18n` queda fuera porque es transversal, no una feature. Alias de ruta `@/*` → `./src/*`.

### La normalización de geometría es estructural

Los modelos de origen difieren ~60× en escala y apuntan a ejes distintos. [normalizeGeometry.ts](src/features/body-model/lib/normalizeGeometry.ts) hornea la matriz de mundo en una geometría clonada, rota el eje dominante a `+Y`, la centra y la escala a un largo fijo — para que la malla renderice con **transformación identidad**.

Eso no es cosmético. Las posiciones de `<Decal>` viven en el espacio local de la malla padre, mientras que los impactos del raycast llegan en espacio de mundo; la identidad hace que sean el mismo espacio. Envolver el modelo en un `<group>` escalado desplazaría en silencio cada colocación.

---

## Scripts

| Comando | Qué hace |
|---------|--------------|
| `pnpm dev` | Servidor de desarrollo de Vite |
| `pnpm build` | `tsc -b` + build de producción |
| `pnpm lint` | oxlint |
| `pnpm preview` | Sirve el build de producción |
| `pnpm prepare:model <in> <out.glb>` | Convierte un modelo descargado en un GLB publicable |
| `pnpm verify:model <glb...>` | Verifica que un GLB carga y está bien normalizado |
| `pnpm verify:shader` | Verifica que los anclajes de inyección del shader de tinta siguen existiendo en el código de three |
| `pnpm verify:i18n` | Verifica que el diccionario está completo, consistente y sin claves muertas |

Los tres `verify:*` salen con código distinto de cero al fallar, y ninguno es ceremonia. `onBeforeCompile` parchea shaders con `String.replace()`: un anclaje que no coincide devuelve la cadena intacta y no reporta nada, así que build, tipos y lint quedan todos en verde mientras el tatuaje renderiza mal. Corre `verify:shader` después de cualquier actualización de three.

Requiere Node 24+ y pnpm 11.

---

## Agregar un modelo de cuerpo

**Blender no forma parte de este pipeline y nunca debe formarlo.** Todo pasa por `@gltf-transform`.

1. Descarga un modelo **CC0 o CC-BY** de Sketchfab (*Download 3D Model → glTF*). El endpoint de descarga de Sketchfab exige una sesión autenticada, así que este paso es manual. El endpoint público de metadatos `https://api.sketchfab.com/v3/models/{uid}` está abierto y devuelve licencia, autor y cantidad de triángulos — úsalo para verificar la licencia sin iniciar sesión.
2. `pnpm prepare:model ruta/al/scene.gltf public/models/<nombre>.glb`
3. `pnpm verify:model public/models/<nombre>.glb`
4. Agrega una entrada en [model-catalog.ts](src/features/body-model/model-catalog.ts). `attribution` es un **campo obligatorio** del tipo, así que no se puede agregar un modelo sin datos de crédito.
5. Agrega `model.<id>` y `model.<id>.measurement` a **ambos** diccionarios, y corre `pnpm verify:i18n`.

Lo que `prepare:model` te resuelve:

- **`KHR_materials_pbrSpecularGlossiness` en `extensionsRequired`.** Sketchfab todavía la exporta; three.js la eliminó, y `GLTFLoader` *rechaza* un asset cuya extensión requerida no puede satisfacer — el modelo no cargaría en absoluto, no es que se viera gris. `metalRough()` reescribe los materiales y limpia la bandera.
- **El desajuste de versiones entre pnpm y sharp.** El CLI de `gltf-transform` resuelve su propio sharp empaquetado, que bajo pnpm puede emparejar el JS de una versión con el binario de libvips de otra (`colourspace: parameter space not set`). El script pasa una instancia de `sharp` fijada explícitamente.

El paquete del CLI **no es una dependencia**. Era lo único que traía una segunda versión de sharp al store, y una segunda versión significa un segundo script de instalación sin aprobar — que pnpm 11 trata como error duro y que además tumba `pnpm dev`, porque el chequeo previo de dependencias ejecuta `pnpm install`. Nadie importa el CLI, así que se fue.

Resultados hasta ahora: antebrazo 10,84 MB → 1,13 MB, brazo completo 4,2 MB → 0,47 MB (WebP q88).

### Política de licencias para assets

Solo **CC0** o **CC-BY**. `CC-BY-SA` está rechazada (ShareAlike es viral y contaminaría un producto comercial); `CC-BY-NC` está rechazada (bloquea la monetización). CC-BY obliga a una pantalla de créditos visible — [ModelCredits.tsx](src/features/body-model/components/ModelCredits.tsx) es esa obligación, no un detalle. Quitarla pone al producto en incumplimiento.

El diálogo de créditos traduce solo sus palabras de enlace. Los títulos, nombres de autor y nombres de licencia quedan exactamente como sus autores los publicaron, en todos los idiomas — son los identificadores que la licencia exige reproducir.

---

## Compartir una sesión

Las sesiones se guardan en un **archivo**, no en un link. Eso es una restricción, no un atajo.

TattooView no tiene backend, y el peso de una sesión es la obra — un diseño de 2048px son megas ya codificado, órdenes de magnitud más de lo que cualquier URL puede cargar. Un link de compartir de verdad significa hospedar la obra de otras personas en algún lado: una cuenta, una factura de almacenamiento y una decisión de privacidad.

El archivo viaja por WhatsApp, mail o Drive, que es como ya ocurren estas conversaciones. También mantiene la promesa de que un diseño nunca sale de la máquina si su dueño no lo manda. Ver [sessionFile.ts](src/features/tattoo-editor/lib/sessionFile.ts).

---

## Limitaciones conocidas

- **El blend multiplicativo no puede aclarar.** La tinta blanca y las muy pálidas son invisibles sobre la piel. Físicamente honesto, igual sorprende.
- **El estiramiento de téxeles en ángulos rasantes** es inherente a la proyección de caja. El desvanecido lo disimula; no lo elimina. Una malla con más polígonos no ayudaría.
- **Los dos modelos incluidos son de muy pocos polígonos** (3.533 y 2.135 triángulos). Espera facetado, y un tatuaje muy pequeño puede intersectar apenas un par de triángulos.
- **Cambiar de zona del cuerpo borra todos los diseños** — las coordenadas de colocación solo significan algo sobre el miembro contra el que se registraron. Deshacer los recupera.
- **Los tonos de piel son multiplicadores estimados a ojo**, no valores medidos.

---

## Hoja de ruta

- Simulación de envejecimiento — cómo se lee el tatuaje a 2, 5 y 10 años.
- Hoja de contactos: los cuatro ángulos capturados compuestos en una sola imagen.
- Build móvil con Capacitor.
- Más zonas del cuerpo.

---

## Créditos

Modelos 3D usados bajo [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/):

- ["arm"](https://sketchfab.com/3d-models/arm-696f4493d39a44d7b5cf4c85b4239ae8) de [DJMaesen](https://sketchfab.com/bumstrum) — CC-BY-4.0
- ["Anatomy - male arm"](https://sketchfab.com/3d-models/anatomy-male-arm-af9a4101fa2c483cab363cf0a629762f) de [3dmaven](https://sketchfab.com/3Dmaven) — CC-BY-4.0

Los mismos créditos se muestran dentro de la app en **Créditos de los modelos**.
