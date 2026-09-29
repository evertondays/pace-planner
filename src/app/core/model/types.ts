/**
 * Domain types for the pace model. Distances are in meters, times in seconds and
 * grades in fraction (0.05 = 5%) unless the name says otherwise.
 */

export interface Segment {
  startM: number;
  distanceM: number; // grid step, usually 20
  grade: number; // 0.05 = 5%
}

// Reference race entered by the user
export interface ReferenceRace {
  distanceM: number; // e.g. 21097.5
  timeS: number; // e.g. 5400
}

export type GradeMode = 'minetti-floor' | 'conservative';

export interface ModelConfig {
  mode: GradeMode;
  downhillFloor: number; // default 0.85
  downhillFactor: number; // default 0.5
}

export interface GradeCostModel {
  costMultiplier(grade: number): number;
}

/** Split of one display unit (km or mile). */
export interface Split {
  index: number; // 1-based, for display
  startM: number;
  distanceM: number; // one unit, except the last one
  timeS: number;
  paceSPerKm: number;
  gainM: number;
  lossM: number;
  averageGrade: number;
}

export interface Estimate {
  vdot: number;
  totalTimeS: number;
  equivalentDistanceM: number;
  equivalentPaceSPerKm: number; // flat pace of the sustained effort
  averagePaceSPerKm: number;
  iterations: number;
  converged: boolean;
  splits: Split[];
}
