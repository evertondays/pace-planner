/**
 * Supported languages. Portuguese is the source language compiled into the app;
 * the others are loaded at startup from `locale/messages.<code>.json`.
 * Plain TypeScript: main.ts uses it before Angular starts.
 */

export type AppLocaleCode = 'pt' | 'en' | 'es';

export interface AppLocale {
  code: AppLocaleCode;
  label: string;
  name: string;
  /** For the `lang` attribute and number formatting (decimal comma or point). */
  bcp47: string;
}

export const APP_LOCALES: AppLocale[] = [
  { code: 'pt', label: 'PT', name: 'Português', bcp47: 'pt-BR' },
  { code: 'en', label: 'EN', name: 'English', bcp47: 'en-US' },
  { code: 'es', label: 'ES', name: 'Español', bcp47: 'es-ES' },
];

export const SOURCE_LOCALE: AppLocaleCode = 'pt';
export const LOCALE_STORAGE_KEY = 'pace-planner:locale';

export function findLocale(code: string): AppLocale {
  const short = code.slice(0, 2).toLowerCase();
  return APP_LOCALES.find((l) => l.code === short) ?? APP_LOCALES[0];
}

function isLocaleCode(code: string): code is AppLocaleCode {
  return APP_LOCALES.some((l) => l.code === code);
}

/**
 * Language for this visit: a language in the path (links to the old /en/ and /es/
 * builds), then the saved choice, then the browser languages, then English.
 */
export function pickLocale(
  pathname: string,
  saved: string | null,
  browserLanguages: readonly string[],
): { code: AppLocaleCode; fromPath: boolean } {
  const pathCode = pathname.match(/\/(pt|en|es)\/?$/)?.[1];
  if (pathCode && isLocaleCode(pathCode)) return { code: pathCode, fromPath: true };
  if (saved && isLocaleCode(saved)) return { code: saved, fromPath: false };

  for (const language of browserLanguages) {
    const code = language.slice(0, 2).toLowerCase();
    if (isLocaleCode(code)) return { code, fromPath: false };
  }
  return { code: 'en', fromPath: false };
}
