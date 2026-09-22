import { mkdir, writeFile } from 'node:fs/promises';
import { forecastUrl, parseForecast, parseSearch, searchUrl } from '../src/providers/openMeteo.ts';
await mkdir('artifacts', { recursive: true });
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}
const search = await get(searchUrl('Gdynia'));
const places = parseSearch(search);
if (!places.length) throw new Error('No real Gdynia search result');
const raw = await get(forecastUrl(places[0].center));
const forecast = parseForecast(raw);
if (!forecast.hours.length || !forecast.hours.some(h => h.time > Date.now())) throw new Error('No upcoming forecast');
await writeFile('artifacts/open-meteo-search.json', JSON.stringify(search, null, 2));
await writeFile('artifacts/open-meteo-forecast.json', JSON.stringify(raw, null, 2));
const evidence = { checkedAt: new Date().toISOString(), place: places[0], timezone: forecast.timezone, hours: forecast.hours.length, partial: forecast.partial, first: forecast.hours[0], last: forecast.hours.at(-1) };
await writeFile('artifacts/open-meteo-smoke.json', JSON.stringify(evidence, null, 2));
console.log(evidence);
