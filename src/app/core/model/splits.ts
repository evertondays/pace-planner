import { GradeCostModel, KmSplit, Segment } from './types';

/**
 * Groups segments by km and computes the target time of each km for a runner
 * holding the given flat-equivalent speed. The last km may be partial.
 */
export function groupByKm(
  segments: Segment[],
  flatSpeedMPerMin: number,
  model: GradeCostModel,
): KmSplit[] {
  const byKm = new Map<number, Segment[]>();
  for (const segment of segments) {
    const kmSegments = byKm.get(segment.kmIndex);
    if (kmSegments) {
      kmSegments.push(segment);
    } else {
      byKm.set(segment.kmIndex, [segment]);
    }
  }

  return [...byKm.entries()]
    .sort(([a], [b]) => a - b)
    .map(([kmIndex, kmSegments]) => {
      let distanceM = 0;
      let equivalentDistanceM = 0;
      let gainM = 0;
      let lossM = 0;
      for (const s of kmSegments) {
        const deltaM = s.grade * s.distanceM;
        distanceM += s.distanceM;
        equivalentDistanceM += s.distanceM * model.costMultiplier(s.grade);
        if (deltaM > 0) gainM += deltaM;
        else lossM -= deltaM;
      }
      const timeS = (equivalentDistanceM / flatSpeedMPerMin) * 60;
      return {
        km: kmIndex + 1,
        distanceM,
        timeS,
        paceSPerKm: timeS / (distanceM / 1000),
        gainM,
        lossM,
        averageGrade: (gainM - lossM) / distanceM,
      };
    });
}
