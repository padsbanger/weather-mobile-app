const endpoint = new URL('https://opendataapi.dmi.dk/v2/lightningdata/collections/observation/items');
endpoint.searchParams.set('bbox', '18,54,19,55');
endpoint.searchParams.set('period', 'latest-month');
endpoint.searchParams.set('limit', '3');
endpoint.searchParams.set('sortorder', 'observed,DESC');
const response = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`DMI HTTP ${response.status}`);
const raw = await response.json();
if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Unexpected DMI schema');
for (const strike of raw.features) {
  const [lon, lat] = strike.geometry?.coordinates ?? [];
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < 18 || lon > 19 || lat < 54 || lat > 55 ||
      !Number.isFinite(Date.parse(strike.properties?.observed))) throw new Error('Invalid DMI observation');
}
console.log(JSON.stringify({ source: endpoint.origin, numberReturned: raw.numberReturned, checkedPoints: raw.features.length,
  newestObservedUtc: raw.features[0]?.properties?.observed ?? null, pageLimitReached: raw.features.length >= 3 }));
