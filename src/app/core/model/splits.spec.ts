import { buildSegments } from '../../../testing/segment-builder';
import { createGradeCostModel, DEFAULT_MODEL_CONFIG } from './grade-cost';
import { groupByKm } from './splits';

describe('groupByKm', () => {
  const model = createGradeCostModel(DEFAULT_MODEL_CONFIG);
  const flatSpeedMPerMin = 250; // 4:00/km

  it('creates one split per km, with a partial last km', () => {
    const splits = groupByKm(
      buildSegments([{ distanceM: 2100, grade: 0 }]),
      flatSpeedMPerMin,
      model,
    );

    expect(splits.map((s) => s.km)).toEqual([1, 2, 3]);
    expect(splits.map((s) => s.distanceM)).toEqual([1000, 1000, 100]);
    expect(splits[0].timeS).toBeCloseTo(240, 9);
    expect(splits[2].timeS).toBeCloseTo(24, 9);
    expect(splits[2].paceSPerKm).toBeCloseTo(240, 9);
  });

  it('computes gain, loss and average grade per km', () => {
    const segments = buildSegments([
      { distanceM: 500, grade: 0.04 },
      { distanceM: 500, grade: -0.02 },
    ]);
    const [split] = groupByKm(segments, flatSpeedMPerMin, model);

    expect(split.gainM).toBeCloseTo(20, 9);
    expect(split.lossM).toBeCloseTo(10, 9);
    expect(split.averageGrade).toBeCloseTo(0.01, 9);
  });

  it('is slower uphill and faster downhill than the flat pace', () => {
    const segments = buildSegments([
      { distanceM: 1000, grade: 0.05 },
      { distanceM: 1000, grade: -0.05 },
    ]);
    const [up, down] = groupByKm(segments, flatSpeedMPerMin, model);

    expect(up.paceSPerKm).toBeGreaterThan(240);
    expect(down.paceSPerKm).toBeLessThan(240);
  });
});
