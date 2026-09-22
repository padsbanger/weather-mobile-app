export const RADAR_METADATA_URL = 'https://api.rainviewer.com/public/weather-maps.json';
export const RADAR_REFRESH_MS = 5 * 60_000;
export const RADAR_STALE_MS = 20 * 60_000;
export const RADAR_SOURCE_ZOOM = 7;
export type RadarFrame = { time: number; path: string; host: string };
export type RadarMetadata = { frames: RadarFrame[]; generatedAt: number; rejected: number };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid radar metadata');
  return value as Record<string, unknown>;
}
function timestamp(value: unknown, now: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1577836800 || value * 1000 > now + 300_000) {
    throw new Error('Invalid radar timestamp');
  }
  return value * 1000;
}
export function parseRadarMetadata(value: unknown, now = Date.now()): RadarMetadata {
  const root = record(value);
  if (typeof root.version !== 'string' || !root.version.startsWith('2.')) throw new Error('Unsupported radar schema');
  const host = new URL(String(root.host));
  if (host.protocol !== 'https:' || !/(^|\.)rainviewer\.com$/.test(host.hostname) || host.port ||
    host.username || host.password || host.pathname !== '/' || host.search || host.hash) throw new Error('Invalid radar host');
  const generatedAt = timestamp(root.generated, now);
  const past = record(root.radar).past;
  if (!Array.isArray(past) || past.length > 100) throw new Error('Invalid radar history');
  const times = new Map<number, RadarFrame>();
  const paths = new Set<string>();
  let rejected = 0;
  for (const item of past) {
    try {
      const frame = record(item);
      const time = timestamp(frame.time, now);
      if (typeof frame.path !== 'string' || !/^\/v2\/radar\/[a-zA-Z0-9_-]{1,100}$/.test(frame.path)) throw new Error('Invalid frame path');
      if (times.has(time) || paths.has(frame.path)) continue;
      times.set(time, { time, path: frame.path, host: host.origin });
      paths.add(frame.path);
    } catch { rejected++; }
  }
  if (past.length && !times.size) throw new Error('No valid radar frames');
  return { frames: [...times.values()].sort((a, b) => a.time - b.time), generatedAt, rejected };
}
export function frameKey(frame: RadarFrame): string { return `${frame.host}${frame.path}`; }
export function radarTiles(frame: RadarFrame): string {
  // Universal Blue; smoothing on; snow recoloring off. Never synthesize a frame path.
  return `${frameKey(frame)}/256/{z}/{x}/{y}/2/1_0.png`;
}
export function isStale(time: number, now: number, threshold = RADAR_STALE_MS): boolean {
  return now - time >= threshold || time > now + 300_000;
}
export function retryDelay(attempt: number): number { return Math.min(300_000, 15_000 * 2 ** Math.min(attempt, 5)); }
export function formatFrameTime(time: number): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(time);
}
export function formatFrameDate(time: number): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).format(time);
}

// Exact Universal Blue rain entries from the provider's color table (dBZ, not mm/h).
// https://www.rainviewer.com/files/rainviewer_api_colors_table.csv
export const RADAR_LEGEND = [
  { dbz: 15, color: '#88ddee' }, { dbz: 20, color: '#00a3e0' },
  { dbz: 30, color: '#005588' }, { dbz: 35, color: '#ffee00' },
  { dbz: 40, color: '#ffaa00' }, { dbz: 45, color: '#ff4400' },
  { dbz: 50, color: '#c10000' },
] as const;
