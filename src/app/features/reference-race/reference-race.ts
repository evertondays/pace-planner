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
import { VDOT_RANGE } from '../../core/model/vdot';
import {
  formatDecimal,
  formatDuration,
  formatNumber,
  formatPace,
  formatTimeDigits,
  parseDecimal,
  parseDuration,
  timeDigits,
} from '../../shared/formatters';
import { Icon } from '../../shared/icon';
import { PreferencesService } from '../../shared/preferences.service';
import { RACE_DISTANCES } from '../../shared/race-distances';
import { PlannerStore } from '../../state/planner.store';

type DistanceChoice = number | 'custom' | null;

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
  protected readonly vdotRange = VDOT_RANGE;

  private readonly initial = this.store.referenceInput();
  protected readonly choice = signal<DistanceChoice>(initialChoice(this.initial.distanceM));
  /** Custom distance text in the user's unit; rewritten only when the unit changes. */
  protected readonly customText = linkedSignal({
    source: this.preferences.unit,
    computation: (unit) => {
      const distanceM = untracked(this.store.referenceInput).distanceM;
      return distanceM === null ? '' : formatDecimal(distanceM / UNIT_LENGTH_M[unit]);
    },
  });
  protected readonly customInvalid = signal(false);

  /** Digits typed in the time field; the field shows them through the stopwatch mask. */
  private readonly digits = signal(
    this.initial.timeS === null ? '' : timeDigits(formatDuration(this.initial.timeS)),
  );
  protected readonly timeText = computed(() => formatTimeDigits(this.digits()));
  protected readonly timeInvalid = signal(false);

  protected readonly vdot = computed(() => {
    const vdot = this.store.vdot();
    return vdot === null ? null : formatNumber(vdot, 1);
  });

  /** Flat-course times for the same VDOT at the common race distances. */
  protected readonly predictions = computed(() => {
    const reference = this.store.validReference();
    const unit = this.preferences.unit();
    if (!reference) return [];
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
      this.store.referenceInput.update((r) => ({ ...r, distanceM: choice }));
    }
  }

  protected applyCustomDistance(text: string, showError: boolean): void {
    this.customText.set(text);
    const value = parseDecimal(text);
    const distanceM = value === null ? 0 : value * UNIT_LENGTH_M[this.preferences.unit()];
    const valid = distanceM > 0 && distanceM <= MAX_CUSTOM_DISTANCE_M;
    this.store.referenceInput.update((r) => ({ ...r, distanceM: valid ? distanceM : null }));
    this.customInvalid.set(!valid && text.trim() !== '' && (showError || this.customInvalid()));
  }

  protected onTimeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = timeDigits(input.value);
    // Backspace right after a colon only removes the colon: drop the digit before it instead.
    if ((event as InputEvent).inputType === 'deleteContentBackward' && digits === this.digits()) {
      digits = digits.slice(0, -1);
    }
    this.digits.set(digits);
    // Write back even when the digits did not change, so stray characters disappear.
    input.value = this.timeText();

    const timeS = parseDuration(this.timeText());
    this.store.referenceInput.update((r) => ({ ...r, timeS }));
    if (timeS !== null) this.timeInvalid.set(false);
  }

  protected onTimeBlur(): void {
    this.timeInvalid.set(this.digits() !== '' && parseDuration(this.timeText()) === null);
  }
}

function initialChoice(distanceM: number | null): DistanceChoice {
  if (distanceM === null) return null;
  return RACE_DISTANCES.find((p) => p.distanceM === distanceM)?.distanceM ?? 'custom';
}
