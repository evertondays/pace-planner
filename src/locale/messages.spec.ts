import source from './messages.json';
import en from './messages.en.json';
import es from './messages.es.json';

/** Placeholders such as {$INTERPOLATION} or {$START_LINK} must survive translation. */
function placeholders(text: string): string[] {
  return (text.match(/\{\$[A-Za-z0-9_]+\}/g) ?? []).sort();
}

// messages.json is written by `ng extract-i18n`; CI checks that it is up to date.
describe.each([
  ['en', en.translations],
  ['es', es.translations],
])('%s translations', (_code, translations: Record<string, string>) => {
  const sourceMessages: Record<string, string> = source.translations;

  it('cover exactly the source messages', () => {
    expect(Object.keys(translations).sort()).toEqual(Object.keys(sourceMessages).sort());
  });

  it('keep the placeholders of each message', () => {
    for (const [id, text] of Object.entries(sourceMessages)) {
      expect(placeholders(translations[id] ?? ''), id).toEqual(placeholders(text));
    }
  });
});
