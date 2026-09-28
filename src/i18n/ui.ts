/**
 * The UI string table.
 *
 * Scope rule: **control labels and system messages live here; anything a visitor reads as content
 * lives in a collection.** A button label, a form field name, an error — here. A scene's title, a
 * case study's summary, a blog post — content.
 *
 * `es` is checked against `en` with `satisfies`, so a key added to one locale and forgotten in the
 * other fails `pnpm check` rather than silently falling back at runtime.
 */

export const en = {
  "nav.skipToContent": "Skip to content",
  "nav.language": "Language",
  "nav.home": "Home",
  "nav.work": "Work",
  "nav.lab": "Lab",
  "nav.blog": "Blog",
  "nav.resume": "Résumé",
  "nav.contact": "Contact",

  "hero.blogCTA": "Visit my blog in your language",
  "hero.title": "Edgar Jaymez",
  "hero.role": "Design Technologist",
  "hero.description":
    "Building scalable design systems that work in Figma and in production; from token architecture to shipped Web Components.",
  "hero.cta": "Get in touch",

  "contact.title": "Let's talk",
  "contact.name": "Name",
  "contact.email": "Email",
  "contact.message": "Message",
  "contact.submit": "Send message",

  "notFound.title": "This path does not lead anywhere",
  "notFound.description": "The page you were looking for is not here.",
  "notFound.back": "Go back",
  "notFound.home": "Return to the entrance",

  // `{n}` is substituted by t(); see the interpolation note below.
  "list.count": "{n} entries",
  "entry.updated": "Updated {date}",
  "entry.readInOtherLanguage": "This one is only written in {language} so far.",
} as const;

export const es = {
  "nav.skipToContent": "Saltar al contenido",
  "nav.language": "Idioma",
  "nav.home": "Inicio",
  "nav.work": "Trabajo",
  "nav.lab": "Laboratorio",
  "nav.blog": "Blog",
  "nav.resume": "Currículum",
  "nav.contact": "Contacto",

  "hero.blogCTA": "Visita mi blog en tu idioma",
  "hero.title": "Edgar Jaymez",
  "hero.role": "Tecnólogo de Diseño",
  "hero.description":
    "Construyo sistemas de diseño escalables que funcionan en Figma y en producción; desde la arquitectura de tokens hasta Web Components publicados.",
  "hero.cta": "Contáctame",

  "contact.title": "Hablemos",
  "contact.name": "Nombre",
  "contact.email": "Correo electrónico",
  "contact.message": "Mensaje",
  "contact.submit": "Enviar mensaje",

  "notFound.title": "Este camino no lleva a ningún lado",
  "notFound.description": "La página que buscabas no está aquí.",
  "notFound.back": "Volver",
  "notFound.home": "Regresar a la entrada",

  "list.count": "{n} entradas",
  "entry.updated": "Actualizado el {date}",
  "entry.readInOtherLanguage":
    "Esta solo está escrita en {language} por ahora.",
} as const satisfies Record<keyof typeof en, string>;

export type UiKey = keyof typeof en;

export const ui = { en, es } as const;

/** Kept for the language switcher; the labels themselves now live in `localeMeta`. */
export const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const;
