import counties from '../../providers/counties.json';

export type WarningArea = { code: string; name: string; region: string };
export const WARNING_AREAS: WarningArea[] = counties;
export function areaLabel(code: string) {
  if (code === '*') return 'All Poland';
  const area = WARNING_AREAS.find(a => a.code === code);
  return area ? `${area.name} · ${area.region}` : `County TERYT ${code}`;
}
export const validArea = (code: unknown): code is string => typeof code === 'string' && (code === '*' || WARNING_AREAS.some(a => a.code === code));
const normalize = (text: string) => text.toLocaleLowerCase('en').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
export function searchAreas(query: string) {
  const needle = normalize(query.trim());
  return WARNING_AREAS.filter(a => normalize(`${a.name} ${a.region} ${a.code}`).includes(needle));
}
