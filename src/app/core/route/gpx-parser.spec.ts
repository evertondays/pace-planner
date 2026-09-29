import { toGpx } from '../../../testing/gpx-builder';
import { GpxParseError, parseGpx } from './gpx-parser';

describe('parseGpx', () => {
  it('reads track points with elevation and the track name', () => {
    const xml = toGpx(
      [
        { lat: -23.5, lon: -46.6, elevationM: 760 },
        { lat: -23.501, lon: -46.6, elevationM: 762.5 },
      ],
      { name: 'Meia de SP' },
    );

    expect(parseGpx(xml)).toEqual({
      name: 'Meia de SP',
      points: [
        { lat: -23.5, lon: -46.6, elevationM: 760 },
        { lat: -23.501, lon: -46.6, elevationM: 762.5 },
      ],
    });
  });

  it('falls back to route points', () => {
    const xml = toGpx([{ lat: 1, lon: 2 }], { pointTag: 'rtept' });
    expect(parseGpx(xml).points).toEqual([{ lat: 1, lon: 2 }]);
  });

  it('leaves elevation undefined when the file has none', () => {
    const xml = toGpx([{ lat: 1, lon: 2 }]);
    expect(parseGpx(xml).points[0].elevationM).toBeUndefined();
  });

  it('works without a namespace (GPX 1.0 style)', () => {
    const xml =
      '<gpx><trk><trkseg><trkpt lat="1" lon="2"><ele>5</ele></trkpt></trkseg></trk></gpx>';
    expect(parseGpx(xml).points).toEqual([{ lat: 1, lon: 2, elevationM: 5 }]);
  });

  it('rejects invalid XML and non-GPX documents', () => {
    expect(() => parseGpx('<gpx><trk>')).toThrow(GpxParseError);
    expect(() => parseGpx('<kml></kml>')).toThrow(GpxParseError);
  });
});
