import { ui, defaultLang, showDefaultLang, routes } from './ui';
import { getKeyByValue } from '../utils';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    // TODO: Refactor to remove assertion
    return (ui[lang] as Record<string, string>)[key] || ui[defaultLang][key];
  }
}

export function useTranslatedPath(lang: keyof typeof ui) {
  return function translatePath(path: string, l: keyof typeof routes = lang) {
    const pathName = path.replaceAll('/', '')
    // TODO: Refactor to remove assertion
    const hasTranslation = defaultLang !== l && routes[l] !== undefined && routes[l][pathName as keyof typeof routes[typeof lang]] !== undefined
    const translatedPath = hasTranslation ? '/' + routes[l][pathName as keyof typeof routes[typeof lang]] : path

    return !showDefaultLang && l === defaultLang ? translatedPath : `/${l}${translatedPath}`
  }
}

export function getRouteFromUrl(url: URL): string | undefined {
  const parts = url.pathname.split('/');
  const path = parts.pop() || parts.pop();

  if (!path) {
    return undefined;
  }

  const currentLang = getLangFromUrl(url);
  const currentRoutes = routes[currentLang as keyof typeof routes];

  if (!currentRoutes) {
    return undefined;
  }

  // TODO: Refactor to remove assertion
  return getKeyByValue(currentRoutes as Record<string, string>, path);
}

