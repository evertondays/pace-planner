export type DistanceUnit = 'km' | 'mi';

/** Length of one display unit, in meters. */
export const UNIT_LENGTH_M: Record<DistanceUnit, number> = {
  km: 1000,
  mi: 1609.344,
};
