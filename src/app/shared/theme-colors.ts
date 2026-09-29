/** Resolved values of the color tokens, for canvas libraries that cannot read CSS variables. */
export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceStrong: string;
  line: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  inverse: string;
  onInverse: string;
}

export function readThemeColors(element: Element = document.documentElement): ThemeColors {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(`--${name}`).trim();
  return {
    bg: token('bg'),
    surface: token('surface'),
    surfaceStrong: token('surface-strong'),
    line: token('line'),
    ink: token('ink'),
    inkMuted: token('ink-muted'),
    inkSubtle: token('ink-subtle'),
    inverse: token('inverse'),
    onInverse: token('on-inverse'),
  };
}
