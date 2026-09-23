export type ThemeMode = 'auto' | 'light' | 'dark';
export type ThemePreference = { mode: ThemeMode; lightStart: number; lightEnd: number };
export const DEFAULT_THEME: ThemePreference = { mode: 'auto', lightStart: 7, lightEnd: 19 };
export function parseThemePreference(input: unknown): ThemePreference {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return DEFAULT_THEME;
  const p = input as Record<string, unknown>;
  return (p.mode === 'auto' || p.mode === 'light' || p.mode === 'dark') &&
    Number.isInteger(p.lightStart) && Number.isInteger(p.lightEnd) &&
    Number(p.lightStart) >= 0 && Number(p.lightStart) <= 23 && Number(p.lightEnd) >= 0 && Number(p.lightEnd) <= 23 && p.lightStart !== p.lightEnd
    ? { mode: p.mode, lightStart: Number(p.lightStart), lightEnd: Number(p.lightEnd) } : DEFAULT_THEME;
}
export function resolveTheme(preference: ThemePreference, date: Date): 'light' | 'dark' {
  if (preference.mode !== 'auto') return preference.mode;
  const minute = date.getHours() * 60 + date.getMinutes();
  const start = preference.lightStart * 60, end = preference.lightEnd * 60;
  const light = start < end ? minute >= start && minute < end : minute >= start || minute < end;
  return light ? 'light' : 'dark';
}
export function nextThemeCheck(date: Date, preference: ThemePreference): number {
  if (preference.mode !== 'auto') return 30000;
  const candidates = [preference.lightStart, preference.lightEnd].flatMap(hour => [0, 1, 2].map(days => {
    const local = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, hour);
    return local.getTime() - date.getTime();
  })).filter(ms => ms > 0);
  return Math.max(1, Math.min(30000, ...candidates));
}
