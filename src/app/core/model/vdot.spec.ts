import { calculateVdot, oxygenCost, speedForVo2, vo2maxFraction } from './vdot';

describe('vdot', () => {
  it('gives VDOT ~51.0 for a 1:30:00 half marathon', () => {
    expect(calculateVdot(21097.5, 90)).toBeCloseTo(51.0, 1);
  });

  it('sustains ~86.0% of VO2max for 90 minutes', () => {
    expect(vo2maxFraction(90)).toBeCloseTo(0.86, 3);
  });

  it('sustains a lower fraction for longer efforts', () => {
    expect(vo2maxFraction(100)).toBeLessThan(vo2maxFraction(90));
    expect(vo2maxFraction(100)).toBeCloseTo(0.853, 3);
  });

  it('inverts the oxygen cost equation', () => {
    for (const speedMPerMin of [150, 200, 234.4, 300, 400]) {
      expect(speedForVo2(oxygenCost(speedMPerMin))).toBeCloseTo(speedMPerMin, 9);
    }
  });
});
