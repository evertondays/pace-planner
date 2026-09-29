import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { DistanceUnit } from './core/model/units';
import { ElevationChart } from './features/elevation-chart/elevation-chart';
import { EstimateSummary } from './features/estimate-summary/estimate-summary';
import { LanguageMenu } from './features/language-menu/language-menu';
import { ModelSettings } from './features/model-settings/model-settings';
import { ReferenceRaceForm } from './features/reference-race/reference-race';
import { RouteMap } from './features/route-map/route-map';
import { RouteUpload } from './features/route-upload/route-upload';
import { SplitsTable } from './features/splits-table/splits-table';
import { Icon } from './shared/icon';
import { PreferencesService } from './shared/preferences.service';
import { ThemeService } from './shared/theme.service';
import { PlannerStore } from './state/planner.store';

@Component({
  selector: 'app-root',
  imports: [
    Icon,
    LanguageMenu,
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
  protected readonly preferences = inject(PreferencesService);
  protected readonly units: DistanceUnit[] = ['km', 'mi'];

  constructor() {
    inject(Meta).updateTag({
      name: 'description',
      content: $localize`Estime o tempo de chegada e o pace de cada km ou milha de uma prova com altimetria.`,
    });
  }

  protected readonly themeToggleLabel = computed(() =>
    this.theme.theme() === 'dark' ? $localize`Usar tema claro` : $localize`Usar tema escuro`,
  );
}
