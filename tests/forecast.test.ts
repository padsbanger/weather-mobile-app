import assert from 'node:assert/strict';
import test from 'node:test';
import { forecastStale, forecastUrl, hourLabel, locationKey, parseForecast, parsePlace, parseSearch, searchUrl, upcomingHours } from '../src/providers/openMeteo.ts';

const time = Date.UTC(2026, 9, 25, 0) / 1000;
function raw() {
  return { timezone: 'Europe/Warsaw', hourly_units: { time: 'unixtime', temperature_2m: '°C', precipitation_probability: '%', precipitation: 'mm', wind_speed_10m: 'km/h' },
    hourly: { time: [time, time + 3600, time + 7200], temperature_2m: [10, null, 11], precipitation_probability: [0, 60, null], precipitation: [0, 0.5, null], wind_speed_10m: [5, 10, null] } };
}
test('forecast retains nulls and zero, validates units, dates and hourly alignment', () => {
  const data = parseForecast(raw());
  assert.equal(data.partial, true);
  assert.equal(data.hours[0].probability, 0);
  assert.equal(data.hours[2].precipitation, null);
  assert.equal(data.hours[0].time, time * 1000);
  for (const modify of [
    (v: ReturnType<typeof raw>) => { v.hourly_units.temperature_2m = '°F'; },
    (v: ReturnType<typeof raw>) => { v.hourly.time[1] = time; },
    (v: ReturnType<typeof raw>) => { v.hourly.time[1] = NaN; },
    (v: ReturnType<typeof raw>) => { v.hourly.precipitation.pop(); },
    (v: ReturnType<typeof raw>) => { v.hourly.precipitation_probability[1] = 101; },
    (v: ReturnType<typeof raw>) => { v.timezone = 'Unknown/Zone'; },
  ]) { const value = raw(); modify(value); assert.throws(() => parseForecast(value)); }
});
test('DST repeated local hours remain distinct instants with timezone labels; expired hours excluded', () => {
  const data = parseForecast(raw());
  const a = hourLabel(data.hours[0].time, data.timezone), b = hourLabel(data.hours[1].time, data.timezone);
  assert.match(a, /02:00/); assert.match(b, /02:00/); assert.notEqual(a, b);
  assert.equal(upcomingHours(data, (time + 3700) * 1000).length, 1);
  assert.deepEqual(upcomingHours(data, (time + 10800) * 1000), []);
});
test('rounded forecast keys, explicit units, cache age boundary and future cache rejection', () => {
  assert.equal(locationKey([18.538, 54.5189]), '54.52,18.54');
  assert.match(forecastUrl([18.538, 54.5189]), /latitude=54.52&longitude=18.54/);
  assert.match(forecastUrl([0, 0]), /timeformat=unixtime/);
  assert.equal(forecastStale(1000, 1800999), false);
  assert.equal(forecastStale(1000, 1801000), true);
  assert.equal(forecastStale(1000, 999), true);
});
test('geocoding handles empty, errors, unsafe coordinates and missing optional administrative fields', () => {
  assert.deepEqual(parseSearch({}), []);
  assert.deepEqual(parseSearch({ results: [{ name: 'Gdynia', latitude: 54.5, longitude: 18.5 }] }), [{ name: 'Gdynia', center: [18.5, 54.5] }]);
  assert.throws(() => parseSearch({ error: true }));
  assert.throws(() => parseSearch({ results: [{ name: 'Invalid', latitude: 90, longitude: 0 }] }));
  assert.throws(() => parsePlace({ name: '', center: [0, 0] }));
  assert.throws(() => parsePlace({ name: 'Bad', center: [NaN, 0] }));
  assert.match(searchUrl('A&B'), /name=A%26B/);
  assert.match(searchUrl('Berlin'), /language=en/);
});
