/**
 * Every user-facing string in the app.
 *
 * SPANISH IS THE SOURCE OF TRUTH. `es` is written first and freely; `TranslationKey`
 * is derived from it, and `en` is typed as `Record<TranslationKey, string>` — so
 * adding a Spanish key without its English counterpart is a compile error, not a
 * blank label discovered by a user. Translations cannot silently rot.
 *
 * Interpolation is deliberately primitive: `{name}` placeholders replaced by
 * `translate()`. A single-screen editor does not need plural rules or an ICU parser,
 * and pulling in an i18n runtime for eleven components would cost more than it
 * returns.
 */
export const LANGUAGES = ['es', 'en'] as const

export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<Language, string> = {
  es: 'Español',
  en: 'English',
}

const es = {
  // Shell
  'app.subtitle': 'Vista previa de tatuajes en 3D',
  'viewport.hint':
    'Doble clic en un tatuaje para moverlo · arrastra la piel para girar · rueda para acercar',
  'canvas.loading': 'Cargando modelo…',
  'common.close': 'Cerrar',
  'language.label': 'Idioma',

  // Body model
  'panel.bodyPart': 'Zona del cuerpo',
  'model.forearm': 'Antebrazo',
  'model.forearm.measurement': 'Del codo a la punta de los dedos',
  'model.fullarm': 'Brazo completo',
  'model.fullarm.measurement': 'Del hombro a la punta de los dedos',

  // Skin tone
  'panel.skinTone': 'Tono de piel',
  'skin.porcelain': 'Porcelana',
  'skin.fair': 'Clara',
  'skin.natural': 'Natural',
  'skin.olive': 'Oliva',
  'skin.tan': 'Morena',
  'skin.brown': 'Marrón',
  'skin.deep': 'Oscura',

  // Designs
  'panel.upload': 'Subir diseño',
  'panel.placeHint': 'Haz clic en el modelo para colocarlo',
  'panel.designs': 'Diseños',
  'panel.noDesigns': 'Todavía no hay diseños.',
  'panel.reposition': 'Recolocar',
  'panel.remove': 'Eliminar',

  // Adjustments
  'panel.adjust': 'Ajustes',
  'adjust.size': 'Tamaño',
  'adjust.rotation': 'Rotación',
  'adjust.density': 'Densidad de tinta',
  'adjust.depth': 'Profundidad de tinta',
  'adjust.depthHint':
    'Qué tan bajo la epidermis se asienta el pigmento. La tinta más profunda pierde saturación y tira a azul grisáceo, como el trabajo ya cicatrizado.',
  'depth.fresh': 'Reciente',
  'depth.healed': 'Cicatrizado',
  'depth.settled': 'Asentado',
  'adjust.mirror': 'Espejo',
  'adjust.mirrorHint':
    'Voltea el diseño horizontalmente, para pasarlo del brazo izquierdo al derecho sin volver a editar el archivo.',

  // Calibration
  'panel.calibration': 'Calibración',
  'calibration.field': '{measurement} (cm)',
  'calibration.hint':
    'Introduce una medida real para convertir el tamaño del diseño a centímetros.',

  // Capture
  'capture.title': 'Foto',
  'capture.background': 'Fondo',
  'capture.bg.studio': 'Estudio',
  'capture.bg.white': 'Blanco',
  'capture.bg.black': 'Negro',
  'capture.bg.transparent': 'Sin fondo',
  'capture.resolution': 'Resolución',
  'capture.thisView': 'Esta vista',
  'capture.fourAngles': '4 ángulos',
  'capture.fourAnglesHint': 'Frente, ambos lados y espalda, a la distancia actual',
  'capture.needDesign': 'Coloca un diseño para tomar una foto.',

  // Session
  'session.undo': 'Deshacer',
  'session.redo': 'Rehacer',
  'session.undoTitle': 'Deshacer (Ctrl+Z)',
  'session.redoTitle': 'Rehacer (Ctrl+Y)',
  'session.save': 'Guardar sesión',
  'session.open': 'Abrir',

  // Upload dialog
  'preview.title': 'Vista previa del diseño',
  'preview.jpegWarning':
    'El JPEG no tiene transparencia. Sin quitar el fondo, este diseño se colocará como un rectángulo sólido sobre la piel.',
  'preview.removeBackground': 'Quitar fondo',
  'preview.tolerance': 'Tolerancia',
  'preview.toleranceHint':
    'Súbela hasta que el fondo desaparezca. Bájala si el diseño empieza a borrarse.',
  'preview.cancel': 'Cancelar',
  'preview.accept': 'Aceptar',
  'preview.processing': 'Procesando…',

  // Credits
  'credits.button': 'Créditos de los modelos',
  'credits.subtitle':
    'Los modelos 3D de TattooView se usan bajo licencia Creative Commons Attribution.',
  'credits.basedOn': 'Esta obra se basa en',
  'credits.by': 'de',
  'credits.licensedUnder': 'con licencia',

  // Toasts
  'toast.uploadFormat': 'Usa un archivo PNG, WebP o JPEG',
  'toast.clickToPlace': 'Ahora haz clic en el modelo para colocar el diseño',
  'toast.moveHint': 'Mueve el puntero para recolocar · clic para soltar · Esc para cancelar',
  'toast.placed': 'Diseño colocado — doble clic para moverlo',
  'toast.photoSaved': 'Foto guardada',
  'toast.viewsSaved': '{count} vistas guardadas',
  'toast.sessionSaved': 'Sesión guardada — envía ese archivo para compartirla',
  'toast.sessionLoaded': 'Sesión cargada',

  // Errors
  'error.readImage': 'No se pudo leer ese archivo como imagen.',
  'error.processImage': 'No se pudo procesar la imagen.',
  'error.captureFailed': 'No se pudo capturar la vista',
  'error.encodeFrame': 'El navegador no pudo codificar la imagen',
  'error.encodeTexture': 'No se pudo codificar la textura de un diseño',
  'error.sessionSave': 'No se pudo guardar la sesión',
  'error.sessionOpen': 'No se pudo abrir esa sesión',
  'error.notASession': 'Ese archivo no es una sesión de TattooView',
  'error.newerVersion': 'Esta sesión se guardó con una versión más reciente de TattooView',
  'error.incompleteSession': 'Este archivo de sesión está incompleto',
  'error.damagedDesigns': 'Este archivo de sesión tiene diseños dañados',
}

