import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CAMERA, parseCamera } from '../src/storage/camera.ts';

test('accepts persisted camera and rejects corrupt or out-of-range coordinates', () => {
  assert.deepEqual(parseCamera(DEFAULT_CAMERA), DEFAULT_CAMERA);
  for (const value of [null, {}, { center: [181, 54], zoom: 9 }, { center: [18, 90], zoom: 9 },
    { center: ['18', 54], zoom: 9 }, { center: [18, 54], zoom: NaN }, { center: [18, 54], zoom: 99 }]) {
    assert.equal(parseCamera(value), null);
  }
});
