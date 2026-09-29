import { cumulativeDistancesM } from './geo';
import { GpsPoint, GridPoint, RouteGrid } from './types';

/**
 * Distances from 0 to `totalM` every `stepM`, always ending at `totalM`.
 * The last step may be shorter (e.g. the final 17.5 m of a half marathon).
 */
export function gridDistancesM(totalM: number, stepM: number): number[] {
  const distancesM: number[] = [];
  for (let d = 0; d < totalM - 1e-6; d += stepM) distancesM.push(d);
  distancesM.push(totalM);
  return distancesM;
}

/**
 * Linear interpolation of `values` (known at `fromM`, ascending) at each `atM`.
 * Values outside the range are clamped to the ends.
 */
export function interpolateSeries(fromM: number[], values: number[], atM: number[]): number[] {
  if (fromM.length < 2) return atM.map(() => values[0]);

  const result = new Array<number>(atM.length);
  let j = 0;
  for (let k = 0; k < atM.length; k++) {
    const d = atM[k];
    while (j < fromM.length - 2 && fromM[j + 1] < d) j++;
    const spanM = fromM[j + 1] - fromM[j];
    const t = spanM > 0 ? Math.min(1, Math.max(0, (d - fromM[j]) / spanM)) : 0;
    result[k] = values[j] + t * (values[j + 1] - values[j]);
  }
  return result;
}

/**
 * Resamples a GPS track onto a fixed-step distance grid. When `officialDistanceM`
 * is given, distances are scaled to match it. Elevation is interpolated only if
 * every point has it.
 */
export function resampleRoute(
  points: GpsPoint[],
  stepM: number,
  officialDistanceM?: number,
): RouteGrid {
  const measuredM = cumulativeDistancesM(points);
  const totalMeasuredM = measuredM[measuredM.length - 1] ?? 0;
  const distanceScale =
    officialDistanceM && totalMeasuredM > 0 ? officialDistanceM / totalMeasuredM : 1;
  const fromM = measuredM.map((d) => d * distanceScale);
  const atM = gridDistancesM(totalMeasuredM * distanceScale, stepM);

  const hasElevation = points.length > 0 && points.every((p) => p.elevationM !== undefined);
  const lats = interpolateSeries(
    fromM,
    points.map((p) => p.lat),
    atM,
  );
  const lons = interpolateSeries(
    fromM,
    points.map((p) => p.lon),
    atM,
  );
  const elevations = hasElevation
    ? interpolateSeries(
        fromM,
        points.map((p) => p.elevationM!),
        atM,
      )
    : undefined;

  const gridPoints: GridPoint[] = atM.map((distanceM, k) => ({
    distanceM,
    lat: lats[k],
    lon: lons[k],
    ...(elevations && { elevationM: elevations[k] }),
  }));

  return { points: gridPoints, distanceScale, hasElevation };
}
