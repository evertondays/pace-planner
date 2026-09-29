import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  formatDuration,
  formatNumber,
  formatPace,
  formatSignedDuration,
  paceUnitLabel,
} from '../../shared/formatters';
import { Icon, trendIcon } from '../../shared/icon';
import { PreferencesService } from '../../shared/preferences.service';
import { PlannerStore } from '../../state/planner.store';

@Component({
  selector: 'app-estimate-summary',
  imports: [Icon],
  templateUrl: './estimate-summary.html',
  styleUrl: './estimate-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimateSummary {
  private readonly store = inject(PlannerStore);
  private readonly preferences = inject(PreferencesService);

  protected readonly view = computed(() => {
    const estimate = this.store.estimate();
    const summary = this.store.profile()?.summary;
    const flatTimeS = this.store.flatTimeS();
    if (!estimate || !summary || flatTimeS === null) return null;

    const deltaS = estimate.totalTimeS - flatTimeS;
    const unit = this.preferences.unit();
    return {
      paceUnit: paceUnitLabel(unit),
      totalTime: formatDuration(estimate.totalTimeS),
      flatTime: formatDuration(flatTimeS),
      deltaVsFlat: formatSignedDuration(deltaS),
      trend: trendIcon(deltaS),
      averagePace: formatPace(estimate.averagePaceSPerKm, unit),
      equivalentPace: formatPace(estimate.equivalentPaceSPerKm, unit),
      vdot: formatNumber(estimate.vdot, 1),
      gain: formatNumber(summary.gainM),
      loss: formatNumber(summary.lossM),
    };
  });
}
