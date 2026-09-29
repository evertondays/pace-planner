import { GradeCostModel, Segment, Split } from './types';

/** A last split shorter than this is merged into the previous one. */
const MIN_LAST_SPLIT_M = 5;

interface SplitTotals {
  startM: number;
  distanceM: number;
  equivalentDistanceM: number;
  climbM: number; // signed elevation change
  gainM: number;
  lossM: number;
}

/**
 * Cuts the route into splits of `splitLengthM` (1000 for km, 1609.344 for miles)
 * and computes the target time of each for a runner holding the given
 * flat-equivalent speed. Segments that cross a split boundary are divided at it,
 * so any split length works on any grid. The last split may be partial.
 */
export function groupBySplits(
  segments: Segment[],
  flatSpeedMPerMin: number,
  model: GradeCostModel,
  splitLengthM = 1000,
): Split[] {
  const totals: SplitTotals[] = [];

  for (const segment of segments) {
    const multiplier = model.costMultiplier(segment.grade);
    let startM = segment.startM;
    let remainingM = segment.distanceM;

    while (remainingM > 1e-6) {
      const index = Math.floor(startM / splitLengthM + 1e-9);
      const pieceM = Math.min(remainingM, (index + 1) * splitLengthM - startM);
      const split = (totals[index] ??= {
        startM: index * splitLengthM,
        distanceM: 0,
        equivalentDistanceM: 0,
        climbM: 0,
        gainM: 0,
        lossM: 0,
      });
      const deltaM = segment.grade * pieceM;
      split.distanceM += pieceM;
      split.equivalentDistanceM += pieceM * multiplier;
      split.climbM += deltaM;
      if (deltaM > 0) split.gainM += deltaM;
      else split.lossM -= deltaM;

      startM += pieceM;
      remainingM -= pieceM;
    }
  }

  const merged = totals.filter(Boolean);
  const last = merged[merged.length - 1];
  if (merged.length > 1 && last.distanceM < MIN_LAST_SPLIT_M) {
    merged.pop();
    const previous = merged[merged.length - 1];
    previous.distanceM += last.distanceM;
    previous.equivalentDistanceM += last.equivalentDistanceM;
    previous.climbM += last.climbM;
    previous.gainM += last.gainM;
    previous.lossM += last.lossM;
  }

  return merged.map((t, i) => {
    const timeS = (t.equivalentDistanceM / flatSpeedMPerMin) * 60;
    return {
      index: i + 1,
      startM: t.startM,
      distanceM: t.distanceM,
      timeS,
      paceSPerKm: timeS / (t.distanceM / 1000),
      gainM: t.gainM,
      lossM: t.lossM,
      averageGrade: t.climbM / t.distanceM,
    };
  });
}
