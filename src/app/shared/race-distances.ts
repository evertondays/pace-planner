export interface RaceDistance {
  distanceM: number;
  label: string;
}

/** Common race distances, used as reference presets and for flat predictions. */
export const RACE_DISTANCES: RaceDistance[] = [
  { distanceM: 3000, label: '3K' },
  { distanceM: 5000, label: '5K' },
  { distanceM: 10_000, label: '10K' },
  { distanceM: 21_097.5, label: '21K' },
  { distanceM: 42_195, label: '42K' },
];
