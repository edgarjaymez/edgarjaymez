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

  // The name, role and summary that used to sit here were the same three strings as
  // `profile:` in src/content/site/<locale>.yaml — the same sentence maintained twice. They are
  // content a visitor reads, so by the scope rule above they belong to the collection, and the
  // journey reads them from there. Only the button label is a control.
  "hero.cta": "Get in touch",

  "journey.trail": "The trail",
  "journey.seeAllWork": "See all work",
  "journey.seeAllLab": "See everything on the stove",
  "journey.seeAllPosts": "Read every story",
  "journey.nothingYet": "Nothing here yet.",

  "contact.title": "Let's talk",
  "contact.name": "Name",
  "contact.email": "Email",
  "contact.message": "Message",
  "contact.submit": "Send message",

  "notFound.title": "This path does not lead anywhere",
  "notFound.description": "The page you were looking for is not here.",
  "notFound.back": "Go back",
  "notFound.home": "Return to the entrance",

  // Section headings on the résumé. These name the document's parts rather than being written by
  // Edgar as content, so they are labels — the résumé's own prose lives in the collection.
  "resume.education": "Education",
  "resume.skills": "Skills",
  "resume.languages": "Languages",
  "resume.present": "Present",
  "resume.downloadPdf": "Download as PDF",
  "resume.unavailable": "Not available yet.",

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

  "hero.cta": "Contáctame",

  "journey.trail": "El sendero",
  "journey.seeAllWork": "Ver todo el trabajo",
  "journey.seeAllLab": "Ver todo lo que hay en la lumbre",
  "journey.seeAllPosts": "Leer todas las historias",
  "journey.nothingYet": "Aún no hay nada aquí.",

  "contact.title": "Hablemos",
  "contact.name": "Nombre",
  "contact.email": "Correo electrónico",
  "contact.message": "Mensaje",
  "contact.submit": "Enviar mensaje",

  "notFound.title": "Este camino no lleva a ningún lado",
  "notFound.description": "La página que buscabas no está aquí.",
  "notFound.back": "Volver",
  "notFound.home": "Regresar a la entrada",

  "resume.education": "Educación",
  "resume.skills": "Habilidades",
  "resume.languages": "Idiomas",
  "resume.present": "actualidad",
  "resume.downloadPdf": "Descargar en PDF",
  "resume.unavailable": "Aún no disponible en español.",

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
