import { buildSegments } from '../../../testing/segment-builder';
import { createGradeCostModel, DEFAULT_MODEL_CONFIG } from './grade-cost';
import { groupBySplits } from './splits';
import { UNIT_LENGTH_M } from './units';

describe('groupBySplits', () => {
  const model = createGradeCostModel(DEFAULT_MODEL_CONFIG);
  const flatSpeedMPerMin = 250; // 4:00/km

  it('creates one split per km, with a partial last km', () => {
    const splits = groupBySplits(
      buildSegments([{ distanceM: 2100, grade: 0 }]),
      flatSpeedMPerMin,
      model,
    );

    expect(splits.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(splits.map((s) => s.startM)).toEqual([0, 1000, 2000]);
    expect(splits.map((s) => s.distanceM)).toEqual([1000, 1000, 100]);
    expect(splits[0].timeS).toBeCloseTo(240, 9);
    expect(splits[2].timeS).toBeCloseTo(24, 9);
    expect(splits[2].paceSPerKm).toBeCloseTo(240, 9);
  });

  it('splits by mile, dividing segments that cross a boundary', () => {
    const mileM = UNIT_LENGTH_M.mi;
    const splits = groupBySplits(
      buildSegments([{ distanceM: 5000, grade: 0 }]),
      flatSpeedMPerMin,
      model,
      mileM,
    );

    expect(splits.length).toBe(4);
    expect(splits[0].distanceM).toBeCloseTo(mileM, 6);
    expect(splits[3].distanceM).toBeCloseTo(5000 - 3 * mileM, 6);
    // Pace is always stored per km: 4:00/km on flat ground.
    expect(splits[1].paceSPerKm).toBeCloseTo(240, 6);
    expect(splits.reduce((sum, s) => sum + s.timeS, 0)).toBeCloseTo(1200, 6);
  });

  it('merges a last split shorter than 5 m into the previous one', () => {
    const splits = groupBySplits(
      buildSegments([{ distanceM: 2003, grade: 0 }]),
      flatSpeedMPerMin,
      model,
    );

    expect(splits.map((s) => s.distanceM)).toEqual([1000, 1003]);
  });

  it('computes gain, loss and average grade per split', () => {
    const segments = buildSegments([
      { distanceM: 500, grade: 0.04 },
      { distanceM: 500, grade: -0.02 },
    ]);
    const [split] = groupBySplits(segments, flatSpeedMPerMin, model);

    expect(split.gainM).toBeCloseTo(20, 9);
    expect(split.lossM).toBeCloseTo(10, 9);
    expect(split.averageGrade).toBeCloseTo(0.01, 9);
  });

  it('is slower uphill and faster downhill than the flat pace', () => {
    const segments = buildSegments([
      { distanceM: 1000, grade: 0.05 },
      { distanceM: 1000, grade: -0.05 },
    ]);
    const [up, down] = groupBySplits(segments, flatSpeedMPerMin, model);

    expect(up.paceSPerKm).toBeGreaterThan(240);
    expect(down.paceSPerKm).toBeLessThan(240);
  });
});
