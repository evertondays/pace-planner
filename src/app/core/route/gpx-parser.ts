import { GpsPoint, ParsedGpx } from './types';

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

/**
 * Reads track points (`trkpt`), falling back to route points (`rtept`).
 * Tag lookups ignore namespaces, so GPX 1.0 and 1.1 files both work.
 */
export function parseGpx(xml: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new GpxParseError('Invalid XML');
  }
  if (doc.documentElement.localName !== 'gpx') {
    throw new GpxParseError('Root element is not <gpx>');
  }

  let nodes = byTag(doc, 'trkpt');
  if (nodes.length === 0) nodes = byTag(doc, 'rtept');

  const points: GpsPoint[] = [];
  for (const node of nodes) {
    const lat = Number(node.getAttribute('lat'));
    const lon = Number(node.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const eleText = byTag(node, 'ele')[0]?.textContent?.trim();
    const elevationM = eleText ? Number(eleText) : NaN;
    points.push(Number.isFinite(elevationM) ? { lat, lon, elevationM } : { lat, lon });
  }

  const name = [...byTag(doc, 'name')]
    .find((el) => ['metadata', 'trk', 'rte'].includes(el.parentElement?.localName ?? ''))
    ?.textContent?.trim();

  return { name: name || undefined, points };
}

function byTag(root: Document | Element, localName: string): Element[] {
  return [...root.getElementsByTagNameNS('*', localName)];
}
