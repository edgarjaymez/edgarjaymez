export const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const;

export const defaultLang = "en";
export const showDefaultLang = false;

export const ui = {
  en: {
    "hero.blogCTA": "Visit my blog in your language",
    "hero.title": "Edgar Jaymez",
    "hero.role": "Design Technologist",
    "hero.description":
      "Building scalable design systems that work in Figma and in production; from token architecture to shipped Web Components.",
    "hero.cta": "Get in touch",
    "contact.title": "Let's talk",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.submit": "Send message",
  },
  es: {
    "hero.blogCTA": "Visita mi blog en tu idioma",
    "hero.title": "Edgar Jaymez",
    "hero.role": "Tecnólogo de Diseño",
    "hero.description":
      "Construyo sistemas de diseño escalables que funcionan en Figma y en producción; desde la arquitectura de tokens hasta Web Components publicados.",
    "hero.cta": "Contáctame",
    "contact.title": "Hablemos",
    "contact.name": "Nombre",
    "contact.email": "Correo electrónico",
    "contact.submit": "Enviar mensaje",
  },
} as const;

export const routes = {
  en: {
    blog: "blog",
    contact: "contact",
  },
  es: {
    blog: "blog",
    contact: "contacto",
  },
};
