import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DEFAULT_MODEL_CONFIG } from '../../core/model/grade-cost';
import { GradeMode } from '../../core/model/types';
import { DEFAULT_PROFILE_CONFIG } from '../../core/route/profile';
import { formatNumber, parseDecimal } from '../../shared/formatters';
import { Icon } from '../../shared/icon';
import { PlannerStore } from '../../state/planner.store';

@Component({
  selector: 'app-model-settings',
  imports: [Icon],
  templateUrl: './model-settings.html',
  styleUrl: './model-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSettings {
  protected readonly store = inject(PlannerStore);
  protected readonly smoothingOptionsM = [0, 60, 100, 160, 200];
  protected readonly gradeWindowOptionsM = [20, 60, 100, 140];
  protected readonly formatNumber = formatNumber;

  protected setMode(mode: GradeMode): void {
    this.store.modelConfig.update((c) => ({ ...c, mode }));
  }

  protected setDownhillFloor(text: string): void {
    const value = parseDecimal(text);
    if (value !== null && value > 0 && value <= 1) {
      this.store.modelConfig.update((c) => ({ ...c, downhillFloor: value }));
    }
  }

  protected setDownhillFactor(text: string): void {
    const value = parseDecimal(text);
    if (value !== null && value >= 0 && value <= 1) {
      this.store.modelConfig.update((c) => ({ ...c, downhillFactor: value }));
    }
  }

  protected setSmoothingWindow(value: string): void {
    this.store.profileConfig.update((c) => ({ ...c, smoothingWindowM: Number(value) }));
  }

  protected setGradeWindow(value: string): void {
    this.store.profileConfig.update((c) => ({ ...c, gradeWindowM: Number(value) }));
  }

  protected reset(): void {
    this.store.modelConfig.set(DEFAULT_MODEL_CONFIG);
    this.store.profileConfig.update((c) => ({
      ...c,
      smoothingWindowM: DEFAULT_PROFILE_CONFIG.smoothingWindowM,
      gradeWindowM: DEFAULT_PROFILE_CONFIG.gradeWindowM,
    }));
  }
}
