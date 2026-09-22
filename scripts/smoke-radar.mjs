import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { writeFile, mkdir } from 'node:fs/promises';
import { parseRadarMetadata, RADAR_METADATA_URL, radarTiles } from '../src/providers/rainviewer.ts';

const response = await fetch(RADAR_METADATA_URL, { signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200);
const raw = await response.json();
const metadata = parseRadarMetadata(raw);
assert.ok(metadata.frames.length > 0, 'No past frames');
const frame = metadata.frames.at(-1);
// One actual tile containing Gdynia, using the live host/path and supported zoom 7.
const url = radarTiles(frame).replace('{z}', '7').replace('{x}', '70').replace('{y}', '40');
const tile = await fetch(url, { signal: AbortSignal.timeout(15000) });
assert.equal(tile.status, 200);
assert.match(tile.headers.get('content-type') ?? '', /image\/png/);
const bytes = Buffer.from(await tile.arrayBuffer());
assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(bytes.readUInt32BE(16), 256);
assert.equal(bytes.readUInt32BE(20), 256);
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/rainviewer-metadata.json', JSON.stringify(raw, null, 2));
await writeFile('artifacts/rainviewer-tile.png', bytes);
const result = { checkedAt: new Date().toISOString(), frameCount: metadata.frames.length,
  first: new Date(metadata.frames[0].time).toISOString(), last: new Date(frame.time).toISOString(),
  generatedAt: new Date(metadata.generatedAt).toISOString(), rejected: metadata.rejected,
  url, tileStatus: tile.status, bytes: bytes.length, dimensions: '256x256', cacheControl: tile.headers.get('cache-control') };
await writeFile('artifacts/rainviewer-smoke.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
