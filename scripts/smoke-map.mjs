import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';

// One Gdynia-area tile and the resources required by the light vector style.
const styleUrl = 'https://tiles.openfreemap.org/styles/positron';
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${url}: ${response.status}`);
  return response;
}
const style = await (await get(styleUrl)).json();
const bundled = JSON.parse(readFileSync(new URL('../src/providers/styles/positron.json', import.meta.url), 'utf8'));
const dark = JSON.parse(readFileSync(new URL('../src/providers/styles/dark.json', import.meta.url), 'utf8'));
assert.equal(style.version, 8);
assert.equal(bundled.layers.find(layer => layer.id === 'radar-label-anchor')?.type, 'background');
assert.ok(bundled.layers.findIndex(layer => layer.id === 'radar-label-anchor') < bundled.layers.findIndex(layer => layer.id === 'label_city'));
assert.equal(dark.layers.find(layer => layer.id === 'radar-label-anchor')?.type, 'background');
assert.ok(dark.layers.findIndex(layer => layer.id === 'radar-label-anchor') < dark.layers.findIndex(layer => layer.id === 'place_city'));
assert.equal(bundled.sources.openmaptiles.url, style.sources.openmaptiles.url);
assert.ok(style.layers.some(layer => layer.id === 'waterway_line_label' && layer.type === 'symbol'));
assert.ok(style.layers.some(layer => layer.id === 'label_city' && layer.type === 'symbol'));
const source = style.sources.openmaptiles;
assert.equal(source.type, 'vector');
const tileJson = await (await get(source.url)).json();
assert.match(tileJson.attribution, /OpenStreetMap/);
const tileUrl = tileJson.tiles[0].replace('{z}', '7').replace('{x}', '70').replace('{y}', '40');
const tile = new Uint8Array(await (await get(tileUrl)).arrayBuffer());
assert.ok(tile.length > 1000, 'Vector tile is unexpectedly small');
const glyphUrl = style.glyphs.replace('{fontstack}', encodeURIComponent('Noto Sans Regular')).replace('{range}', '0-255');
const glyph = new Uint8Array(await (await get(glyphUrl)).arrayBuffer());
assert.ok(glyph.length > 100, 'Glyph response is empty');
const sprite = await (await get(`${style.sprite}.json`)).json();
assert.ok(Object.keys(sprite).length > 0, 'Sprite index is empty');
const spritePng = new Uint8Array(await (await get(`${style.sprite}.png`)).arrayBuffer());
assert.equal(Buffer.from(spritePng.subarray(0, 8)).toString('hex'), '89504e470d0a1a0a');
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), styleUrl, layers: style.layers.length,
  tileUrl, tileBytes: tile.length, glyphBytes: glyph.length, spriteEntries: Object.keys(sprite).length,
  spriteBytes: spritePng.length }, null, 2));
