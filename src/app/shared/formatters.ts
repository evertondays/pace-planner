/**
 * Conversion from model units (meters, seconds, grade fractions) to display text.
 * Numbers follow pt-BR conventions (decimal comma).
 */

const LOCALE = 'pt-BR';
const MINUS = '−';

/** 5400 → "1:30:00"; 1245 → "20:45". */
export function formatDuration(timeS: number): string {
  const total = Math.round(timeS);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 256 → "4:16" (per km). */
export function formatPace(paceSPerKm: number): string {
  const total = Math.round(paceSPerKm);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** Signed difference in m:ss, e.g. "+0:12" or "−1:05:30". Zero is "0:00". */
export function formatSignedDuration(deltaS: number): string {
  const rounded = Math.round(deltaS);
  if (rounded === 0) return '0:00';
  return `${rounded > 0 ? '+' : MINUS}${formatDuration(Math.abs(rounded))}`;
}

/** 21097.5 → "21,1" (km). */
export function formatDistanceKm(distanceM: number, fractionDigits = 1): string {
  return formatNumber(distanceM / 1000, fractionDigits);
}

/** 0.023 → "+2,3%"; -0.01 → "−1,0%". */
export function formatGrade(grade: number, fractionDigits = 1): string {
  const percent = grade * 100;
  const text = formatNumber(Math.abs(percent), fractionDigits);
  if (Number(percent.toFixed(fractionDigits)) === 0) return `${formatNumber(0, fractionDigits)}%`;
  return `${percent > 0 ? '+' : MINUS}${text}%`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Up to `maxFractionDigits`, without trailing zeros: 21.0975 → "21,0975"; 10 → "10". */
export function formatDecimal(value: number, maxFractionDigits = 4): string {
  return value.toLocaleString(LOCALE, {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  });
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

/** Parses a pt-BR or en decimal ("21,1" or "21.1"). Returns null if invalid. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
