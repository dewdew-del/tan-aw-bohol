import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrsRoute, formatDuration, navLink, parsePoint } from '../js/lib.js';
import handler from '../api/route.js';

const ors = {
  features: [{
    geometry: { coordinates: [[123.866, 9.6539], [123.9, 9.63], [123.9136, 9.6256]] },
    properties: { summary: { distance: 7934.4, duration: 1101 } },
  }],
};

test('parseOrsRoute flips [lon,lat] to [lat,lon] and converts units', () => {
  const r = parseOrsRoute(ors);
  assert.deepEqual(r.coords[0], [9.6539, 123.866]);
  assert.equal(r.coords.length, 3);
  assert.equal(r.km, 7.9);
  assert.equal(r.min, 18);
});

test('parseOrsRoute returns null for no route', () => {
  assert.equal(parseOrsRoute({ features: [] }), null);
  assert.equal(parseOrsRoute(null), null);
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
  process.env.ORS_API_KEY = env;
  const res = { code: 200, headers: {}, body: null,
    status(c) { this.code = c; return this; }, setHeader(k, v) { this.headers[k] = v; }, json(b) { this.body = b; return this; } };
  return handler({ method: 'GET', query }, res).then(() => res);
}

test('route function rejects bad points without calling ORS', async () => {
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

test('route function sends the key in a header and returns a parsed route', async () => {
  let sent;
  globalThis.fetch = async (url, opts) => { sent = { url, opts }; return { ok: true, json: async () => ors }; };
  const res = await call({ from: '9.6539,123.866', to: '9.6256,123.9136' });
  assert.equal(res.code, 200);
  assert.equal(sent.opts.headers.Authorization, 'test-key');
  assert.ok(!sent.url.includes('test-key'));
  assert.deepEqual(JSON.parse(sent.opts.body).coordinates, [[123.866, 9.6539], [123.9136, 9.6256]]);
  assert.equal(res.body.km, 7.9);
});

test('route function reports ORS failure as 502', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  const res = await call({ from: '9.6539,123.866', to: '9.6256,123.9136' });
  assert.equal(res.code, 502);
});
