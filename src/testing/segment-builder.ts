import { Segment } from '../app/core/model/types';

export interface RoutePart {
  distanceM: number;
  grade: number;
}

/** Builds a fixed-step segment grid from constant-grade parts of a route. */
export function buildSegments(parts: RoutePart[], stepM = 20): Segment[] {
  const segments: Segment[] = [];
  let startM = 0;
  for (const part of parts) {
    const endM = startM + part.distanceM;
    while (startM < endM - 1e-9) {
      const distanceM = Math.min(stepM, endM - startM);
      segments.push({ startM, distanceM, grade: part.grade, kmIndex: Math.floor(startM / 1000) });
      startM += distanceM;
    }
  }
  return segments;
}

export function flatRoute(distanceM: number): Segment[] {
  return buildSegments([{ distanceM, grade: 0 }]);
}
