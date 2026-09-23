import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PLACE, placeHeadline } from '../src/features/map/selectedPlace.ts';

test('uses selected place metadata near its center and falls back after panning away', () => {
  assert.equal(placeHeadline(DEFAULT_PLACE, DEFAULT_PLACE.center), 'Gdynia');
  assert.equal(placeHeadline({ name: 'Sopot, Pomorskie, Poland', center: [18.56, 54.44] }, [18.57, 54.45]), 'Sopot');
  assert.equal(placeHeadline({ name: 'Sopot', center: [18.56, 54.44] }, [19.0, 54.0]), '54.000°, 19.000°');
  assert.equal(placeHeadline(null, [18.5, 54.5]), '54.500°, 18.500°');
});
