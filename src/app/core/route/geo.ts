const EARTH_RADIUS_M = 6_371_008.8; // mean radius (IUGG)

interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance between two points, in meters. */
export function haversineM(a: LatLon, b: LatLon): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cumulative distance of each point from the first one, in meters. */
export function cumulativeDistancesM(points: LatLon[]): number[] {
  const distancesM = new Array<number>(points.length);
  let totalM = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) totalM += haversineM(points[i - 1], points[i]);
    distancesM[i] = totalM;
  }
  return distancesM;
}
