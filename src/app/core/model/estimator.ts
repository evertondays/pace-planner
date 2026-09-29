import { groupBySplits } from './splits';
import { Estimate, GradeCostModel, ReferenceRace, Segment } from './types';
import { calculateVdot, speedForVo2, vo2maxFraction } from './vdot';

const MAX_ITERATIONS = 50;
const TOLERANCE_S = 0.5;

/**
 * Estimates the finish time on the route for the same effort (VDOT) as the
 * reference race.
 *
 * Because the cost multiplier does not depend on speed, the whole route reduces
 * to one flat-equivalent distance. The fixed-point iteration only adjusts the
 * sustainable fraction of VO2max to the duration of the effort.
 */
export function estimate(
  reference: ReferenceRace,
  segments: Segment[],
  model: GradeCostModel,
  splitLengthM = 1000,
): Estimate {
  const vdot = calculateVdot(reference.distanceM, reference.timeS / 60);
  const totalDistanceM = segments.reduce((sum, s) => sum + s.distanceM, 0);
  const equivalentDistanceM = segments.reduce(
    (sum, s) => sum + s.distanceM * model.costMultiplier(s.grade),
    0,
  );
  const solution = solveFlatEffort(reference, vdot, equivalentDistanceM);

  return {
    vdot,
    totalTimeS: solution.timeS,
    equivalentDistanceM,
    equivalentPaceSPerKm: 60_000 / solution.flatSpeedMPerMin,
    averagePaceSPerKm: solution.timeS / (totalDistanceM / 1000),
    iterations: solution.iterations,
    converged: solution.converged,
    splits: groupBySplits(segments, solution.flatSpeedMPerMin, model, splitLengthM),
  };
}

/** Finish time for the same effort on a flat course of the given distance. */
export function predictFlatTimeS(reference: ReferenceRace, distanceM: number): number {
  const vdot = calculateVdot(reference.distanceM, reference.timeS / 60);
  return solveFlatEffort(reference, vdot, distanceM).timeS;
}

function solveFlatEffort(reference: ReferenceRace, vdot: number, equivalentDistanceM: number) {
  // Riegel seed: t = tRef * (d / dRef)^1.06
  let timeMin = (reference.timeS / 60) * Math.pow(equivalentDistanceM / reference.distanceM, 1.06);
  let flatSpeedMPerMin = 0;
  let iterations = 0;
  let converged = false;

  while (!converged && iterations < MAX_ITERATIONS) {
    flatSpeedMPerMin = speedForVo2(vdot * vo2maxFraction(timeMin));
    const nextTimeMin = equivalentDistanceM / flatSpeedMPerMin;
    converged = Math.abs(nextTimeMin - timeMin) * 60 < TOLERANCE_S;
    timeMin = nextTimeMin;
    iterations++;
  }

  return { timeS: timeMin * 60, flatSpeedMPerMin, iterations, converged };
}
