import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  formatDistance,
  formatDuration,
  formatGrade,
  formatNumber,
  formatPace,
  formatSignedPace,
} from '../../shared/formatters';
import { Icon, IconName, trendIcon } from '../../shared/icon';
import { PreferencesService } from '../../shared/preferences.service';
import { PlannerStore } from '../../state/planner.store';

/** Below this, a split is neither uphill nor downhill and keeps the neutral ink. */
const MIN_TONED_GRADE = 0.005;

interface SplitRow {
  index: number;
  partialDistance: string | null;
  pace: string;
  trend: IconName | null;
  deltaVsFlat: string;
  elapsed: string;
  gain: string;
  loss: string;
  grade: string;
  gradeTone: 'tone-positive' | 'tone-negative' | null;
}

@Component({
  selector: 'app-splits-table',
  imports: [Icon],
  templateUrl: './splits-table.html',
  styleUrl: './splits-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitsTable {
  protected readonly store = inject(PlannerStore);
  protected readonly preferences = inject(PreferencesService);

  protected readonly rows = computed<SplitRow[]>(() => {
    const estimate = this.store.estimate();
    const unit = this.preferences.unit();
    const splitLengthM = this.store.splitLengthM();
    if (!estimate) return [];

    let elapsedS = 0;
    return estimate.splits.map((split) => {
      elapsedS += split.timeS;
      const deltaSPerKm = split.paceSPerKm - estimate.equivalentPaceSPerKm;
      return {
        index: split.index,
        partialDistance:
          split.distanceM < splitLengthM - 1 ? formatDistance(split.distanceM, unit, 2) : null,
        pace: formatPace(split.paceSPerKm, unit),
        trend: trendIcon(deltaSPerKm),
        deltaVsFlat: formatSignedPace(deltaSPerKm, unit),
        elapsed: formatDuration(elapsedS),
        gain: formatNumber(split.gainM),
        loss: formatNumber(split.lossM),
        grade: formatGrade(split.averageGrade),
        // Uphill weighs on the runner (negative), downhill helps (positive).
        gradeTone:
          split.averageGrade >= MIN_TONED_GRADE
            ? 'tone-negative'
            : split.averageGrade <= -MIN_TONED_GRADE
              ? 'tone-positive'
              : null,
      };
    });
  });

  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.store.toggleSplit(index);
    }
  }
}
