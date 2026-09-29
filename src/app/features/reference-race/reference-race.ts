import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { predictFlatTimeS } from '../../core/model/estimator';
import { UNIT_LENGTH_M } from '../../core/model/units';
import {
  formatDecimal,
  formatDuration,
  formatNumber,
  formatPace,
  parseDecimal,
  parseDuration,
} from '../../shared/formatters';
import { Icon } from '../../shared/icon';
import { PreferencesService } from '../../shared/preferences.service';
import { RACE_DISTANCES } from '../../shared/race-distances';
import { PlannerStore } from '../../state/planner.store';

type DistanceChoice = number | 'custom';

/** Longest custom reference accepted, in meters (an ultra, far outside the fit anyway). */
const MAX_CUSTOM_DISTANCE_M = 400_000;

@Component({
  selector: 'app-reference-race',
  imports: [Icon],
  templateUrl: './reference-race.html',
  styleUrl: './reference-race.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceRaceForm {
  protected readonly store = inject(PlannerStore);
  protected readonly preferences = inject(PreferencesService);
  protected readonly presets = RACE_DISTANCES;

  private readonly initial = this.store.referenceRace();
  protected readonly choice = signal<DistanceChoice>(
    RACE_DISTANCES.find((p) => p.distanceM === this.initial.distanceM)?.distanceM ?? 'custom',
  );
  /** Custom distance text in the user's unit; rewritten only when the unit changes. */
  protected readonly customText = linkedSignal({
    source: this.preferences.unit,
    computation: (unit) =>
      formatDecimal(untracked(this.store.referenceRace).distanceM / UNIT_LENGTH_M[unit]),
  });
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
    const unit = this.preferences.unit();
    if (this.store.vdot() === null) return [];
    return RACE_DISTANCES.map(({ distanceM, label }) => {
      const timeS = predictFlatTimeS(reference, distanceM);
      return {
        label,
        time: formatDuration(timeS),
        pace: formatPace(timeS / (distanceM / 1000), unit),
        isReference: Math.abs(distanceM - reference.distanceM) < 1,
      };
    });
  });

  protected choose(choice: DistanceChoice): void {
    this.choice.set(choice);
    if (choice === 'custom') {
      this.applyCustomDistance(this.customText(), false);
    } else {
      this.store.referenceRace.update((r) => ({ ...r, distanceM: choice }));
    }
  }

  protected applyCustomDistance(text: string, showError: boolean): void {
    this.customText.set(text);
    const value = parseDecimal(text);
    const distanceM = value === null ? 0 : value * UNIT_LENGTH_M[this.preferences.unit()];
    const valid = distanceM > 0 && distanceM <= MAX_CUSTOM_DISTANCE_M;
    if (valid) this.store.referenceRace.update((r) => ({ ...r, distanceM }));
    this.customInvalid.set(!valid && (showError || this.customInvalid()));
  }

  protected applyTime(text: string, showError: boolean): void {
    this.timeText.set(text);
    const timeS = parseDuration(text);
    if (timeS !== null) this.store.referenceRace.update((r) => ({ ...r, timeS }));
    this.timeInvalid.set(timeS === null && (showError || this.timeInvalid()));
  }
}
