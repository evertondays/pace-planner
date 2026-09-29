import { GradeCostModel, ModelConfig } from './types';

/** Cost of running on flat ground according to the polynomial (J/kg/m). */
const FLAT_COST = 3.6;

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  mode: 'minetti-floor',
  downhillFloor: 0.85,
  downhillFactor: 0.5,
};

/** Minetti et al. (2002) energy cost of running (J/kg/m) at the given grade. */
export function minettiCost(grade: number): number {
  const i = grade;
  return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + FLAT_COST;
}

/** Raw Minetti cost relative to flat ground, with no downhill limit. */
export function minettiMultiplier(grade: number): number {
  return minettiCost(grade) / FLAT_COST;
}

/**
 * Builds the cost model for the chosen downhill mode. Uphill always uses pure
 * Minetti; the modes only limit how much a downhill can speed the runner up.
 */
export function createGradeCostModel(config: ModelConfig): GradeCostModel {
  const downhill =
    config.mode === 'minetti-floor'
      ? (m: number) => Math.max(m, config.downhillFloor)
      : (m: number) => 1 + config.downhillFactor * (m - 1);

  return {
    costMultiplier(grade: number): number {
      const m = minettiMultiplier(grade);
      return grade < 0 ? downhill(m) : m;
    },
  };
}
