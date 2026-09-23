export const DMI_LIGHTNING_URL = 'https://opendataapi.dmi.dk/v2/lightningdata/collections/observation/items';
export const LIGHTNING_WINDOW_MS = 60 * 60_000;
export const LIGHTNING_STALE_MS = 10 * 60_000;
export const LIGHTNING_LIMIT = 500;

export type Bounds = [west: number, south: number, east: number, north: number];
export type LightningStrike = { id: string; coordinates: [number, number]; observed: number; type: 0 | 1 | 2 };
export type LightningFeed = { strikes: LightningStrike[]; partial: boolean; rejected: number };

export function validLightningBounds(bounds: Bounds): boolean {
  const [west, south, east, north] = bounds;
  return [west, south, east, north].every(Number.isFinite) && west >= -180 && east <= 180 &&
    south >= -90 && north <= 90 && west < east && south < north && east - west <= 5 && north - south <= 5;
}

export function lightningUrl(bounds: Bounds): string {
  if (!validLightningBounds(bounds)) throw new Error('Zoom in to request lightning for this view');
  const url = new URL(DMI_LIGHTNING_URL);
  url.searchParams.set('bbox', bounds.join(','));
  url.searchParams.set('period', 'latest-hour');
  url.searchParams.set('limit', String(LIGHTNING_LIMIT));
  url.searchParams.set('sortorder', 'observed,DESC');
  return url.toString();
}

export function parseLightning(raw: unknown, now = Date.now()): LightningFeed {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid lightning response');
  const source = raw as Record<string, unknown>;
  if (source.type !== 'FeatureCollection' || !Array.isArray(source.features) || !Array.isArray(source.links)) throw new Error('Invalid lightning collection');
  const strikes = new Map<string, LightningStrike>();
  let rejected = 0;
  for (const item of source.features) {
    if (!item || typeof item !== 'object') { rejected++; continue; }
    const feature = item as Record<string, unknown>;
    const geometry = feature.geometry as Record<string, unknown> | undefined;
    const props = feature.properties as Record<string, unknown> | undefined;
    const point = geometry?.coordinates;
    const time = typeof props?.observed === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(props.observed) ? Date.parse(props.observed) : NaN;
    const kind = props?.type;
    if (feature.type !== 'Feature' || typeof feature.id !== 'string' || !feature.id || geometry?.type !== 'Point' ||
      !Array.isArray(point) || point.length !== 2 || !point.every((v) => typeof v === 'number' && Number.isFinite(v)) ||
      point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90 || !Number.isFinite(time) ||
      time > now + 60_000 || time < now - LIGHTNING_WINDOW_MS - 60_000 || (kind !== 0 && kind !== 1 && kind !== 2)) {
      rejected++; continue;
    }
    strikes.set(feature.id, { id: feature.id, coordinates: [point[0], point[1]], observed: time, type: kind });
  }
  if (source.features.length > 0 && !strikes.size) throw new Error('No valid lightning observations');
  // DMI emits a `next` link for every nonempty page, even when following it
  // returns zero features. Reaching our own page limit is the honest signal.
  return { strikes: [...strikes.values()].sort((a, b) => b.observed - a.observed),
    partial: source.features.length >= LIGHTNING_LIMIT, rejected };
}

export function lightningAge(observed: number, now: number): 0 | 1 | 2 | null {
  const age = now - observed;
  return age >= 0 && age < 10 * 60_000 ? 0 : age >= 0 && age < 30 * 60_000 ? 1 : age >= 0 && age < LIGHTNING_WINDOW_MS ? 2 : null;
}

export function boundsContain(outer: Bounds | null, inner: Bounds | null): boolean {
  return !!outer && !!inner && outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];
}
