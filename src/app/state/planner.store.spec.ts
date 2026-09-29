import { TestBed } from '@angular/core/testing';
import { syntheticTrack, toGpx } from '../../testing/gpx-builder';
import { ElevationService } from '../core/elevation/elevation.service';
import { calculateVdot } from '../core/model/vdot';
import { PreferencesService } from '../shared/preferences.service';
import { PlannerStore } from './planner.store';

describe('PlannerStore', () => {
  let fetchSamples: ReturnType<typeof vi.fn>;

  function createStore(): PlannerStore {
    TestBed.configureTestingModule({
      providers: [{ provide: ElevationService, useValue: { fetchSamples } }],
    });
    return TestBed.inject(PlannerStore);
  }

  beforeEach(() => {
    localStorage.clear();
    fetchSamples = vi.fn();
  });

  it('estimates a flat GPX route with the reference time', () => {
    const store = createStore();
    const gpx = toGpx(syntheticTrack({ distanceM: 10_000, elevationAt: () => 20 }));
    store.referenceInput.set({ distanceM: 10_000, timeS: 2400 });
    store.loadGpx(gpx, 'flat.gpx');
    store.profileConfig.update((c) => ({ ...c, officialDistanceM: 10_000 }));

    expect(store.routeError()).toBeNull();
    expect(Math.abs(store.estimate()!.totalTimeS - 2400)).toBeLessThan(1);
    expect(store.estimate()!.splits.length).toBe(10);
  });

  it('splits by mile when the user prefers miles and clears the selection', () => {
    const store = createStore();
    const preferences = TestBed.inject(PreferencesService);
    store.referenceInput.set({ distanceM: 10_000, timeS: 2400 });
    store.loadGpx(toGpx(syntheticTrack({ distanceM: 10_000, elevationAt: () => 5 })), 'r.gpx');
    store.toggleSplit(3);

    preferences.setUnit('mi');

    expect(store.estimate()!.splits.length).toBe(7); // 6 full miles + 0.21 mi
    expect(store.selectedSplit()).toBeNull();
    expect(Math.abs(store.estimate()!.totalTimeS - 2400)).toBeLessThan(1);
  });

  it('exposes the VDOT before any route is loaded', () => {
    const store = createStore();
    store.referenceInput.set({ distanceM: 3000, timeS: 600 });

    expect(store.rawRoute()).toBeNull();
    expect(store.vdot()).toBeCloseTo(calculateVdot(3000, 10), 9);
    store.referenceInput.set({ distanceM: 3000, timeS: null });
    expect(store.vdot()).toBeNull();
  });

  it('starts with no reference race and no VDOT', () => {
    const store = createStore();

    expect(store.referenceInput()).toEqual({ distanceM: null, timeS: null });
    expect(store.referenceRace()).toBeNull();
    expect(store.vdot()).toBeNull();
  });

  it('refuses an implausible VDOT and does not estimate with it', () => {
    const store = createStore();
    store.loadGpx(toGpx(syntheticTrack({ distanceM: 5000, elevationAt: () => 5 })), 'r.gpx');
    // A half marathon typed as 1:30 (1 min 30 s).
    store.referenceInput.set({ distanceM: 21_097.5, timeS: 90 });

    expect(store.vdotIssue()).toBe('too-high');
    expect(store.validReference()).toBeNull();
    expect(store.estimate()).toBeNull();

    store.referenceInput.set({ distanceM: 21_097.5, timeS: 5400 });
    expect(store.vdotIssue()).toBeNull();
    expect(store.estimate()).not.toBeNull();
  });

  it('removes the route and its official distance', () => {
    const store = createStore();
    store.loadGpx(toGpx(syntheticTrack({ distanceM: 3000, elevationAt: () => 1 })), 'r.gpx');
    store.profileConfig.update((c) => ({ ...c, officialDistanceM: 3000 }));
    TestBed.tick();

    store.clearRoute();
    TestBed.tick();

    expect(store.rawRoute()).toBeNull();
    expect(store.profileConfig().officialDistanceM).toBeUndefined();
    expect(localStorage.getItem('pace-planner:route:v1')).toBeNull();
  });

  it('reads settings saved in the old format', () => {
    localStorage.setItem(
      'pace-planner:settings:v1',
      JSON.stringify({ referenceRace: { distanceM: 10_000, timeS: 2400 } }),
    );
    const store = createStore();

    expect(store.referenceInput()).toEqual({ distanceM: 10_000, timeS: 2400 });
  });

  it('rejects routes shorter than 500 m and invalid files', () => {
    const store = createStore();
    store.loadGpx(toGpx(syntheticTrack({ distanceM: 300, elevationAt: () => 0 })), 'short.gpx');
    expect(store.routeError()).toBe('too-short');

    store.loadGpx('not xml', 'bad.gpx');
    expect(store.routeError()).toBe('invalid-file');
    expect(store.rawRoute()).toBeNull();
  });

  it('switches to Open-Meteo when the GPX has no elevation', async () => {
    fetchSamples.mockResolvedValue({ measuredDistancesM: [0, 5000], elevationsM: [0, 100] });
    const store = createStore();
    store.loadGpx(toGpx(syntheticTrack({ distanceM: 5000 })), 'no-ele.gpx');
    TestBed.tick();

    expect(store.elevationSource()).toBe('open-meteo');
    expect(fetchSamples).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(store.apiElevation().status).toBe('ready'));
    expect(store.activeElevationSource()).toBe('open-meteo');
    expect(store.profile()!.summary.gainM).toBeGreaterThan(95);
  });

  it('keeps the GPX elevation when the API fails', async () => {
    fetchSamples.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = createStore();
    store.referenceInput.set({ distanceM: 5000, timeS: 1200 });
    store.loadGpx(toGpx(syntheticTrack({ distanceM: 2000, elevationAt: () => 5 })), 'r.gpx');
    store.elevationSource.set('open-meteo');
    TestBed.tick();

    await vi.waitFor(() => expect(store.apiElevation().status).toBe('error'));
    expect(store.activeElevationSource()).toBe('gpx');
    expect(store.estimate()).not.toBeNull();
  });

  it('restores the last route and settings from storage', () => {
    const first = createStore();
    first.referenceInput.set({ distanceM: 5000, timeS: 1200 });
    first.loadGpx(toGpx(syntheticTrack({ distanceM: 3000, elevationAt: () => 1 })), 'saved.gpx');
    TestBed.tick();

    TestBed.resetTestingModule();
    const second = createStore();
    expect(second.referenceInput()).toEqual({ distanceM: 5000, timeS: 1200 });
    expect(second.rawRoute()?.fileName).toBe('saved.gpx');
    expect(second.estimate()).not.toBeNull();
  });
});
