import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGhRoute, formatDuration, navLink, parsePoint } from '../js/lib.js';
import handler from '../api/route.js';

// GraphHopper /route response with points_encoded=false
const gh = {
  paths: [{
    distance: 7934.4, time: 1101000,
    points: { coordinates: [[123.866, 9.6539], [123.9, 9.63], [123.9136, 9.6256]] },
  }],
};

test('parseGhRoute flips [lon,lat] to [lat,lon] and converts units', () => {
  const r = parseGhRoute(gh);
  assert.deepEqual(r.coords[0], [9.6539, 123.866]);
  assert.equal(r.coords.length, 3);
  assert.equal(r.km, 7.9);
  assert.equal(r.min, 18);
});

test('parseGhRoute returns null for no route', () => {
  assert.equal(parseGhRoute({ paths: [] }), null);
  assert.equal(parseGhRoute(null), null);
});

test('formatDuration', () => {
  assert.equal(formatDuration(18), '18 min');
  assert.equal(formatDuration(65), '1 h 5 min');
  assert.equal(formatDuration(120), '2 h');
});

test('navLink opens Google Maps directions; origin only when not the user', () => {
  const to = { lat: 9.6256, lon: 123.9136 };
  assert.equal(navLink(null, to), 'https://www.google.com/maps/dir/?api=1&destination=9.6256%2C123.9136&travelmode=driving');
  assert.match(navLink({ lat: 9.6539, lon: 123.866 }, to), /&origin=9\.6539%2C123\.866&/);
});

test('parsePoint accepts Bohol coordinates only', () => {
  assert.deepEqual(parsePoint('9.6539,123.866'), { lat: 9.6539, lon: 123.866 });
  assert.equal(parsePoint('14.6,121.0'), null);   // Manila: outside Bohol
  assert.equal(parsePoint('abc'), null);
  assert.equal(parsePoint(undefined), null);
});

// minimal req/res stand-ins for the Vercel function
function call(query, env = 'test-key') {
  process.env.GRAPHHOPPER_API_KEY = env;
  const res = { code: 200, headers: {}, body: null,
    status(c) { this.code = c; return this; }, setHeader(k, v) { this.headers[k] = v; }, json(b) { this.body = b; return this; } };
  return handler({ method: 'GET', query }, res).then(() => res);
}

test('route function rejects bad points without calling GraphHopper', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const res = await call({ from: '14.6,121.0', to: '9.6256,123.9136' });
  assert.equal(res.code, 400);
  assert.equal(called, false);
});

test('route function returns 503 when no key is set', async () => {
  const res = await call({ from: '9.6539,123.866', to: '9.6256,123.9136' }, '');
  assert.equal(res.code, 503);
});

test('route function asks GraphHopper for a car route between the points and returns it parsed', async () => {
  let sent;
  globalThis.fetch = async (url) => { sent = new URL(url); return { ok: true, json: async () => gh }; };
  const res = await call({ from: '9.6539,123.866', to: '9.6256,123.9136' });
  assert.equal(res.code, 200);
  assert.equal(sent.origin + sent.pathname, 'https://graphhopper.com/api/1/route');
  assert.deepEqual(sent.searchParams.getAll('point'), ['9.6539,123.866', '9.6256,123.9136']);
  assert.equal(sent.searchParams.get('profile'), 'car');
  assert.equal(sent.searchParams.get('key'), 'test-key');
  assert.equal(res.body.km, 7.9);
  assert.ok(!JSON.stringify(res.body).includes('test-key')); // key never goes back to the browser
});

test('route function reports GraphHopper failure as 502', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  const res = await call({ from: '9.6539,123.866', to: '9.6256,123.9136' });
  assert.equal(res.code, 502);
});
