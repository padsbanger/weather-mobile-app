import assert from 'node:assert/strict';
import test from 'node:test';
import { boundsContain, LIGHTNING_WINDOW_MS, lightningAge, lightningUrl, parseLightning } from '../src/providers/dmiLightning.ts';

const now = Date.UTC(2026, 8, 23, 12);
const feature = (id: string, observed: string, coordinates: [number, number] = [18.3929, 54.8156]) => ({
  type: 'Feature', id, geometry: { type: 'Point', coordinates }, properties: { observed, type: 0, amp: -3.9 },
});
const source = (features: unknown[], more = false) => ({ type: 'FeatureCollection', features, links: more ? [{ rel: 'next' }] : [] });

test('DMI viewport query is bounded and requests observed points for the last hour', () => {
  const url = new URL(lightningUrl([18, 54, 19, 55]));
  assert.equal(url.hostname, 'opendataapi.dmi.dk');
  assert.equal(url.searchParams.get('period'), 'latest-hour');
  assert.equal(url.searchParams.get('bbox'), '18,54,19,55');
  assert.equal(url.searchParams.get('limit'), '500');
  assert.throws(() => lightningUrl([0, 0, 10, 10]));
  assert.equal(boundsContain([18, 54, 19, 55], [18.2, 54.2, 18.8, 54.8]), true);
  assert.equal(boundsContain([18, 54, 19, 55], [18.2, 54.2, 19.2, 54.8]), false);
});

test('parses and deduplicates actual DMI GeoJSON fields, sorting by occurrence time', () => {
  const older = feature('a', '2026-09-23T11:35:00.123000Z');
  const newer = feature('b', '2026-09-23T11:55:00.000000Z');
  const parsed = parseLightning(source([older, newer, older, feature('bad', 'no time')], true), now);
  assert.deepEqual(parsed.strikes.map(s => s.id), ['b', 'a']);
  assert.equal(parsed.strikes[0].observed, Date.UTC(2026, 8, 23, 11, 55));
  assert.equal(parsed.partial, false);
  assert.equal(parsed.rejected, 1);
  const limit = parseLightning(source(Array.from({ length: 500 }, (_, i) => feature(String(i), '2026-09-23T11:55:00Z')), true), now);
  assert.equal(limit.partial, true);
});

test('empty response is valid but invalid-only response and impossible points fail', () => {
  assert.deepEqual(parseLightning(source([]), now).strikes, []);
  assert.throws(() => parseLightning(source([feature('future', '2026-09-24T12:00:00Z')]), now));
  assert.throws(() => parseLightning(source([feature('bad', '2026-09-23T11:55:00Z', [181, 54])]), now));
  assert.throws(() => parseLightning({ features: [] }, now));
});

test('time filtering uses occurrence age, not fetch time', () => {
  assert.equal(lightningAge(now - 9 * 60_000, now), 0);
  assert.equal(lightningAge(now - 10 * 60_000, now), 1);
  assert.equal(lightningAge(now - 30 * 60_000, now), 2);
  assert.equal(lightningAge(now - LIGHTNING_WINDOW_MS, now), null);
  assert.equal(lightningAge(now + 1000, now), null);
});
