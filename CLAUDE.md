# Pace Planner

Estimates finish time and target pace per km for a road race with elevation, from a flat
reference race (Daniels VDOT + Minetti grade cost). Angular SPA, no backend, deployed to
GitHub Pages.

- `doc.md`: project spec (model, algorithm, data pipeline, architecture, roadmap). Source of truth.
- `design-system.md`: design directives and tokens. Every UI change must follow it.

## Environment

The project lives in WSL (Ubuntu 20.04). Run commands inside WSL with nvm loaded:

```bash
wsl --cd ~/projects/pace-planner -e bash -c 'export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh; npx ng test --watch=false'
```

Node 24 (Angular 22 requires >= 22.22.3), tests with Vitest via `ng test`.

## Conventions

- Code, identifiers, file names (kebab-case), comments, commits and branches in English.
- User-facing text in Portuguese (pt-BR), marked for i18n (`i18n` attributes in templates,
  `$localize` in TypeScript). English and Spanish are separate builds (Angular i18n): pt at the
  site root, `en/` and `es/` as sub paths. After adding or changing any marked text, run
  `npx ng extract-i18n` (writes `src/locale/messages.json`) and add the new ids to
  `src/locale/messages.en.json` and `messages.es.json`; the production build fails on a missing
  translation. Preview a language with `npx ng serve --configuration=en` (or `es`).
- Distance unit (km or mi) is a user preference (`PreferencesService.unit`). The model stays in
  meters and seconds per km; splits use `store.splitLengthM()` and formatters take the unit.
- Units in names: `distanceM`, `timeS`, `paceSPerKm`, `speedMPerMin`. Meters, seconds and grade
  fractions everywhere; convert only in `shared/formatters.ts`.
- Use the domain glossary in `doc.md` (route, referenceRace, grade, segment, kmSplit...).
- `src/app/core/` is plain TypeScript with no Angular imports, except `core/elevation/`
  (HTTP client). Keep it pure and unit-tested.
- UI: tokens from `design-system.md`, lines instead of shadows, square corners, numbers in
  `--font-mono`. The only hues are `--positive`/`--negative` (classes `.tone-positive` and
  `.tone-negative`), for data meaning only: downhill/faster = positive, uphill/slower = negative,
  always paired with a sign or arrow. UI states (errors, validation) stay neutral.
