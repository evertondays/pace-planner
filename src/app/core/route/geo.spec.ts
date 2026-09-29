import { cumulativeDistancesM, haversineM } from './geo';

describe('geo', () => {
  it('measures Paris to London within 0.5%', () => {
    const paris = { lat: 48.8566, lon: 2.3522 };
    const london = { lat: 51.5074, lon: -0.1278 };
    const expectedM = 343_560;

    expect(Math.abs(haversineM(paris, london) - expectedM) / expectedM).toBeLessThan(0.005);
  });

  it('measures one degree of latitude as ~111.2 km', () => {
    expect(haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -1);
  });

  it('accumulates distances from the first point', () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 0.001, lon: 0 },
      { lat: 0.001, lon: 0 },
      { lat: 0.002, lon: 0 },
    ];
    const distancesM = cumulativeDistancesM(points);

    expect(distancesM[0]).toBe(0);
    expect(distancesM[2]).toBe(distancesM[1]);
    expect(distancesM[3]).toBeCloseTo(2 * distancesM[1], 6);
  });
});
