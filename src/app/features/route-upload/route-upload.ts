import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UNIT_LENGTH_M } from '../../core/model/units';
import { MIN_ROUTE_DISTANCE_M } from '../../core/route/profile';
import { ElevationSource } from '../../core/route/types';
import { formatDecimal, formatDistance, formatNumber, parseDecimal } from '../../shared/formatters';
import { Icon } from '../../shared/icon';
import { PreferencesService } from '../../shared/preferences.service';
import { PlannerStore, RouteError } from '../../state/planner.store';

const ERROR_MESSAGES: Record<RouteError, string> = {
  'invalid-file': $localize`Arquivo inválido. Envie um GPX exportado do relógio, Strava ou site da prova.`,
  'no-points': $localize`O GPX não tem pontos de trajeto.`,
  'too-short': $localize`O percurso tem menos de 500 m. Envie o GPX completo da prova.`,
};

@Component({
  selector: 'app-route-upload',
  imports: [Icon],
  templateUrl: './route-upload.html',
  styleUrl: './route-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteUpload {
  protected readonly store = inject(PlannerStore);
  protected readonly preferences = inject(PreferencesService);
  protected readonly dragging = signal(false);
  protected readonly officialDistanceInvalid = signal(false);

  protected readonly errorMessage = computed(() => {
    const error = this.store.routeError();
    return error ? ERROR_MESSAGES[error] : null;
  });

  protected readonly routeTitle = computed(() => {
    const route = this.store.rawRoute();
    return route?.name ?? route?.fileName.replace(/\.gpx$/i, '') ?? '';
  });

  protected readonly distance = computed(() => {
    const profile = this.store.profile();
    const grid = this.store.grid();
    const distanceM = profile?.summary.totalDistanceM ?? grid?.points.at(-1)?.distanceM;
    return distanceM === undefined ? null : formatDistance(distanceM, this.preferences.unit(), 2);
  });

  protected readonly gainM = computed(() => {
    const summary = this.store.profile()?.summary;
    return summary ? formatNumber(summary.gainM) : null;
  });

  protected readonly lossM = computed(() => {
    const summary = this.store.profile()?.summary;
    return summary ? formatNumber(summary.lossM) : null;
  });

  protected readonly officialDistance = computed(() => {
    const distanceM = this.store.profileConfig().officialDistanceM;
    return distanceM ? formatDecimal(distanceM / UNIT_LENGTH_M[this.preferences.unit()]) : '';
  });

  /** A half marathon in the user's unit, as an example of the expected format. */
  protected readonly officialDistancePlaceholder = computed(() =>
    formatDecimal(21_097.5 / UNIT_LENGTH_M[this.preferences.unit()]),
  );

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.store.loadFile(file);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.store.loadFile(file);
  }

  protected setOfficialDistance(text: string): void {
    if (text.trim() === '') {
      this.officialDistanceInvalid.set(false);
      this.store.profileConfig.update(({ officialDistanceM: _, ...config }) => config);
      return;
    }
    const value = parseDecimal(text);
    const officialDistanceM = value === null ? 0 : value * UNIT_LENGTH_M[this.preferences.unit()];
    const valid = officialDistanceM >= MIN_ROUTE_DISTANCE_M && officialDistanceM <= 400_000;
    this.officialDistanceInvalid.set(!valid);
    if (valid) this.store.profileConfig.update((c) => ({ ...c, officialDistanceM }));
  }

  protected setElevationSource(source: ElevationSource): void {
    this.store.elevationSource.set(source);
  }
}
