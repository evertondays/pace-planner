import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  formatDistanceKm,
  formatDuration,
  formatGrade,
  formatNumber,
  formatPace,
  formatSignedDuration,
} from '../../shared/formatters';
import { PlannerStore } from '../../state/planner.store';

/** Below this, a km is neither uphill nor downhill and keeps the neutral ink. */
const MIN_TONED_GRADE = 0.005;

interface SplitRow {
  km: number;
  partialDistance: string | null;
  pace: string;
  arrow: string;
  deltaVsFlat: string;
  elapsed: string;
  gain: string;
  loss: string;
  grade: string;
  gradeTone: 'tone-positive' | 'tone-negative' | null;
}

@Component({
  selector: 'app-splits-table',
  templateUrl: './splits-table.html',
  styleUrl: './splits-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitsTable {
  protected readonly store = inject(PlannerStore);

  protected readonly rows = computed<SplitRow[]>(() => {
    const estimate = this.store.estimate();
    if (!estimate) return [];

    let elapsedS = 0;
    return estimate.splits.map((split) => {
      elapsedS += split.timeS;
      const deltaS = split.paceSPerKm - estimate.equivalentPaceSPerKm;
      return {
        km: split.km,
        partialDistance: split.distanceM < 999 ? formatDistanceKm(split.distanceM, 2) : null,
        pace: formatPace(split.paceSPerKm),
        arrow: deltaS >= 0.5 ? '▲' : deltaS <= -0.5 ? '▼' : '',
        deltaVsFlat: formatSignedDuration(deltaS),
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

  protected onKeydown(event: KeyboardEvent, km: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.store.toggleKm(km);
    }
  }
}
