import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseWarnings, WARNINGS_URL, warningPhase } from '../src/providers/imgw.ts';

await mkdir('artifacts', { recursive: true });
const response = await fetch(WARNINGS_URL, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`IMGW HTTP ${response.status}`);
const raw = await response.json();
const feed = parseWarnings(raw);
const counties = JSON.parse(await readFile('src/providers/counties.json', 'utf8'));
const unknown = [...new Set(feed.warnings.flatMap(w => w.areas))].filter(code => !counties.some(c => c.code === code));
const now = Date.now();
const evidence = { checkedAt: new Date(now).toISOString(), count: feed.warnings.length, rejected: feed.rejected, unknownCountyCodes: unknown,
  warnings: feed.warnings.map(w => ({ id: w.id, severity: w.severity, areas: w.areas, startUTC: new Date(w.start).toISOString(), endUTC: new Date(w.end).toISOString(), phase: warningPhase(w, now), originalTextLength: w.text.length })) };
await writeFile('artifacts/imgw-live.json', JSON.stringify(raw, null, 2));
await writeFile('artifacts/imgw-smoke.json', JSON.stringify(evidence, null, 2));
console.log(evidence);
if (feed.rejected || unknown.length) throw new Error('Provider feed/catalogue needs review; see artifacts');
