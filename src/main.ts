/// <reference types="@angular/localize" />

import { loadTranslations } from '@angular/localize';
import {
  AppLocaleCode,
  findLocale,
  LOCALE_STORAGE_KEY,
  pickLocale,
  SOURCE_LOCALE,
} from './app/shared/locales';

/**
 * Runtime i18n: pick the language, load its translations, then import and start
 * the app. The app is imported only afterwards so that `$localize` strings
 * evaluated at module load are translated too.
 */
async function start(): Promise<void> {
  const { code, fromPath } = pickLocale(
    location.pathname,
    readSavedLocale(),
    navigator.languages ?? [navigator.language],
  );
  if (fromPath) {
    // Old links to /en/ or /es/: keep the language, show the app at the site root.
    saveLocale(code);
    history.replaceState(null, '', document.baseURI);
  }

  const locale = await loadLocale(code);
  $localize.locale = locale;
  document.documentElement.lang = findLocale(locale).bcp47;

  const { bootstrap } = await import('./bootstrap');
  await bootstrap(locale);
}

/** Loads the translations of `code`; falls back to the source language if they fail. */
async function loadLocale(code: AppLocaleCode): Promise<AppLocaleCode> {
  if (code === SOURCE_LOCALE) return code;
  try {
    const response = await fetch(`locale/messages.${code}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { translations } = (await response.json()) as { translations: Record<string, string> };
    loadTranslations(translations);
    return code;
  } catch (error) {
    console.error(`Could not load the ${code} translations`, error);
    return SOURCE_LOCALE;
  }
}

function readSavedLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLocale(code: AppLocaleCode): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // The language still applies for this visit.
  }
}

start().catch((error) => console.error(error));
