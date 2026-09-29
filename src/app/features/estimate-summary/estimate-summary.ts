import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  formatDuration,
  formatNumber,
  formatPace,
  formatSignedDuration,
} from '../../shared/formatters';
import { PlannerStore } from '../../state/planner.store';

@Component({
  selector: 'app-estimate-summary',
  templateUrl: './estimate-summary.html',
  styleUrl: './estimate-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimateSummary {
  private readonly store = inject(PlannerStore);

  protected readonly view = computed(() => {
    const estimate = this.store.estimate();
    const summary = this.store.profile()?.summary;
    const flatTimeS = this.store.flatTimeS();
    if (!estimate || !summary || flatTimeS === null) return null;

    const deltaS = estimate.totalTimeS - flatTimeS;
    return {
      totalTime: formatDuration(estimate.totalTimeS),
      flatTime: formatDuration(flatTimeS),
      deltaVsFlat: formatSignedDuration(deltaS),
      arrow: deltaS >= 0.5 ? '▲' : deltaS <= -0.5 ? '▼' : '',
      averagePace: formatPace(estimate.averagePaceSPerKm),
      equivalentPace: formatPace(estimate.equivalentPaceSPerKm),
      vdot: formatNumber(estimate.vdot, 1),
      gain: formatNumber(summary.gainM),
      loss: formatNumber(summary.lossM),
    };
  });
}
