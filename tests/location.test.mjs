import { test } from 'node:test';
import assert from 'node:assert/strict';

// basemap.js needs Leaflet on window at import time; a stub is enough for watchLocation.
globalThis.window = { L: { latLngBounds: () => ({}) } };
const { watchLocation } = await import('../js/basemap.js');

// Fake geolocation: each watchPosition call gets the next scripted result.
function fakeGeo(script) {
  const calls = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: {
    watchPosition(ok, fail, opts) { calls.push(opts); const r = script.shift(); queueMicrotask(() => r.code ? fail(r) : ok({ coords: r })); return calls.length; },
    clearWatch() {},
  } } });
  return calls;
}
const tick = () => new Promise(r => setTimeout(r)); // runs after every queued microtask, incl. the retry's

test('high-accuracy failure retries in normal accuracy and finds the location', async () => {
  const calls = fakeGeo([{ code: 2 }, { latitude: 9.65, longitude: 123.86 }]);
  let pos, failed;
  watchLocation(p => (pos = p), m => (failed = m));
  await tick();
  assert.deepEqual(calls.map(c => c.enableHighAccuracy), [true, false]);
  assert.deepEqual(pos, { lat: 9.65, lon: 123.86 });
  assert.equal(failed, undefined);
});

test('timeout in both modes reports "could not find" once', async () => {
  fakeGeo([{ code: 3 }, { code: 3 }]);
  const msgs = [];
  watchLocation(() => {}, m => msgs.push(m));
  await tick();
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /Could not find/);
});

test('permission denied does not retry', async () => {
  const calls = fakeGeo([{ code: 1 }]);
  const msgs = [];
  watchLocation(() => {}, m => msgs.push(m));
  await tick();
  assert.equal(calls.length, 1);
  assert.match(msgs[0], /Location is off/);
});
