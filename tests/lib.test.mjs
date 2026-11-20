import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, roadKm, nearest, rainSummary, shouldWarn, validateTours } from '../js/lib.js';
import { spots } from '../js/spots.js';
import { tours } from '../js/tours.js';

const tagb = { lat: 9.6539, lon: 123.866 };

test('haversine Tagbilaran to Chocolate Hills is about 32-36 km', () => {
  const km = haversineKm(tagb, { lat: 9.8297, lon: 124.1396 });
  assert.ok(km > 32 && km < 36, km);
});

test('roadKm is straight-line x 1.3', () => assert.equal(roadKm(10), 13));

test('nearest is sorted ascending and has length n', () => {
  const r = nearest(tagb, spots, 5);
  assert.equal(r.length, 5);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].km <= r[i].km);
});

test('there are 28 spots with coordinates', () => {
  assert.equal(spots.length, 28);
  assert.ok(spots.every(s => s.id && typeof s.lat === 'number' && typeof s.lon === 'number'));
});

test('rainSummary(null) is null', () => assert.equal(rainSummary(null, '2026-11-20T10:30'), null));

test('rainSummary picks the hour at/after now', () => {
  const hourly = {
    time: ['2026-11-20T09:00', '2026-11-20T10:00', '2026-11-20T11:00', '2026-11-20T12:00', '2026-11-20T13:00', '2026-11-20T14:00'],
    precipitation_probability: [90, 10, 20, 70, 30, 99],
  };
  const s = rainSummary(hourly, '2026-11-20T10:30');
  assert.equal(s.now, 10);        // current hour 10:00
  assert.equal(s.next3Max, 70);   // 10,11,12
  assert.equal(s.next12[0].time, '2026-11-20T10:00');
});

test('shouldWarn at 50%', () => {
  assert.equal(shouldWarn({ next3Max: 50 }), true);
  assert.equal(shouldWarn({ next3Max: 49 }), false);
  assert.equal(shouldWarn(null), false);
});

test('validateTours reports link to unknown scene', () => {
  const bad = { x: { firstScene: 'a', scenes: { a: { title: 'A', panorama: 'p', hotSpots: [{ type: 'scene', sceneId: 'zzz' }] } } } };
  assert.equal(validateTours(bad).length, 1);
});

test('real tours data is valid and points at real spots', () => {
  assert.deepEqual(validateTours(tours), []);
  for (const id of Object.keys(tours)) assert.ok(spots.some(s => s.id === id), id);
});

test('rainSummary todayMax covers the rest of today only', () => {
  const hourly = {
    time: ['2026-11-20T09:00', '2026-11-20T10:00', '2026-11-20T15:00', '2026-11-20T23:00', '2026-11-21T00:00', '2026-11-21T01:00'],
    precipitation_probability: [95, 10, 60, 40, 90, 99],
  };
  const s = rainSummary(hourly, '2026-11-20T10:30');
  assert.equal(s.todayMax, 60); // 9:00 already passed; tomorrow's 90/99 excluded
});
