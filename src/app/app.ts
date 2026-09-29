import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ElevationChart } from './features/elevation-chart/elevation-chart';
import { EstimateSummary } from './features/estimate-summary/estimate-summary';
import { ModelSettings } from './features/model-settings/model-settings';
import { ReferenceRaceForm } from './features/reference-race/reference-race';
import { RouteMap } from './features/route-map/route-map';
import { RouteUpload } from './features/route-upload/route-upload';
import { SplitsTable } from './features/splits-table/splits-table';
import { Icon } from './shared/icon';
import { ThemeService } from './shared/theme.service';
import { PlannerStore } from './state/planner.store';

@Component({
  selector: 'app-root',
  imports: [
    Icon,
    RouteUpload,
    ReferenceRaceForm,
    ModelSettings,
    EstimateSummary,
    ElevationChart,
    RouteMap,
    SplitsTable,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly store = inject(PlannerStore);
  protected readonly theme = inject(ThemeService);
  protected readonly themeToggleLabel = computed(() =>
    this.theme.theme() === 'dark' ? $localize`Usar tema claro` : $localize`Usar tema escuro`,
  );
}
