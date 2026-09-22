import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
// One tile in the initial Gdynia viewport, never a region scan or prefetch.
const url = 'https://tile.openstreetmap.org/9/282/163.png';
const response = await fetch(url, {
  headers: { 'User-Agent': 'WeatherRadarPersonal/0.1 (Android; pl.konta.weatherradar)' },
  signal: AbortSignal.timeout(15000),
});
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type') ?? '', /image\/png/);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(bytes.readUInt32BE(16), 256);
assert.equal(bytes.readUInt32BE(20), 256);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), url, status: response.status,
  bytes: bytes.length, dimensions: '256x256', cacheControl: response.headers.get('cache-control'),
  etag: response.headers.get('etag') }, null, 2));
