/**
 * Daniels & Gilbert (1979) equations. Speeds are in meters per minute and
 * durations in minutes, as in the original fit.
 */

const A = 0.000104;
const B = 0.182258;
const C = -4.6;

/** Oxygen cost (ml/kg/min) of running on flat ground at the given speed. */
export function oxygenCost(speedMPerMin: number): number {
  return C + B * speedMPerMin + A * speedMPerMin ** 2;
}

/** Fraction of VO2max that can be sustained for the given duration. */
export function vo2maxFraction(timeMin: number): number {
  return (
    0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 0.2989558 * Math.exp(-0.1932605 * timeMin)
  );
}

/**
 * Plausible VDOT range. The men's world records from 5 km to the marathon sit at
 * about 85.5, so anything above the maximum is a typo in the time or distance.
 * Below the minimum (around 5 km in 43 min) the effort is closer to walking,
 * where the running equations no longer apply.
 */
export const VDOT_RANGE = { min: 20, max: 88 } as const;

export type VdotIssue = 'too-low' | 'too-high';

export function checkVdot(vdot: number): VdotIssue | null {
  if (vdot < VDOT_RANGE.min) return 'too-low';
  if (vdot > VDOT_RANGE.max) return 'too-high';
  return null;
}

export function calculateVdot(distanceM: number, timeMin: number): number {
  return oxygenCost(distanceM / timeMin) / vo2maxFraction(timeMin);
}

/** Inverse of {@link oxygenCost}: flat speed (m/min) that costs the given VO2. */
export function speedForVo2(vo2: number): number {
  return (-B + Math.sqrt(B ** 2 - 4 * A * (C - vo2))) / (2 * A);
}
