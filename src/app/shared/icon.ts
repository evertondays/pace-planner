import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  'upload' | 'sun' | 'moon' | 'alert' | 'info' | 'refresh' | 'chevron-down' | 'x';

/** Outline icons on a 24px grid, in the spirit of Lucide (straight terminals). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display: inline-flex' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="butt"
      stroke-linejoin="miter"
    >
      @switch (name()) {
        @case ('upload') {
          <path d="M21 15v6H3v-6" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          />
        }
        @case ('moon') {
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        }
        @case ('alert') {
          <path d="M12 3L2 21h20L12 3z" />
          <path d="M12 10v5M12 17v2" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 11v6M12 7v2" />
        }
        @case ('refresh') {
          <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
          <path d="M21 3v5h-5" />
        }
        @case ('chevron-down') {
          <path d="M6 9l6 6 6-6" />
        }
        @case ('x') {
          <path d="M18 6L6 18M6 6l12 12" />
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(24);
  protected readonly strokeWidth = computed(() => (this.size() < 20 ? 2 : 1.5));
}
