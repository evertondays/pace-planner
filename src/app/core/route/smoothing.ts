/**
 * Centered moving average over `windowPoints` samples. Near the ends the window
 * shrinks symmetrically, so a straight ramp stays exactly straight.
 */
export function movingAverage(values: number[], windowPoints: number): number[] {
  const halfWidth = Math.max(0, Math.floor(windowPoints / 2));
  const n = values.length;
  const prefix = new Array<number>(n + 1);
  prefix[0] = 0;
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + values[i];

  return values.map((_, i) => {
    const h = Math.min(halfWidth, i, n - 1 - i);
    return (prefix[i + h + 1] - prefix[i - h]) / (2 * h + 1);
  });
}
