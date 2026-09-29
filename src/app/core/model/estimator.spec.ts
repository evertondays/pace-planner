import { buildSegments, flatRoute } from '../../../testing/segment-builder';
import { estimate, predictFlatTimeS } from './estimator';
import { createGradeCostModel, DEFAULT_MODEL_CONFIG } from './grade-cost';
import { ReferenceRace } from './types';
import { calculateVdot } from './vdot';

const HALF_MARATHON_M = 21097.5;
const halfIn130: ReferenceRace = { distanceM: HALF_MARATHON_M, timeS: 5400 };

describe('estimate', () => {
  const model = createGradeCostModel(DEFAULT_MODEL_CONFIG);

  it('returns the reference time on the same flat distance', () => {
    const result = estimate(halfIn130, flatRoute(HALF_MARATHON_M), model);

    expect(Math.abs(result.totalTimeS - 5400)).toBeLessThan(1);
    expect(result.vdot).toBeCloseTo(51.0, 1);
    expect(result.converged).toBe(true);
  });

  it('predicts a flat half marathon with the same VDOT as a 40:00 10 km', () => {
    const reference: ReferenceRace = { distanceM: 10_000, timeS: 2400 };
    const result = estimate(reference, flatRoute(HALF_MARATHON_M), model);

    expect(calculateVdot(HALF_MARATHON_M, result.totalTimeS / 60)).toBeCloseTo(result.vdot, 2);
    // Daniels' tables put a 40:00 10 km at roughly 1:28-1:29 for the half.
    expect(result.totalTimeS).toBeGreaterThan(87 * 60);
    expect(result.totalTimeS).toBeLessThan(90 * 60);
  });

  it('predicts the same flat time as a flat route estimate', () => {
    const reference: ReferenceRace = { distanceM: 10_000, timeS: 2400 };
    const flat = estimate(reference, flatRoute(HALF_MARATHON_M), model);

    expect(predictFlatTimeS(reference, HALF_MARATHON_M)).toBeCloseTo(flat.totalTimeS, 6);
  });

  it('is slower than flat on a symmetric out-and-back', () => {
    const outAndBack = buildSegments([
      { distanceM: 5000, grade: 0.05 },
      { distanceM: 5000, grade: -0.05 },
    ]);
    const flat = estimate(halfIn130, flatRoute(10_000), model);
    const hilly = estimate(halfIn130, outAndBack, model);

    expect(hilly.totalTimeS).toBeGreaterThan(flat.totalTimeS);
  });

  it('holds a constant equivalent pace, with splits adding up to the total', () => {
    const route = buildSegments([
      { distanceM: 3000, grade: 0.03 },
      { distanceM: 4000, grade: 0 },
      { distanceM: 3000, grade: -0.04 },
    ]);
    const result = estimate(halfIn130, route, model);
    const splitsTimeS = result.splits.reduce((sum, s) => sum + s.timeS, 0);

    expect(splitsTimeS).toBeCloseTo(result.totalTimeS, 6);
    expect(result.splits[4].paceSPerKm).toBeCloseTo(result.equivalentPaceSPerKm, 6);
  });

  it.each([5000, 10_000, HALF_MARATHON_M, 42_195])(
    'converges in fewer than 10 iterations for %d m',
    (distanceM) => {
      const route = buildSegments([
        { distanceM: distanceM / 2, grade: 0.04 },
        { distanceM: distanceM / 2, grade: -0.04 },
      ]);
      const result = estimate(halfIn130, route, model);

      expect(result.converged).toBe(true);
      expect(result.iterations).toBeLessThan(10);
    },
  );
});
