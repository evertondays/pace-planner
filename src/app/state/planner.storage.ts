import { DEFAULT_MODEL_CONFIG } from '../core/model/grade-cost';
import { ModelConfig } from '../core/model/types';
import { DEFAULT_PROFILE_CONFIG } from '../core/route/profile';
import { ElevationSource, ProfileConfig } from '../core/route/types';
import type { LoadedRoute, ReferenceInput } from './planner.store';

const SETTINGS_KEY = 'pace-planner:settings:v1';
const ROUTE_KEY = 'pace-planner:route:v1';

export interface StoredSettings {
  referenceInput: ReferenceInput;
  modelConfig: ModelConfig;
  profileConfig: ProfileConfig;
  elevationSource: ElevationSource;
}

/** Settings saved before the reference could be left empty. */
interface LegacySettings {
  referenceRace?: Partial<ReferenceInput>;
}

/** Compact route: points as [lat, lon, elevation?] tuples. */
interface StoredRoute {
  fileName: string;
  name?: string;
  points: ([number, number] | [number, number, number])[];
}

export function saveSettings(settings: StoredSettings): void {
  write(SETTINGS_KEY, settings);
}

export function loadSettings(): StoredSettings | null {
  const value = read<Partial<StoredSettings> & LegacySettings>(SETTINGS_KEY);
  if (!value) return null;
  const reference = value.referenceInput ?? value.referenceRace;

  return {
    referenceInput: {
      distanceM: positiveOrNull(reference?.distanceM),
      timeS: positiveOrNull(reference?.timeS),
    },
    modelConfig: { ...DEFAULT_MODEL_CONFIG, ...value.modelConfig },
    profileConfig: { ...DEFAULT_PROFILE_CONFIG, ...value.profileConfig },
    elevationSource: value.elevationSource === 'open-meteo' ? 'open-meteo' : 'gpx',
  };
}

export function saveRoute(route: LoadedRoute | null): void {
  if (!route) {
    remove(ROUTE_KEY);
    return;
  }
  const stored: StoredRoute = {
    fileName: route.fileName,
    name: route.name,
    points: route.points.map((p) => {
      const lat = round(p.lat, 6);
      const lon = round(p.lon, 6);
      return p.elevationM === undefined ? [lat, lon] : [lat, lon, round(p.elevationM, 1)];
    }),
  };
  write(ROUTE_KEY, stored);
}

export function loadStoredRoute(): LoadedRoute | null {
  const value = read<StoredRoute>(ROUTE_KEY);
  if (!value || !Array.isArray(value.points) || value.points.length < 2) return null;
  return {
    fileName: String(value.fileName),
    name: value.name,
    points: value.points.map(([lat, lon, elevationM]) =>
      elevationM === undefined ? { lat, lon } : { lat, lon, elevationM },
    ),
  };
}

function positiveOrNull(value: unknown): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// Storage may be unavailable (private mode, quota, disabled cookies): never fail the app.
function read<T>(key: string): T | null {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key}`, error);
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