export type TranslationKey = keyof typeof es

/**
 * Typed against the Spanish keys on purpose: leaving one out fails the build.
 */
const en: Record<TranslationKey, string> = {
  'app.subtitle': '3D tattoo preview',
  'viewport.hint': 'Double click a tattoo to move it · drag the skin to orbit · scroll to zoom',
  'canvas.loading': 'Loading model…',
  'common.close': 'Close',
  'language.label': 'Language',

  'panel.bodyPart': 'Body part',
  'model.forearm': 'Forearm',
  'model.forearm.measurement': 'Elbow to fingertips',
  'model.fullarm': 'Full arm',
  'model.fullarm.measurement': 'Shoulder to fingertips',

  'panel.skinTone': 'Skin tone',
  'skin.porcelain': 'Porcelain',
  'skin.fair': 'Fair',
  'skin.natural': 'Natural',
  'skin.olive': 'Olive',
  'skin.tan': 'Tan',
  'skin.brown': 'Brown',
  'skin.deep': 'Deep',

  'panel.upload': 'Upload design',
  'panel.placeHint': 'Click the model to place it',
  'panel.designs': 'Designs',
  'panel.noDesigns': 'No designs yet.',
  'panel.reposition': 'Reposition',
  'panel.remove': 'Remove',

  'panel.adjust': 'Adjust',
  'adjust.size': 'Size',
  'adjust.rotation': 'Rotation',
  'adjust.density': 'Ink density',
  'adjust.depth': 'Ink depth',
  'adjust.depthHint':
    'How far the pigment sits under the epidermis. Deeper ink loses saturation and shifts toward blue-grey, the way healed work does.',
  'depth.fresh': 'Fresh',
  'depth.healed': 'Healed',
  'depth.settled': 'Settled',
  'adjust.mirror': 'Mirror',
  'adjust.mirrorHint':
    'Flips the design horizontally, so it can move from the left arm to the right without re-editing the file.',

  'panel.calibration': 'Calibration',
  'calibration.field': '{measurement} (cm)',
  'calibration.hint': 'Enter a real measurement to convert design size into centimetres.',

  'capture.title': 'Photo',
  'capture.background': 'Background',
  'capture.bg.studio': 'Studio',
  'capture.bg.white': 'White',
  'capture.bg.black': 'Black',
  'capture.bg.transparent': 'None',
  'capture.resolution': 'Resolution',
  'capture.thisView': 'This view',
  'capture.fourAngles': '4 angles',
  'capture.fourAnglesHint': 'Front, both sides and back, at the current distance',
  'capture.needDesign': 'Place a design to take a photo.',

  'session.undo': 'Undo',
  'session.redo': 'Redo',
  'session.undoTitle': 'Undo (Ctrl+Z)',
  'session.redoTitle': 'Redo (Ctrl+Y)',
  'session.save': 'Save session',
  'session.open': 'Open',

  'preview.title': 'Design preview',
  'preview.jpegWarning':
    'JPEG has no transparency. Without removing the background this design will be placed as a solid rectangle on the skin.',
  'preview.removeBackground': 'Remove background',
  'preview.tolerance': 'Tolerance',
  'preview.toleranceHint':
    'Raise it until the background is gone. Lower it if the design starts disappearing.',
  'preview.cancel': 'Cancel',
  'preview.accept': 'Accept',
  'preview.processing': 'Processing…',

  'credits.button': 'Model credits',
  'credits.subtitle':
    'The 3D models in TattooView are used under Creative Commons Attribution.',
  'credits.basedOn': 'This work is based on',
  'credits.by': 'by',
  'credits.licensedUnder': 'licensed under',

  'toast.uploadFormat': 'Use a PNG, WebP or JPEG file',
  'toast.clickToPlace': 'Now click the model to place the design',
  'toast.moveHint': 'Move the pointer to reposition · click to drop · Esc to cancel',
  'toast.placed': 'Design placed — double click it to move it',
  'toast.photoSaved': 'Photo saved',
  'toast.viewsSaved': 'Saved {count} views',
  'toast.sessionSaved': 'Session saved — send that file to share it',
  'toast.sessionLoaded': 'Session loaded',

  'error.readImage': 'That file could not be read as an image.',
  'error.processImage': 'The image could not be processed.',
  'error.captureFailed': 'Could not capture the view',
  'error.encodeFrame': 'The browser could not encode the frame',
  'error.encodeTexture': 'Could not encode a design texture',
  'error.sessionSave': 'Could not save the session',
  'error.sessionOpen': 'Could not open that session',
  'error.notASession': 'That file is not a TattooView session',
  'error.newerVersion': 'This session was saved by a newer version of TattooView',
  'error.incompleteSession': 'This session file is incomplete',
  'error.damagedDesigns': 'This session file has damaged designs',
}

export const DICTIONARY: Record<Language, Record<TranslationKey, string>> = { es, en }
