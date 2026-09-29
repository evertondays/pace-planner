import { syntheticTrack } from '../../../testing/gpx-builder';
import { gridDistancesM, interpolateSeries, resampleRoute } from './resampling';

describe('resampling', () => {
  it('builds a grid that ends exactly at the total distance', () => {
    expect(gridDistancesM(70, 20)).toEqual([0, 20, 40, 60, 70]);
    expect(gridDistancesM(60, 20)).toEqual([0, 20, 40, 60]);
  });

  it('interpolates linearly and clamps outside the range', () => {
    expect(interpolateSeries([0, 10, 20], [0, 100, 50], [-5, 5, 10, 15, 25])).toEqual([
      0, 50, 100, 75, 50,
    ]);
  });

  it('puts every multiple of 1000 m on the grid', () => {
    const points = syntheticTrack({ distanceM: 21_100, spacingM: 37, elevationAt: () => 0 });
    const grid = resampleRoute(points, 20, 21_097.5);
    const distancesM = new Set(grid.points.map((p) => p.distanceM));

    for (let km = 0; km <= 21; km++) expect(distancesM.has(km * 1000)).toBe(true);
    expect(grid.points[grid.points.length - 1].distanceM).toBeCloseTo(21_097.5, 6);
  });

  it('scales the measured distance to the official one', () => {
    const points = syntheticTrack({ distanceM: 10_100 });
    const grid = resampleRoute(points, 20, 10_000);

    expect(grid.distanceScale).toBeCloseTo(10_000 / 10_100, 3);
    expect(grid.points[grid.points.length - 1].distanceM).toBeCloseTo(10_000, 6);
  });

  it('interpolates elevation only when every point has it', () => {
    const withElevation = syntheticTrack({ distanceM: 100, elevationAt: (d) => d / 10 });
    const grid = resampleRoute(withElevation, 20);
    expect(grid.hasElevation).toBe(true);
    expect(grid.points[1].elevationM).toBeCloseTo(2, 1);

    const partial = [...withElevation, { lat: withElevation[10].lat + 0.001, lon: -46.63 }];
    const gridWithoutElevation = resampleRoute(partial, 20);
    expect(gridWithoutElevation.hasElevation).toBe(false);
    expect(gridWithoutElevation.points[1].elevationM).toBeUndefined();
  });
});
