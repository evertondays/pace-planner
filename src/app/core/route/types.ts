import { Segment } from '../model/types';

// Raw GPX input
export interface GpsPoint {
  lat: number;
  lon: number;
  elevationM?: number; // missing in route GPX files without elevation
}

export interface ParsedGpx {
  name?: string;
  points: GpsPoint[];
}

// Point of the fixed-step grid, before smoothing
export interface GridPoint extends GpsPoint {
  distanceM: number; // cumulative from the start line
}

export interface RouteGrid {
  points: GridPoint[];
  /** Official distance / measured distance; 1 when no official distance is given. */
  distanceScale: number;
  hasElevation: boolean;
}

// Resampled and smoothed profile
export interface ProfilePoint {
  distanceM: number; // cumulative from the start line
  lat: number;
  lon: number;
  elevationM: number; // already smoothed
}

export interface ProfileSummary {
  totalDistanceM: number;
  gainM: number; // D+
  lossM: number; // D-
  minElevationM: number;
  maxElevationM: number;
}

export interface Profile {
  points: ProfilePoint[];
  segments: Segment[];
  summary: ProfileSummary;
}

export type ElevationSource = 'gpx' | 'open-meteo';

export interface ProfileConfig {
  stepM: number; // default 20
  smoothingWindowM: number; // default 100
  gradeWindowM: number; // default 60
  officialDistanceM?: number;
}
