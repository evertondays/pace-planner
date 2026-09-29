import { Segment } from '../model/types';
import { movingAverage } from './smoothing';
import { GridPoint, Profile, ProfileConfig, ProfilePoint, ProfileSummary } from './types';

export const DEFAULT_PROFILE_CONFIG: ProfileConfig = {
  stepM: 20,
  smoothingWindowM: 100,
  gradeWindowM: 60,
};

export const MIN_ROUTE_DISTANCE_M = 500;

/** Guard against absurd ramps from bad elevation data. */
const MAX_ABS_GRADE = 0.3;
const HYSTERESIS_M = 3;

/**
 * Smooths the elevation of a grid, derives the grade of each segment and the
 * elevation summary. `elevationsM` holds one raw elevation per grid point.
 */
export function buildProfile(
  grid: GridPoint[],
  elevationsM: number[],
  config: ProfileConfig,
): Profile {
  const smoothedM = movingAverage(elevationsM, Math.round(config.smoothingWindowM / config.stepM));
  const points: ProfilePoint[] = grid.map((p, i) => ({
    distanceM: p.distanceM,
    lat: p.lat,
    lon: p.lon,
    elevationM: smoothedM[i],
  }));

  return {
    points,
    segments: buildSegments(points, config.gradeWindowM, config.stepM),
    summary: summarize(points),
  };
}

/**
 * One segment between each pair of consecutive points. The grade is a central
 * difference over roughly `gradeWindowM`, clamped to ±30%.
 */
export function buildSegments(
  points: ProfilePoint[],
  gradeWindowM: number,
  stepM: number,
): Segment[] {
  const halfWidth = Math.max(0, Math.round((gradeWindowM / stepM - 1) / 2));
  const last = points.length - 1;
  const segments: Segment[] = [];

  for (let k = 0; k < last; k++) {
    const a = points[Math.max(0, k - halfWidth)];
    const b = points[Math.min(last, k + 1 + halfWidth)];
    const grade = (b.elevationM - a.elevationM) / (b.distanceM - a.distanceM);
    const startM = points[k].distanceM;
    segments.push({
      startM,
      distanceM: points[k + 1].distanceM - startM,
      grade: Math.max(-MAX_ABS_GRADE, Math.min(MAX_ABS_GRADE, grade)),
    });
  }
  return segments;
}

/** Elevation gain and loss, ignoring oscillations smaller than the hysteresis. */
export function gainAndLossM(
  elevationsM: number[],
  hysteresisM = HYSTERESIS_M,
): { gainM: number; lossM: number } {
  let gainM = 0;
  let lossM = 0;
  let anchorM = elevationsM[0];
  for (const e of elevationsM) {
    if (e - anchorM >= hysteresisM) {
      gainM += e - anchorM;
      anchorM = e;
    } else if (anchorM - e >= hysteresisM) {
      lossM += anchorM - e;
      anchorM = e;
    }
  }
  return { gainM, lossM };
}

export function summarize(points: ProfilePoint[]): ProfileSummary {
  const elevationsM = points.map((p) => p.elevationM);
  return {
    totalDistanceM: points[points.length - 1]?.distanceM ?? 0,
    ...gainAndLossM(elevationsM),
    minElevationM: Math.min(...elevationsM),
    maxElevationM: Math.max(...elevationsM),
  };
}
