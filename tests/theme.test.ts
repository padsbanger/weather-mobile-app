import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME, nextThemeCheck, parseThemePreference, resolveTheme } from '../src/theme/schedule.ts';

test('automatic theme uses inclusive local 07:00 and exclusive 19:00', () => {
  assert.equal(resolveTheme(DEFAULT_THEME, new Date(2026, 8, 23, 6, 59)), 'dark');
  assert.equal(resolveTheme(DEFAULT_THEME, new Date(2026, 8, 23, 7, 0)), 'light');
  assert.equal(resolveTheme(DEFAULT_THEME, new Date(2026, 8, 23, 18, 59)), 'light');
  assert.equal(resolveTheme(DEFAULT_THEME, new Date(2026, 8, 23, 19, 0)), 'dark');
  assert.equal(nextThemeCheck(new Date(2026, 8, 23, 6, 59, 59, 900), DEFAULT_THEME), 100);
});

test('overnight schedule crosses midnight and manual modes override it', () => {
  const overnight = { mode: 'auto' as const, lightStart: 19, lightEnd: 7 };
  assert.equal(resolveTheme(overnight, new Date(2026, 8, 23, 18, 59)), 'dark');
  assert.equal(resolveTheme(overnight, new Date(2026, 8, 23, 19, 0)), 'light');
  assert.equal(resolveTheme(overnight, new Date(2026, 8, 24, 0, 0)), 'light');
  assert.equal(resolveTheme(overnight, new Date(2026, 8, 24, 7, 0)), 'dark');
  assert.equal(resolveTheme({ ...overnight, mode: 'dark' }, new Date(2026, 8, 24, 0, 0)), 'dark');
  assert.equal(resolveTheme({ ...overnight, mode: 'light' }, new Date(2026, 8, 23, 12, 0)), 'light');
});

test('invalid stored schedules return defaults', () => {
  assert.deepEqual(parseThemePreference({ mode: 'auto', lightStart: 7, lightEnd: 7 }), DEFAULT_THEME);
  assert.deepEqual(parseThemePreference({ mode: 'blue', lightStart: 7, lightEnd: 19 }), DEFAULT_THEME);
  assert.deepEqual(parseThemePreference({ mode: 'auto', lightStart: -1, lightEnd: 19 }), DEFAULT_THEME);
  assert.deepEqual(parseThemePreference({ mode: 'auto', lightStart: 22, lightEnd: 6 }), { mode: 'auto', lightStart: 22, lightEnd: 6 });
});

test('spring and autumn DST boundaries use local civil hour without extra offset arithmetic', () => {
  const prior = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Warsaw';
    const spring = new Date(2026, 2, 29, 2, 30);
    assert.equal(spring.getHours(), 3); // 02:30 does not exist locally.
    assert.equal(resolveTheme(DEFAULT_THEME, new Date(2026, 2, 29, 7, 0)), 'light');
    const autumnFirst = new Date('2026-10-25T00:30:00Z');
    const autumnSecond = new Date('2026-10-25T01:30:00Z');
    assert.equal(autumnFirst.getHours(), 2);
    assert.equal(autumnSecond.getHours(), 2);
    assert.equal(resolveTheme(DEFAULT_THEME, autumnFirst), 'dark');
    assert.equal(resolveTheme(DEFAULT_THEME, autumnSecond), 'dark');
    assert.equal(resolveTheme(DEFAULT_THEME, new Date(2026, 9, 25, 7, 0)), 'light');
  } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
});
