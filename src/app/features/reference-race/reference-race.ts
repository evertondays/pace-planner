import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { predictFlatTimeS } from '../../core/model/estimator';
import {
  formatDecimal,
  formatDuration,
  formatNumber,
  formatPace,
  parseDecimal,
  parseDuration,
} from '../../shared/formatters';
import { Icon } from '../../shared/icon';
import { RACE_DISTANCES } from '../../shared/race-distances';
import { PlannerStore } from '../../state/planner.store';

type DistanceChoice = number | 'custom';

@Component({
  selector: 'app-reference-race',
  imports: [Icon],
  templateUrl: './reference-race.html',
  styleUrl: './reference-race.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceRaceForm {
  protected readonly store = inject(PlannerStore);
  protected readonly presets = RACE_DISTANCES;

  private readonly initial = this.store.referenceRace();
  protected readonly choice = signal<DistanceChoice>(
    RACE_DISTANCES.find((p) => p.distanceM === this.initial.distanceM)?.distanceM ?? 'custom',
  );
  protected readonly customKm = signal(formatDecimal(this.initial.distanceM / 1000));
  protected readonly customInvalid = signal(false);
  protected readonly timeText = signal(formatDuration(this.initial.timeS));
  protected readonly timeInvalid = signal(false);

  protected readonly vdot = computed(() => {
    const vdot = this.store.vdot();
    return vdot === null ? null : formatNumber(vdot, 1);
  });

  /** Flat-course times for the same VDOT at the common race distances. */
  protected readonly predictions = computed(() => {
    const reference = this.store.referenceRace();
    if (this.store.vdot() === null) return [];
    return RACE_DISTANCES.map(({ distanceM, label }) => {
      const timeS = predictFlatTimeS(reference, distanceM);
      return {
        label,
        time: formatDuration(timeS),
        pace: formatPace(timeS / (distanceM / 1000)),
        isReference: Math.abs(distanceM - reference.distanceM) < 1,
      };
    });
  });

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
