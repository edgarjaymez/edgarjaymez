export const languages = [
  {code:"en", label: 'English'},
  {code: "es", label: 'Español'},
] as const;

export const defaultLang = 'en';
export const showDefaultLang = false;

export const ui = {
  en: {
    'hero.blogCTA': 'Visit my blog in your language',
  },
  es: {
    'hero.blogCTA': 'Visita mi blog en tu idioma',
  },
} as const;

export const routes = {
  en: {
    'blog': 'blog',
    "contact": "contact"
  },
  es: {
    'blog': 'blog',
    "contact": "contacto"
  },
};
