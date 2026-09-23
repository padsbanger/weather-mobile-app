import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseWarnings, warningDate, warningPhase, warningSummary, warningTime, warningsForArea, warningsStale, type WarningFeed } from '../src/providers/imgw.ts';

// Synthetic unit-test bulletin; never supplied to the live app.
const fixture = () => ({ id: 'test-warning', nazwa_zdarzenia: 'Test event', stopien: '2', prawdopodobienstwo: '80',
  obowiazuje_od: '2026-09-22 18:00:00', obowiazuje_do: '2026-09-22 20:00:00', opublikowano: '2026-09-22 12:00:00',
  tresc: 'Original source wording.\nSecond paragraph.', komentarz: 'Original comment.', biuro: 'Test office', teryt: ['2262'] });
test('IMGW live schema normalizes severity/probability and preserves original source text and county identifiers', () => {
  const input = fixture(), result = parseWarnings([input]);
  assert.equal(result.rejected, 0);
  assert.equal(result.warnings[0].severity, 2);
  assert.equal(result.warnings[0].probability, 80);
  assert.equal(result.warnings[0].text, input.tresc);
  assert.equal(result.warnings[0].start, Date.UTC(2026, 8, 22, 16));
  assert.equal(warningsForArea(result, '2262').length, 1);
  assert.equal(warningsForArea(result, '2261').length, 0);
  assert.equal(warningsForArea(result, null).length, 0);
  assert.equal(warningsForArea(result, '*').length, 1);
  assert.match(warningDate(result.warnings[0].start), /18:00/);
});
test('Warsaw timestamps are device-zone independent and handle DST ambiguity without early expiry', () => {
  assert.deepEqual(warningTime('2026-01-22 18:00:00'), [Date.UTC(2026, 0, 22, 17)]);
  assert.deepEqual(warningTime('2026-10-25 02:30:00'), [Date.UTC(2026, 9, 25, 0, 30), Date.UTC(2026, 9, 25, 1, 30)]);
  const w = parseWarnings([{ ...fixture(), obowiazuje_od: '2026-10-25 02:00:00', obowiazuje_do: '2026-10-25 02:30:00' }]).warnings[0];
  assert.equal(w.ambiguousTime, true);
  assert.equal(w.start, Date.UTC(2026, 9, 25, 0));
  assert.equal(w.end, Date.UTC(2026, 9, 25, 1, 30));
  for (const invalid of ['2026-03-29 02:30:00', '2026-02-30 12:00:00', '2026-09-22T12:00:00Z', '2026-09-22 24:00:00', null]) assert.throws(() => warningTime(invalid));
});
test('warning phases change at exact validity boundaries, including background time jumps', () => {
  const w = parseWarnings([fixture()]).warnings[0];
  assert.equal(warningPhase(w, w.start - 1), 'upcoming');
  assert.equal(warningPhase(w, w.start), 'active');
  assert.equal(warningPhase(w, w.end - 1), 'active');
  assert.equal(warningPhase(w, w.end), 'expired');
  assert.equal(warningPhase(w, w.end + 86400000), 'expired');
});
test('rejects invalid payloads, flags partial records, and distinguishes a successful empty feed', () => {
  assert.deepEqual(parseWarnings([]), { warnings: [], rejected: 0 });
  for (const input of [null, {}, { error: true }, [{ ...fixture(), stopien: '4' }], [{ ...fixture(), teryt: ['22'] }], [{ ...fixture(), prawdopodobienstwo: '101' }], [{ ...fixture(), obowiazuje_do: fixture().obowiazuje_od }]]) assert.throws(() => parseWarnings(input));
  const partial = parseWarnings([fixture(), { ...fixture(), id: 'bad', tresc: null }]);
  assert.equal(partial.warnings.length, 1); assert.equal(partial.rejected, 1);
  assert.equal(parseWarnings([{ ...fixture(), prawdopodobienstwo: null }]).warnings[0].probability, null);
});
test('deduplicates IDs, keeps newer revisions, rejects contradictory same-version records', () => {
  assert.equal(parseWarnings([fixture(), fixture()]).warnings.length, 1);
  const revised = { ...fixture(), opublikowano: '2026-09-22 13:00:00', stopien: '3' };
  assert.equal(parseWarnings([revised, fixture()]).warnings[0].severity, 3);
  assert.throws(() => parseWarnings([fixture(), { ...fixture(), stopien: '3' }]));
});
test('no all-clear from offline, failed, stale, partial, or missing data; withdrawn records leave the list', () => {
  const now = Date.UTC(2026, 8, 22, 17), empty = parseWarnings([]);
  assert.equal(warningSummary(empty, '2262', now, now, false, false), 'No active warnings in latest feed');
  const cases: [WarningFeed | null, number, boolean, boolean][] = [[empty, now, true, false], [empty, now, false, true], [empty, now - 900000, false, false], [{ warnings: [], rejected: 1 }, now, false, false], [null, now, false, false]];
  for (const [feed, at, offline, failed] of cases) {
    assert.equal(warningSummary(feed, '2262', now, at, offline, failed), 'Current warning status unavailable');
  }
  assert.match(warningSummary(parseWarnings([fixture()]), '2262', now, now, true, false), /^Saved warnings: 1/);
  assert.equal(warningsForArea(empty, '2262').length, 0);
  assert.equal(warningsStale(now, now + 899999), false);
  assert.equal(warningsStale(now, now + 900000), true);
  assert.equal(warningsStale(now, now - 1), true);
});
test('bundled GUS catalogue has 380 unique county codes and distinguishes city counties', () => {
  const counties = JSON.parse(readFileSync(new URL('../src/providers/counties.json', import.meta.url), 'utf8')) as { code: string; name: string }[];
  assert.equal(counties.length, 380); assert.equal(new Set(counties.map(c => c.code)).size, 380);
  assert.equal(counties.find(c => c.code === '2262')?.name, 'Gdynia (city)');
  assert.equal(counties.find(c => c.code === '1217')?.name, 'tatrzański county');
  assert.ok(counties.every(c => /^\d{4}$/.test(c.code)));
});
