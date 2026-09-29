import { syntheticTrack } from '../../../testing/gpx-builder';
import { buildProfile, DEFAULT_PROFILE_CONFIG, gainAndLossM } from './profile';
import { resampleRoute } from './resampling';
import { movingAverage } from './smoothing';

function profileOf(options: Parameters<typeof syntheticTrack>[0]) {
  const grid = resampleRoute(syntheticTrack(options), DEFAULT_PROFILE_CONFIG.stepM);
  const elevationsM = grid.points.map((p) => p.elevationM!);
  return buildProfile(grid.points, elevationsM, DEFAULT_PROFILE_CONFIG);
}

describe('profile', () => {
  describe('movingAverage', () => {
    it('keeps a straight ramp straight, including the ends', () => {
      const ramp = [0, 1, 2, 3, 4, 5, 6];
      expect(movingAverage(ramp, 5)).toEqual(ramp);
    });

    it('averages a centered window', () => {
      expect(movingAverage([0, 0, 9, 0, 0], 3)).toEqual([0, 3, 3, 3, 0]);
    });
  });

  describe('gainAndLossM', () => {
    it('ignores oscillations below the hysteresis', () => {
      expect(gainAndLossM([100, 102, 99, 101, 100])).toEqual({ gainM: 0, lossM: 0 });
    });

    it('counts real climbs and descents', () => {
      expect(gainAndLossM([100, 110, 120, 105])).toEqual({ gainM: 20, lossM: 15 });
    });
  });

  it('recovers a 5% ramp under ±3 m noise within 0.5 pp per km', () => {
    const profile = profileOf({
      distanceM: 5000,
      spacingM: 5,
      elevationAt: (d) => 700 + 0.05 * d,
      noiseM: 3,
      seed: 42,
    });

    for (let km = 0; km < 5; km++) {
      const kmSegments = profile.segments.filter(
        (s) => s.startM >= km * 1000 && s.startM < (km + 1) * 1000,
      );
      const distanceM = kmSegments.reduce((sum, s) => sum + s.distanceM, 0);
      const grade = kmSegments.reduce((sum, s) => sum + s.grade * s.distanceM, 0) / distanceM;
      expect(Math.abs(grade - 0.05)).toBeLessThan(0.005);
    }
    expect(profile.summary.gainM).toBeGreaterThan(240);
    expect(profile.summary.gainM).toBeLessThan(265);
  });

  it('keeps a noisy flat route close to zero gain', () => {
    const profile = profileOf({ distanceM: 5000, spacingM: 5, elevationAt: () => 50, noiseM: 3 });
    expect(profile.summary.gainM).toBeLessThan(10);
  });

  it('builds one segment per grid step and clamps absurd grades', () => {
    const profile = profileOf({
      distanceM: 2000,
      elevationAt: (d) => (d > 1000 ? 200 : 0), // 200 m wall
    });

    expect(profile.segments.length).toBe(100);
    expect(profile.segments[50].startM).toBe(1000);
    expect(Math.max(...profile.segments.map((s) => s.grade))).toBe(0.3);
  });
});
