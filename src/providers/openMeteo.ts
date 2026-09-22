export type Place = { name: string; center: [number, number] };
export type Hour = { time: number; temperature: number | null; probability: number | null; precipitation: number | null; wind: number | null };
export type Forecast = { timezone: string; hours: Hour[]; partial: boolean };
export const FORECAST_TTL = 30 * 60 * 1000;
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid provider object');
  return v as Record<string, unknown>;
};
export function parsePlace(value: unknown): Place {
  const p = record(value);
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 240 || !Array.isArray(p.center) || p.center.length !== 2 ||
    !p.center.every(v => typeof v === 'number' && Number.isFinite(v)) || Math.abs(p.center[0]) > 180 || Math.abs(p.center[1]) > 85) throw new Error('Invalid place');
  return { name: p.name.trim(), center: [p.center[0], p.center[1]] };
}
export function parseSearch(value: unknown): Place[] {
  const raw = record(value);
  if (raw.error || (raw.results !== undefined && !Array.isArray(raw.results))) throw new Error('Invalid search');
  if (!raw.results) return [];
  return (raw.results as unknown[]).slice(0, 10).map(value => {
    const p = record(value);
    if (typeof p.name !== 'string') throw new Error('Missing place name');
    return parsePlace({ name: [p.name, p.admin1, p.country].filter(v => typeof v === 'string' && v).join(', '), center: [p.longitude, p.latitude] });
  });
}
export const locationKey = (center: [number, number]) => `${center[1].toFixed(2)},${center[0].toFixed(2)}`;
export function forecastUrl(center: [number, number]) {
  const [lat, lon] = locationKey(center).split(',');
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=auto&timeformat=unixtime&forecast_days=3`;
}
export const searchUrl = (query: string) => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;
export function parseForecast(value: unknown): Forecast {
  const raw = record(value), units = record(raw.hourly_units), hourly = record(raw.hourly);
  if (raw.error || typeof raw.timezone !== 'string') throw new Error('Invalid forecast');
  new Intl.DateTimeFormat('en-GB', { timeZone: raw.timezone }).format(0);
  const expected = { time: 'unixtime', temperature_2m: '°C', precipitation_probability: '%', precipitation: 'mm', wind_speed_10m: 'km/h' };
  for (const [key, unit] of Object.entries(expected)) if (units[key] !== unit || !Array.isArray(hourly[key])) throw new Error('Unexpected forecast units/arrays');
  const times = hourly.time as unknown[];
  if (times.length > 100 || Object.keys(expected).some(key => (hourly[key] as unknown[]).length !== times.length)) throw new Error('Invalid hourly lengths');
  let partial = false;
  const metric = (key: string, i: number, min: number, max: number) => {
    const v = (hourly[key] as unknown[])[i];
    if (v === null) { partial = true; return null; }
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error('Invalid forecast value');
    return v;
  };
  const hours = times.map((time, i) => {
    if (typeof time !== 'number' || !Number.isSafeInteger(time) || time < 1577836800 || time > 4102444800 || (i > 0 && time !== Number(times[i - 1]) + 3600)) throw new Error('Invalid hourly timestamp');
    return { time: time * 1000, temperature: metric('temperature_2m', i, -100, 70), probability: metric('precipitation_probability', i, 0, 100), precipitation: metric('precipitation', i, 0, 2000), wind: metric('wind_speed_10m', i, 0, 500) };
  });
  return { timezone: raw.timezone, hours, partial };
}
export const forecastStale = (fetchedAt: number, now: number) => now < fetchedAt || now - fetchedAt >= FORECAST_TTL;
export const upcomingHours = (forecast: Forecast, now: number) => forecast.hours.filter(h => h.time >= Math.ceil(now / 3600000) * 3600000).slice(0, 24);
export function hourLabel(time: number, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(time);
}
export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 200000) throw new Error('Provider response too large');
  return JSON.parse(text);
}
