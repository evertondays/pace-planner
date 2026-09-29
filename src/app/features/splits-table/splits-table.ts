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
