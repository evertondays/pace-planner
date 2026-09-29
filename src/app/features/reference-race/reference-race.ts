import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  formatDecimal,
  formatDuration,
  parseDecimal,
  parseDuration,
} from '../../shared/formatters';
import { Icon } from '../../shared/icon';
import { PlannerStore } from '../../state/planner.store';

type DistanceChoice = number | 'custom';

const PRESETS: { distanceM: number; label: string }[] = [
  { distanceM: 5000, label: '5K' },
  { distanceM: 10_000, label: '10K' },
  { distanceM: 21_097.5, label: '21K' },
  { distanceM: 42_195, label: '42K' },
];

@Component({
  selector: 'app-reference-race',
  imports: [Icon],
  templateUrl: './reference-race.html',
  styleUrl: './reference-race.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceRaceForm {
  protected readonly store = inject(PlannerStore);
  protected readonly presets = PRESETS;

  private readonly initial = this.store.referenceRace();
  protected readonly choice = signal<DistanceChoice>(
    PRESETS.find((p) => p.distanceM === this.initial.distanceM)?.distanceM ?? 'custom',
  );
  protected readonly customKm = signal(formatDecimal(this.initial.distanceM / 1000));
  protected readonly customInvalid = signal(false);
  protected readonly timeText = signal(formatDuration(this.initial.timeS));
  protected readonly timeInvalid = signal(false);

  protected choose(choice: DistanceChoice): void {
    this.choice.set(choice);
    if (choice === 'custom') {
      this.applyCustomDistance(this.customKm(), false);
    } else {
      this.store.referenceRace.update((r) => ({ ...r, distanceM: choice }));
    }
  }

  protected applyCustomDistance(text: string, showError: boolean): void {
    this.customKm.set(text);
    const km = parseDecimal(text);
    const valid = km !== null && km > 0 && km <= 400;
    if (valid) this.store.referenceRace.update((r) => ({ ...r, distanceM: km * 1000 }));
    this.customInvalid.set(!valid && (showError || this.customInvalid()));
  }

  protected applyTime(text: string, showError: boolean): void {
    this.timeText.set(text);
    const timeS = parseDuration(text);
    if (timeS !== null) this.store.referenceRace.update((r) => ({ ...r, timeS }));
    this.timeInvalid.set(timeS === null && (showError || this.timeInvalid()));
  }
}
