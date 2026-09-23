export const WARNINGS_URL = 'https://danepubliczne.imgw.pl/api/data/warningsmeteo';
export const WARNINGS_REFRESH = 5 * 60 * 1000;
export const WARNINGS_STALE = 15 * 60 * 1000;
export const WARNING_TIMEZONE = 'Europe/Warsaw';
export type WeatherWarning = {
  id: string; event: string; severity: 1 | 2 | 3; probability: number | null;
  start: number; end: number; published: number; ambiguousTime: boolean;
  text: string; comment: string; office: string; areas: string[];
};
export type WarningFeed = { warnings: WeatherWarning[]; rejected: number };
const civil = new Intl.DateTimeFormat('en-GB', { timeZone: WARNING_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
// IMGW's offset-less times match the official Polish civil-time bulletin.
// Match candidates in Warsaw rather than using the device timezone or guessing DST.
export function warningTime(value: unknown): number[] {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) throw new Error('Invalid warning date');
  const [year, month, day, hour, minute, second] = value.split(/[- :]/).map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const candidates = [naive - 7200000, naive - 3600000].filter(time => {
    const p = Object.fromEntries(civil.formatToParts(time).map(p => [p.type, p.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}` === value;
  });
  if (!candidates.length) throw new Error('Invalid or nonexistent Warsaw time');
  return candidates;
}
function string(value: unknown, max = 20000) {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid warning text');
  return value;
}
function required(value: unknown, max = 20000) { const result = string(value, max); if (!result.trim()) throw new Error('Missing warning text'); return result; }
function parseWarning(value: unknown): WeatherWarning {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid warning');
  const w = value as Record<string, unknown>;
  const id = required(w.id, 100);
  if (!/^[\w-]+$/.test(id) || !['1', '2', '3', 1, 2, 3].includes(w.stopien as string)) throw new Error('Invalid identity/severity');
  const starts = warningTime(w.obowiazuje_od), ends = warningTime(w.obowiazuje_do), issued = warningTime(w.opublikowano);
  const start = starts[0], end = ends[ends.length - 1], published = issued[0];
  if (end <= start) throw new Error('Invalid validity interval');
  if (!Array.isArray(w.teryt) || !w.teryt.length || w.teryt.length > 500 || !w.teryt.every(code => typeof code === 'string' && /^\d{4}$/.test(code))) throw new Error('Invalid warning areas');
  let probability: number | null = null;
  if (w.prawdopodobienstwo !== null && w.prawdopodobienstwo !== undefined && w.prawdopodobienstwo !== '') {
    if (!/^(100|\d{1,2})$/.test(String(w.prawdopodobienstwo))) throw new Error('Invalid probability');
    probability = Number(w.prawdopodobienstwo);
  }
  return { id, event: required(w.nazwa_zdarzenia, 500), severity: Number(w.stopien) as 1 | 2 | 3, probability,
    start, end, published, ambiguousTime: starts.length > 1 || ends.length > 1 || issued.length > 1,
    text: required(w.tresc), comment: w.komentarz == null ? '' : string(w.komentarz), office: required(w.biuro, 1000), areas: [...new Set(w.teryt as string[])] };
}
export function parseWarnings(value: unknown): WarningFeed {
  if (!Array.isArray(value) || value.length > 2000) throw new Error('Invalid warning feed');
  const byId = new Map<string, WeatherWarning>();
  let rejected = 0;
  for (const item of value) {
    let warning: WeatherWarning;
    try { warning = parseWarning(item); } catch { rejected++; continue; }
    const old = byId.get(warning.id);
    if (!old || old.published < warning.published) byId.set(warning.id, warning);
    else if (old.published === warning.published && JSON.stringify(old) !== JSON.stringify(warning)) throw new Error('Conflicting warning versions');
  }
  if (value.length && !byId.size) throw new Error('No valid warning records');
  return { warnings: [...byId.values()].sort((a, b) => b.severity - a.severity || a.start - b.start || a.id.localeCompare(b.id)), rejected };
}
export const warningPhase = (warning: WeatherWarning, now: number) => now >= warning.end ? 'expired' : now < warning.start ? 'upcoming' : 'active';
export const warningsStale = (fetchedAt: number, now: number) => fetchedAt > now || now - fetchedAt >= WARNINGS_STALE;
export function warningsForArea(feed: WarningFeed | null, area: string | null) {
  return !area ? [] : (feed?.warnings ?? []).filter(w => area === '*' || w.areas.includes(area));
}
export function warningSummary(feed: WarningFeed | null, area: string | null, now: number, fetchedAt: number, offline: boolean, failed: boolean) {
  if (!area) return 'Choose a warning area';
  const current = warningsForArea(feed, area).filter(w => warningPhase(w, now) === 'active');
  const upcoming = warningsForArea(feed, area).filter(w => warningPhase(w, now) === 'upcoming');
  const uncertain = offline || failed || !feed || !!feed.rejected || warningsStale(fetchedAt, now);
  if (current.length) return `${uncertain ? 'Saved' : 'Active'} warnings: ${current.length} · Level ${Math.max(...current.map(w => w.severity))}`;
  if (uncertain) return 'Current warning status unavailable';
  if (upcoming.length) return `Upcoming warnings: ${upcoming.length}`;
  return 'No active warnings in latest feed';
}
export const warningDate = (time: number) => new Intl.DateTimeFormat('en-GB', { timeZone: WARNING_TIMEZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(time);
