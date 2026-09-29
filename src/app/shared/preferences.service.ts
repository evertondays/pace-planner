import { DOCUMENT } from '@angular/common';
import { inject, Injectable, LOCALE_ID, signal } from '@angular/core';
import { DistanceUnit } from '../core/model/units';
import { AppLocaleCode, findLocale, LOCALE_STORAGE_KEY } from './locales';

const UNIT_KEY = 'pace-planner:unit';

/**
 * User preferences shown in the top bar. Translations are loaded once at startup
 * (see main.ts), so switching language saves the choice and reloads the page;
 * the planner state survives in localStorage.
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
    write(LOCALE_STORAGE_KEY, code);
    this.document.location.reload();
  }
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
