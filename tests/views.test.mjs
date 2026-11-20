import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedUrl } from '../js/lib.js';
import { views } from '../js/views.js';
import { spots } from '../js/spots.js';

test('visitor photo ids are wrapped the way Google Maps embed expects', () => {
  const u = embedUrl({ kind: 'photo', pano: 'CIHM0ogKEICAgID4h9KDHw', lat: 9.6225093, lon: 123.9122093 });
  assert.ok(u.includes('!1sCAoSFkNJSE0wb2dLRUlDQWdJRDRoOUtESHc.!2m2!1d9.6225093!2d123.9122093'), u);
  assert.ok(u.startsWith('https://www.google.com/maps/embed?pb='));
});

test('road Street View ids are used as they are', () => {
  const u = embedUrl({ kind: 'road', pano: 'Gtchg-jZyjJIlU5f1UpqCA', lat: 9.6672892, lon: 124.084099, heading: 90 });
  assert.ok(u.includes('!1sGtchg-jZyjJIlU5f1UpqCA!2m2!1d9.6672892!2d124.084099!3f90!'), u);
});

test('every 360 view belongs to a real spot and has the fields it needs', () => {
  for (const [id, v] of Object.entries(views)) {
    assert.ok(spots.some(s => s.id === id), id);
    assert.ok(['road', 'photo'].includes(v.kind) && v.pano && typeof v.lat === 'number' && typeof v.walk === 'boolean', id);
  }
});
