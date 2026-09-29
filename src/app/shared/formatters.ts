import { DistanceUnit, UNIT_LENGTH_M } from '../core/model/units';

/**
 * Conversion from model units (meters, seconds, grade fractions, pace per km) to
 * display text, in the app locale and the user's distance unit.
 */

const MINUS = '−';
let numberLocale = 'pt-BR';

/** Sets the locale for number formatting (decimal comma or point). Called once at startup. */
export function setNumberLocale(locale: string): void {
  numberLocale = locale;
}

/** 5400 → "1:30:00"; 1245 → "20:45". */
export function formatDuration(timeS: number): string {
  const total = Math.round(timeS);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Pace in m:ss per unit: 256 s/km → "4:16" (km) or "6:52" (mi). */
export function formatPace(paceSPerKm: number, unit: DistanceUnit = 'km'): string {
  const total = Math.round(toPerUnit(paceSPerKm, unit));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** Signed pace difference per unit, e.g. "+0:12" or "−0:08". */
export function formatSignedPace(deltaSPerKm: number, unit: DistanceUnit = 'km'): string {
  return formatSignedDuration(toPerUnit(deltaSPerKm, unit));
}

/** Signed difference in m:ss, e.g. "+0:12" or "−1:05:30". Zero is "0:00". */
export function formatSignedDuration(deltaS: number): string {
  const rounded = Math.round(deltaS);
  if (rounded === 0) return '0:00';
  return `${rounded > 0 ? '+' : MINUS}${formatDuration(Math.abs(rounded))}`;
}

/** 21097.5 m → "21,1" (km) or "13,1" (mi). */
export function formatDistance(
  distanceM: number,
  unit: DistanceUnit = 'km',
  fractionDigits = 1,
): string {
  return formatNumber(distanceM / UNIT_LENGTH_M[unit], fractionDigits);
}

/** "km" or "mi". */
export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit;
}

/** "min/km" or "min/mi". */
export function paceUnitLabel(unit: DistanceUnit): string {
  return `min/${unit}`;
}

/** 0.023 → "+2,3%"; -0.01 → "−1,0%". */
export function formatGrade(grade: number, fractionDigits = 1): string {
  const percent = grade * 100;
  const text = formatNumber(Math.abs(percent), fractionDigits);
  if (Number(percent.toFixed(fractionDigits)) === 0) return `${formatNumber(0, fractionDigits)}%`;
  return `${percent > 0 ? '+' : MINUS}${text}%`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString(numberLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Up to `maxFractionDigits`, without trailing zeros: 21.0975 → "21,0975"; 10 → "10". */
export function formatDecimal(value: number, maxFractionDigits = 4): string {
  return value.toLocaleString(numberLocale, {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  });
}

/** Longest time the mask accepts: 6 digits, up to 99:59:59. */
const MAX_TIME_DIGITS = 6;

/** Digits of a typed or pasted time, without leading zeros: "01:30:00" → "13000". */
export function timeDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_TIME_DIGITS);
}

/**
 * Stopwatch-style mask: digits fill from the right, so typing 1-3-0-0-0 shows
 * "1", "13", "1:30", "13:00", then "1:30:00".
 */
export function formatTimeDigits(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}

/**
 * Parses "h:mm:ss" or "mm:ss" into seconds. Returns null for anything else,
 * including minutes or seconds above 59 in the lower positions.
 */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;

  const numbers = parts.map(Number);
  const [s, m, h = 0] = numbers.reverse();
  if (s > 59 || (parts.length === 3 && m > 59)) return null;
  const timeS = h * 3600 + m * 60 + s;
  return timeS > 0 ? timeS : null;
}

/** Parses a decimal with comma or point ("21,1" or "21.1"). Returns null if invalid. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function toPerUnit(secondsPerKm: number, unit: DistanceUnit): number {
  return (secondsPerKm * UNIT_LENGTH_M[unit]) / 1000;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
