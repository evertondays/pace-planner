import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'pace-planner:theme';

/**
 * Follows the OS color scheme until the user picks a theme, which is then
 * applied as `data-theme` on <html> and remembered.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemTheme = signal<Theme>(this.media?.matches ? 'dark' : 'light');

  readonly chosenTheme = signal<Theme | null>(readTheme());
  readonly theme = computed(() => this.chosenTheme() ?? this.systemTheme());

  constructor() {
    const onChange = (event: MediaQueryListEvent) =>
      this.systemTheme.set(event.matches ? 'dark' : 'light');
    this.media?.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', onChange));

    effect(() => {
      const chosen = this.chosenTheme();
      const root = this.document.documentElement;
      if (chosen) root.dataset['theme'] = chosen;
      else delete root.dataset['theme'];
    });
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.chosenTheme.set(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Theme still applies for this visit.
    }
  }
}

function readTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}
