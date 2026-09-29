import { GpsPoint } from '../app/core/route/types';

const METERS_PER_DEGREE_LAT = 111_194.93; // mean Earth radius 6371008.8 m

export interface SyntheticTrackOptions {
  distanceM: number;
  spacingM?: number;
  /** Elevation as a function of the distance from the start; omit for no elevation. */
  elevationAt?: (distanceM: number) => number;
  /** Uniform noise amplitude added to the elevation (±noiseM). */
  noiseM?: number;
  seed?: number;
}

/** Straight track heading north from (-23.55, -46.63), with optional elevation. */
export function syntheticTrack(options: SyntheticTrackOptions): GpsPoint[] {
  const { distanceM, spacingM = 10, elevationAt, noiseM = 0, seed = 1 } = options;
  const random = mulberry32(seed);
  const points: GpsPoint[] = [];
  for (let d = 0; d <= distanceM + 1e-9; d += spacingM) {
    const point: GpsPoint = { lat: -23.55 + d / METERS_PER_DEGREE_LAT, lon: -46.63 };
    if (elevationAt) point.elevationM = elevationAt(d) + noiseM * (2 * random() - 1);
    points.push(point);
  }
  return points;
}

export function toGpx(
  points: GpsPoint[],
  options: { name?: string; pointTag?: 'trkpt' | 'rtept' } = {},
): string {
  const tag = options.pointTag ?? 'trkpt';
  const body = points
    .map((p) => {
      const ele = p.elevationM === undefined ? '' : `<ele>${p.elevationM}</ele>`;
      return `<${tag} lat="${p.lat}" lon="${p.lon}">${ele}</${tag}>`;
    })
    .join('\n');
  const name = options.name ? `<name>${options.name}</name>` : '';
  const container =
    tag === 'trkpt' ? `<trk>${name}<trkseg>${body}</trkseg></trk>` : `<rte>${name}${body}</rte>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">${container}</gpx>`;
}

/** Small deterministic PRNG, so noisy fixtures are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
