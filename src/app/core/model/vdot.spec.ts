import { calculateVdot, checkVdot, oxygenCost, speedForVo2, vo2maxFraction } from './vdot';

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

  it('accepts real performances and flags typos', () => {
    // Marathon world record (2:00:35) and a beginner 5K in 35:00.
    expect(checkVdot(calculateVdot(42_195, 120 + 35 / 60))).toBeNull();
    expect(checkVdot(calculateVdot(5000, 35))).toBeNull();
    // Half marathon typed as 1:30 (read as 1 min 30 s) and a 5K walked in 1 h.
    expect(checkVdot(calculateVdot(21_097.5, 1.5))).toBe('too-high');
    expect(checkVdot(calculateVdot(5000, 60))).toBe('too-low');
  });

  it('inverts the oxygen cost equation', () => {
    for (const speedMPerMin of [150, 200, 234.4, 300, 400]) {
      expect(speedForVo2(oxygenCost(speedMPerMin))).toBeCloseTo(speedMPerMin, 9);
    }
  });
});
