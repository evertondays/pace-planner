import { DOCUMENT } from '@angular/common';
import { inject, Injectable, LOCALE_ID, signal } from '@angular/core';
import { DistanceUnit } from '../core/model/units';

export type AppLocaleCode = 'pt' | 'en' | 'es';

export interface AppLocale {
  code: AppLocaleCode;
  label: string;
  name: string;
  /** Number formatting locale (decimal comma or point). */
  numberLocale: string;
  /** Path of this build under the site root; must match angular.json i18n subPath. */
  subPath: string;
}

export const APP_LOCALES: AppLocale[] = [
  { code: 'pt', label: 'PT', name: 'Português', numberLocale: 'pt-BR', subPath: '' },
  { code: 'en', label: 'EN', name: 'English', numberLocale: 'en-US', subPath: 'en/' },
  { code: 'es', label: 'ES', name: 'Español', numberLocale: 'es-ES', subPath: 'es/' },
];

// Also read by the inline script in index.html, keep the keys in sync.
const LOCALE_KEY = 'pace-planner:locale';
const UNIT_KEY = 'pace-planner:unit';

/**
 * User preferences shown in the top bar. Each language is a separate build
 * (Angular i18n), so switching language navigates to that build; the planner
 * state survives in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly document = inject(DOCUMENT);

  readonly locale = findLocale(inject(LOCALE_ID));
  readonly unit = signal<DistanceUnit>(readUnit());

  setUnit(unit: DistanceUnit): void {
    this.unit.set(unit);
    write(UNIT_KEY, unit);
  }

  switchLocale(code: AppLocaleCode): void {
    if (code === this.locale.code) return;
    const target = APP_LOCALES.find((l) => l.code === code)!;
    write(LOCALE_KEY, code);

    const location = this.document.location;
    const base = new URL(this.document.baseURI);
    const rootPath = base.pathname.slice(0, base.pathname.length - this.locale.subPath.length);
    location.assign(`${rootPath}${target.subPath}${location.search}${location.hash}`);
  }
}

export function findLocale(localeId: string): AppLocale {
  const code = localeId.slice(0, 2).toLowerCase();
  return APP_LOCALES.find((l) => l.code === code) ?? APP_LOCALES[0];
}

function readUnit(): DistanceUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'mi' ? 'mi' : 'km';
  } catch {
    return 'km';
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The preference still applies for this visit.
  }
}
