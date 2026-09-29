import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Icon } from '../../shared/icon';
import { APP_LOCALES, AppLocaleCode } from '../../shared/locales';
import { PreferencesService } from '../../shared/preferences.service';

/**
 * Language picker: a menu button with one radio item per language
 * (WAI-ARIA menu button pattern, with arrow keys, Home/End, Escape and Tab).
 */
@Component({
  selector: 'app-language-menu',
  imports: [Icon],
  templateUrl: './language-menu.html',
  styleUrl: './language-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class LanguageMenu {
  protected readonly preferences = inject(PreferencesService);
  protected readonly locales = APP_LOCALES;
  protected readonly open = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly items = viewChildren<ElementRef<HTMLButtonElement>>('item');

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openAt(this.currentIndex());
  }

  protected select(code: AppLocaleCode): void {
    this.close();
    this.preferences.switchLocale(code);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openAt(event.key === 'ArrowDown' ? this.currentIndex() : this.locales.length - 1);
    }
  }

  protected onMenuKeydown(event: KeyboardEvent, index: number): void {
    const last = this.locales.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      this.focusItem(moves[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.trigger().nativeElement.focus();
    } else if (event.key === 'Tab') {
      this.close();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private openAt(index: number): void {
    this.open.set(true);
    // Wait for the menu to render before moving focus into it.
    queueMicrotask(() => requestAnimationFrame(() => this.focusItem(index)));
  }

  private close(): void {
    this.open.set(false);
  }

  private focusItem(index: number): void {
    this.items()[index]?.nativeElement.focus();
  }

  private currentIndex(): number {
    return Math.max(
      0,
      this.locales.findIndex((l) => l.code === this.preferences.locale.code),
    );
  }
}
