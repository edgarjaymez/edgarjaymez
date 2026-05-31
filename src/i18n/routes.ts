export const routes = {
  en: {
    home: {
      label: "Home",
      slug: "/",
    },
    contact: {
      label: "Contact",
      slug: "/contact",
    },
  },
  es: {
    home: {
      label: "Inicio",
      slug: "/",
    },
    contact: {
      label: "Contacto",
      slug: "/contacto",
    },
  },
} as const;

export function getTranslatedSlug(
  slug: string,
  sourceLang: keyof typeof routes,
  targetLang: keyof typeof routes,
): string | undefined {
  const sourceRoutes = routes[sourceLang] as Record<string, { slug: string }>;
  const routeKey = Object.keys(sourceRoutes).find((key) => sourceRoutes[key].slug === slug);
  if (!routeKey) return undefined;
  const targetRoutes = routes[targetLang] as Record<string, { slug: string }>;
  return targetRoutes[routeKey]?.slug;
}
