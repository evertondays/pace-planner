import { syntheticTrack } from '../../../testing/gpx-builder';
import { resampleRoute } from '../route/resampling';
import { gridElevationsM, samplePoints } from './elevation-samples';

describe('elevation samples', () => {
  it('samples every 50 m, ending at the finish', () => {
    const grid = resampleRoute(syntheticTrack({ distanceM: 1030 }), 20);
    const points = samplePoints(grid);

    expect(points.length).toBe(22);
    expect(points[1].measuredDistanceM).toBe(50);
    expect(points[21].measuredDistanceM).toBeCloseTo(1030, 1);
  });

  it('keeps samples aligned when the route is scaled to the official distance', () => {
    const track = syntheticTrack({ distanceM: 1000 });
    const samples = {
      measuredDistancesM: [0, 1000],
      elevationsM: [0, 100],
    };
    const grid = resampleRoute(track, 20, 1100);
    const elevationsM = gridElevationsM(grid, samples)!;

    // 560 m on the scaled grid is 509 m along the track.
    const index = grid.points.findIndex((p) => p.distanceM === 560);
    expect(elevationsM[0]).toBe(0);
    expect(elevationsM[index]).toBeCloseTo(50.9, 1);
    expect(elevationsM[elevationsM.length - 1]).toBeCloseTo(100, 6);
  });

  it('uses the GPX elevation when there are no samples', () => {
    const withElevation = resampleRoute(
      syntheticTrack({ distanceM: 100, elevationAt: () => 7 }),
      20,
    );
    const withoutElevation = resampleRoute(syntheticTrack({ distanceM: 100 }), 20);

    expect(gridElevationsM(withElevation)).toEqual([7, 7, 7, 7, 7, 7]);
    expect(gridElevationsM(withoutElevation)).toBeUndefined();
  });
});
