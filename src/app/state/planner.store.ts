import {
  computed,
  effect,
  inject,
  Injectable,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { ElevationSamples, gridElevationsM } from '../core/elevation/elevation-samples';
import { ElevationService } from '../core/elevation/elevation.service';
import { estimate, predictFlatTimeS } from '../core/model/estimator';
import { createGradeCostModel, DEFAULT_MODEL_CONFIG } from '../core/model/grade-cost';
import { ModelConfig, ReferenceRace } from '../core/model/types';
import { UNIT_LENGTH_M } from '../core/model/units';
import { calculateVdot } from '../core/model/vdot';
import { cumulativeDistancesM } from '../core/route/geo';
import { parseGpx } from '../core/route/gpx-parser';
import { buildProfile, DEFAULT_PROFILE_CONFIG, MIN_ROUTE_DISTANCE_M } from '../core/route/profile';
import { resampleRoute } from '../core/route/resampling';
import { ElevationSource, GpsPoint, ProfileConfig } from '../core/route/types';
import { PreferencesService } from '../shared/preferences.service';
import { loadSettings, loadStoredRoute, saveRoute, saveSettings } from './planner.storage';

export interface LoadedRoute {
  fileName: string;
  name?: string;
  points: GpsPoint[];
}

export type RouteError = 'invalid-file' | 'no-points' | 'too-short';

export type ApiElevationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; samples: ElevationSamples }
  | { status: 'error' };

/** Reference race validity range of the Daniels & Gilbert fit. */
export const REFERENCE_MIN_DISTANCE_M = 1500;
export const REFERENCE_MAX_DISTANCE_M = 42_195;

@Injectable({ providedIn: 'root' })
export class PlannerStore {
  private readonly elevationService = inject(ElevationService);
  private readonly preferences = inject(PreferencesService);

  // Inputs
  readonly rawRoute = signal<LoadedRoute | null>(null);
  readonly routeError = signal<RouteError | null>(null);
  readonly elevationSource = signal<ElevationSource>('gpx');
  readonly profileConfig = signal<ProfileConfig>(DEFAULT_PROFILE_CONFIG);
  readonly referenceRace = signal<ReferenceRace>({ distanceM: 21_097.5, timeS: 5400 });
  readonly modelConfig = signal<ModelConfig>(DEFAULT_MODEL_CONFIG);
  readonly apiElevation = signal<ApiElevationState>({ status: 'idle' });

  /** Length of a split in the user's unit (1 km or 1 mile). */
  readonly splitLengthM = computed(() => UNIT_LENGTH_M[this.preferences.unit()]);

  /** 1-based split highlighted in the table, chart and map; cleared when the unit changes. */
  readonly selectedSplit = linkedSignal<number, number | null>({
    source: this.splitLengthM,
    computation: () => null,
  });

  // Derived
  readonly grid = computed(() => {
    const route = this.rawRoute();
    if (!route) return null;
    const config = this.profileConfig();
    return resampleRoute(route.points, config.stepM, config.officialDistanceM);
  });

  readonly routeHasElevation = computed(() => this.grid()?.hasElevation ?? false);

  /** Source actually used: the API when chosen and loaded, otherwise the GPX when it has elevation. */
  readonly activeElevationSource = computed<ElevationSource | null>(() => {
    const api = this.apiElevation();
    if (this.elevationSource() === 'open-meteo' && api.status === 'ready') return 'open-meteo';
    return this.routeHasElevation() ? 'gpx' : null;
  });

  readonly profile = computed(() => {
    const grid = this.grid();
    const source = this.activeElevationSource();
    if (!grid || !source) return null;

    const api = this.apiElevation();
    const samples = source === 'open-meteo' && api.status === 'ready' ? api.samples : undefined;
    const elevationsM = gridElevationsM(grid, samples);
    return elevationsM ? buildProfile(grid.points, elevationsM, this.profileConfig()) : null;
  });

  readonly gradeModel = computed(() => createGradeCostModel(this.modelConfig()));

