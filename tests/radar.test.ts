import assert from 'node:assert/strict';
import test from 'node:test';
import { formatFrameDate, isStale, parseRadarMetadata, radarTiles, retryDelay } from '../src/providers/rainviewer.ts';
import { INITIAL_PLAYBACK, nextFrame, playbackReducer } from '../src/features/radar/playback.ts';
import { PREFETCH_TILE_BUDGET, visibleRadarTileCount } from '../src/features/radar/prefetch.ts';

const now = Date.UTC(2026, 8, 22, 12);
const seconds = now / 1000;
const raw = (past: unknown[]) => ({ version: '2.0', host: 'https://tilecache.rainviewer.com', generated: seconds, radar: { past } });
const a = { time: seconds - 600, path: '/v2/radar/opaque-a' };
const b = { time: seconds, path: '/v2/radar/opaque-b' };
const frames = parseRadarMetadata(raw([a, b]), now).frames;

test('sorts and deduplicates valid history, flags partial data, uses opaque returned paths', () => {
  const result = parseRadarMetadata(raw([b, a, b, { time: null, path: a.path }, { time: seconds, path: '/../bad' }]), now);
  assert.deepEqual(result.frames, frames);
  assert.equal(result.rejected, 2);
  assert.equal(result.frames[0].time, (seconds - 600) * 1000);
  assert.equal(radarTiles(result.frames[0]), 'https://tilecache.rainviewer.com/v2/radar/opaque-a/256/{z}/{x}/{y}/2/1_0.png');
});
test('distinguishes empty history from invalid schema and rejects unsafe URLs/future timestamps', () => {
  assert.deepEqual(parseRadarMetadata(raw([]), now).frames, []);
  for (const value of [null, {}, { ...raw([a]), host: 'https://rainviewer.com.attacker.test' },
    { ...raw([a]), host: 'http://tilecache.rainviewer.com' }, { ...raw([a]), generated: NaN },
    raw([{ time: seconds + 3600, path: a.path }]), raw([{ time: '123', path: a.path }])]) {
    assert.throws(() => parseRadarMetadata(value, now));
  }
});
test('freshness boundary uses frame time, not fetch time; English dates and bounded retries', () => {
  assert.equal(isStale(now - 1199999, now), false);
  assert.equal(isStale(now - 1200000, now), true);
  assert.equal(isStale(now + 600000, now), true);
  assert.match(formatFrameDate(now), /22 Sept?/);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 20].map(retryDelay), [15000, 30000, 60000, 120000, 240000, 300000, 300000]);
});
test('keeps displayed frame until matching readiness; ignores cancelled scrub events', () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: 'select', frame: frames[0] });
  const oldId = state.staged!.id;
  state = playbackReducer(state, { type: 'select', frame: frames[1] });
  assert.equal(playbackReducer(state, { type: 'loaded', id: oldId }), state);
  state = playbackReducer(state, { type: 'loaded', id: state.staged!.id });
  assert.equal(state.displayed!.frame, frames[1]);
  state = playbackReducer(state, { type: 'play' });
  state = playbackReducer(state, { type: 'preload', frame: frames[0] });
  assert.equal(state.displayed!.frame, frames[1]);
  state = playbackReducer(state, { type: 'advance' });
  assert.equal(state.displayed!.frame, frames[1]);
  state = playbackReducer(state, { type: 'loaded', id: state.staged!.id });
  assert.equal(state.displayed!.frame, frames[0]);
});
test('failed preload retains imagery and pauses; camera cancellation invalidates pending frame; wraps only available frames', () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: 'select', frame: frames[0] });
  state = playbackReducer(state, { type: 'loaded', id: state.staged!.id });
  state = playbackReducer(state, { type: 'play' });
  state = playbackReducer(state, { type: 'preload', frame: frames[1] });
  const pending = state.staged!.id;
  const cancelled = playbackReducer(state, { type: 'cancel' });
  assert.equal(playbackReducer(cancelled, { type: 'loaded', id: pending }), cancelled);
  state = playbackReducer(state, { type: 'failed', id: pending });
  assert.equal(state.displayed!.frame, frames[0]);
  assert.equal(state.playing, false);
  assert.equal(state.error, true);
  assert.equal(nextFrame(frames, frames[1]), frames[0]);
  assert.equal(nextFrame([], frames[0]), undefined);
});

test('prepared frames switch immediately without another staged tile load', () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: 'select', frame: frames[0] });
  state = playbackReducer(state, { type: 'loaded', id: state.staged!.id });
  state = playbackReducer(state, { type: 'play' });
  state = playbackReducer(state, { type: 'preload', frame: frames[1] });
  const id = state.staged!.id;
  state = playbackReducer(state, { type: 'loaded', id });
  assert.equal(state.displayed!.frame, frames[0]);
  assert.equal(state.cached.length, 2);
  assert.equal(playbackReducer(state, { type: 'loaded', id }), state);
  state = playbackReducer(state, { type: 'show', frame: frames[1] });
  assert.equal(state.displayed!.frame, frames[1]);
  assert.equal(state.staged, null);
  assert.equal(state.playing, true);
  state = playbackReducer(state, { type: 'show', frame: frames[0] });
  assert.equal(state.displayed!.frame, frames[0]);
  assert.equal(state.staged, null);
  state = playbackReducer(state, { type: 'pause' });
  assert.equal(state.playing, false);
});

test('camera invalidation keeps the visible frame but requires viewport frames to prepare again', () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: 'select', frame: frames[1] });
  state = playbackReducer(state, { type: 'loaded', id: state.staged!.id });
  state = playbackReducer(state, { type: 'preload', frame: frames[0] });
  const cancelled = state.staged!.id;
  state = playbackReducer(state, { type: 'invalidate' });
  assert.equal(state.displayed!.frame, frames[1]);
  assert.equal(state.cached.length, 0);
  assert.equal(playbackReducer(state, { type: 'loaded', id: cancelled }), state);
  state = playbackReducer(state, { type: 'cacheDisplayed' });
  assert.equal(state.cached.length, 1);
  state = playbackReducer(state, { type: 'preload', frame: frames[0] });
  state = playbackReducer(state, { type: 'loaded', id: state.staged!.id });
  assert.equal(state.cached.length, 2);
  state = playbackReducer(state, { type: 'prune', frames: [frames[1]] });
  assert.equal(state.cached.length, 1);
});

test('viewport tile estimate bounds preparation to the current source zoom', () => {
  assert.equal(visibleRadarTileCount([18.3, 54.3, 18.8, 54.7], 11), 1);
  assert.equal(visibleRadarTileCount([-180, -85, 180, 85], 7), 128 * 128);
  assert.ok(visibleRadarTileCount([-180, -85, 180, 85], 7) > PREFETCH_TILE_BUDGET);
  assert.equal(visibleRadarTileCount([18, 54, 19, 55], Number.NaN), PREFETCH_TILE_BUDGET + 1);
});
