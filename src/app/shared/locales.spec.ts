import { findLocale, pickLocale } from './locales';

describe('locales', () => {
  it('prefers a language in the path, then the saved one, then the browser', () => {
    expect(pickLocale('/pace-planner/en/', 'es', ['pt-BR'])).toEqual({
      code: 'en',
      fromPath: true,
    });
    expect(pickLocale('/pace-planner/', 'es', ['pt-BR']).code).toBe('es');
    expect(pickLocale('/pace-planner/', null, ['fr-FR', 'es-MX']).code).toBe('es');
  });

  it('falls back to English for other browser languages', () => {
    expect(pickLocale('/', null, ['fr-FR', 'de'])).toEqual({ code: 'en', fromPath: false });
  });

  it('ignores unknown saved values', () => {
    expect(pickLocale('/', 'xx', ['pt-BR']).code).toBe('pt');
  });

  it('finds a locale by code or tag, defaulting to Portuguese', () => {
    expect(findLocale('en-US').code).toBe('en');
    expect(findLocale('es').bcp47).toBe('es-ES');
    expect(findLocale('fr').code).toBe('pt');
  });
});
