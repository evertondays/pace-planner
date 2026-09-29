import { createGradeCostModel, DEFAULT_MODEL_CONFIG, minettiMultiplier } from './grade-cost';

describe('grade-cost', () => {
  describe('minettiMultiplier', () => {
    it('is exactly 1 on flat ground', () => {
      expect(minettiMultiplier(0)).toBe(1);
    });

    it('matches the reference values at +10% and -10%', () => {
      expect(minettiMultiplier(0.1)).toBeCloseTo(1.658, 3);
      expect(minettiMultiplier(-0.1)).toBeCloseTo(0.598, 3);
    });

    it('is asymmetric: the uphill costs more than the downhill saves', () => {
      for (const grade of [0.02, 0.05, 0.1]) {
        expect(minettiMultiplier(grade) + minettiMultiplier(-grade)).toBeGreaterThan(2);
      }
    });
  });

  describe('minetti-floor mode', () => {
    const model = createGradeCostModel(DEFAULT_MODEL_CONFIG);

    it('limits steep downhills to the floor', () => {
      expect(model.costMultiplier(-0.1)).toBe(0.85);
      expect(model.costMultiplier(-0.18)).toBe(0.85);
    });

    it('keeps gentle downhills above the floor untouched', () => {
      expect(model.costMultiplier(-0.01)).toBe(minettiMultiplier(-0.01));
    });

    it('uses pure Minetti uphill', () => {
      expect(model.costMultiplier(0.1)).toBe(minettiMultiplier(0.1));
    });
  });

  describe('conservative mode', () => {
    const model = createGradeCostModel({ ...DEFAULT_MODEL_CONFIG, mode: 'conservative' });

    it('halves the downhill gain with the default factor', () => {
      expect(model.costMultiplier(-0.1)).toBeCloseTo(0.8, 2);
      expect(model.costMultiplier(-0.18)).toBeCloseTo(0.75, 2);
    });

    it('uses pure Minetti uphill', () => {
      expect(model.costMultiplier(0.1)).toBe(minettiMultiplier(0.1));
    });
  });
});
