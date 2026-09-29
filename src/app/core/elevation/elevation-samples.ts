import { gridDistancesM, interpolateSeries } from '../route/resampling';
import { RouteGrid } from '../route/types';

export const API_SAMPLE_STEP_M = 50;

/**
 * Elevation samples from an external source. Distances are measured along the
 * GPS track before scaling to the official distance, so the samples stay valid
 * when the official distance or the grid step changes.
 */
export interface ElevationSamples {
  measuredDistancesM: number[];
  elevationsM: number[];
}

export interface SamplePoint {
  measuredDistanceM: number;
  lat: number;
  lon: number;
}

/** Points every `stepM` along the route where the API should be queried. */
export function samplePoints(grid: RouteGrid, stepM = API_SAMPLE_STEP_M): SamplePoint[] {
  const gridM = grid.points.map((p) => p.distanceM / grid.distanceScale);
  const atM = gridDistancesM(gridM[gridM.length - 1] ?? 0, stepM);
  const lats = interpolateSeries(
    gridM,
    grid.points.map((p) => p.lat),
    atM,
  );
  const lons = interpolateSeries(
    gridM,
    grid.points.map((p) => p.lon),
    atM,
  );
  return atM.map((measuredDistanceM, i) => ({ measuredDistanceM, lat: lats[i], lon: lons[i] }));
}

/** Raw elevation for each grid point, from the GPX itself or from API samples. */
export function gridElevationsM(grid: RouteGrid, samples?: ElevationSamples): number[] | undefined {
  if (samples) {
    return interpolateSeries(
      samples.measuredDistancesM,
      samples.elevationsM,
      grid.points.map((p) => p.distanceM / grid.distanceScale),
    );
  }
  return grid.hasElevation ? grid.points.map((p) => p.elevationM!) : undefined;
}
