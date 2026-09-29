import { LOCALE_ID } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

/** Starts the app once main.ts has loaded the translations for `localeId`. */
export function bootstrap(localeId: string) {
  return bootstrapApplication(App, {
    ...appConfig,
    providers: [...appConfig.providers, { provide: LOCALE_ID, useValue: localeId }],
  });
}