  /** Fitness from the reference race alone; available before any route is loaded. */
  readonly vdot = computed(() => {
    const reference = this.referenceRace();
    return isValidReference(reference)
      ? calculateVdot(reference.distanceM, reference.timeS / 60)
      : null;
  });

  readonly estimate = computed(() => {
    const profile = this.profile();
    const reference = this.referenceRace();
    if (!profile || !isValidReference(reference)) return null;
    return estimate(reference, profile.segments, this.gradeModel(), this.splitLengthM());
  });

  /** Time for the same effort on a flat course of the same distance. */
  readonly flatTimeS = computed(() => {
    const profile = this.profile();
    const reference = this.referenceRace();
    if (!profile || !isValidReference(reference)) return null;
    return predictFlatTimeS(reference, profile.summary.totalDistanceM);
  });

  readonly referenceOutOfRange = computed(() => {
    const { distanceM } = this.referenceRace();
    return distanceM < REFERENCE_MIN_DISTANCE_M || distanceM > REFERENCE_MAX_DISTANCE_M;
  });

  constructor() {
    this.restore();

    effect(() => {
      const route = this.rawRoute();
      if (!route || this.elevationSource() !== 'open-meteo') return;
      untracked(() => {
        if (this.apiElevation().status === 'idle') void this.fetchApiElevation(route);
      });
    });

    effect(() => {
      saveSettings({
        referenceRace: this.referenceRace(),
        modelConfig: this.modelConfig(),
        profileConfig: this.profileConfig(),
        elevationSource: this.elevationSource(),
      });
    });

    effect(() => saveRoute(this.rawRoute()));
  }

  async loadFile(file: File): Promise<void> {
    this.loadGpx(await file.text(), file.name);
  }

  loadGpx(xml: string, fileName: string): void {
    let parsed;
    try {
      parsed = parseGpx(xml);
    } catch {
      this.routeError.set('invalid-file');
      return;
    }
    if (parsed.points.length < 2) {
      this.routeError.set('no-points');
      return;
    }
    const distancesM = cumulativeDistancesM(parsed.points);
    if (distancesM[distancesM.length - 1] < MIN_ROUTE_DISTANCE_M) {
      this.routeError.set('too-short');
      return;
    }

    this.setRoute({ fileName, name: parsed.name, points: parsed.points });
    this.profileConfig.update(({ officialDistanceM: _, ...config }) => config);
  }

  clearRoute(): void {
    this.rawRoute.set(null);
    this.routeError.set(null);
    this.apiElevation.set({ status: 'idle' });
    this.selectedSplit.set(null);
  }

  retryApiElevation(): void {
    const route = this.rawRoute();
    if (route) void this.fetchApiElevation(route);
  }

  toggleSplit(index: number): void {
    this.selectedSplit.update((selected) => (selected === index ? null : index));
  }

  private setRoute(route: LoadedRoute): void {
    this.routeError.set(null);
    this.apiElevation.set({ status: 'idle' });
    this.selectedSplit.set(null);
    this.rawRoute.set(route);
    if (!route.points.every((p) => p.elevationM !== undefined)) {
      this.elevationSource.set('open-meteo');
    }
  }

  private async fetchApiElevation(route: LoadedRoute): Promise<void> {
    this.apiElevation.set({ status: 'loading' });
    try {
      const grid = resampleRoute(route.points, DEFAULT_PROFILE_CONFIG.stepM);
      const samples = await this.elevationService.fetchSamples(grid);
      if (this.rawRoute() === route) this.apiElevation.set({ status: 'ready', samples });
    } catch (error) {
      console.error('Elevation API request failed', error);
      if (this.rawRoute() === route) this.apiElevation.set({ status: 'error' });
    }
  }

  private restore(): void {
    const settings = loadSettings();
    if (settings) {
      this.referenceRace.set(settings.referenceRace);
      this.modelConfig.set(settings.modelConfig);
      this.profileConfig.set(settings.profileConfig);
      this.elevationSource.set(settings.elevationSource);
    }
    const route = loadStoredRoute();
    if (route) this.setRoute(route);
  }
}

function isValidReference(reference: ReferenceRace): boolean {
  return reference.distanceM > 0 && reference.timeS > 0;
}
