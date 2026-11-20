// Pure logic, no browser APIs, so it can be tested with `npm test`.

export function haversineKm(a, b) {
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// shortcut: road distance is estimated as straight line x 1.3; use a routing API for real road km.
export const roadKm = km => Math.round(km * 1.3 * 10) / 10;

export function nearest(from, spots, n = 5) {
  return spots.map(spot => ({ spot, km: haversineKm(from, spot) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

// hourly: Open-Meteo `hourly` object; nowIso: local time "YYYY-MM-DDTHH:MM" (Asia/Manila).
export function rainSummary(hourly, nowIso) {
  if (!hourly?.time?.length) return null;
  const hour = nowIso.slice(0, 13) + ':00';
  let i = hourly.time.findIndex(t => t >= hour);
  if (i < 0) return null;
  const p = hourly.precipitation_probability;
  const next12 = hourly.time.slice(i, i + 12).map((time, k) => ({ time, p: p[i + k] ?? 0 }));
  const day = hour.slice(0, 10);
  const todayMax = Math.max(...hourly.time.map((t, k) => (k >= i && t.startsWith(day) ? p[k] ?? 0 : 0)));
  return { now: p[i] ?? 0, next3Max: Math.max(...next12.slice(0, 3).map(h => h.p)), todayMax, next12 };
}

export const shouldWarn = s => !!s && s.next3Max >= 50;

export function validateTours(tours) {
  const errors = [];
  for (const [spotId, t] of Object.entries(tours)) {
    if (!t.scenes?.[t.firstScene]) errors.push(`${spotId}: firstScene "${t.firstScene}" not found`);
    for (const [sceneId, sc] of Object.entries(t.scenes || {})) {
      if (!sc.panorama) errors.push(`${spotId}/${sceneId}: missing panorama`);
      for (const h of sc.hotSpots || []) {
        if (h.type === 'scene' && !t.scenes[h.sceneId]) errors.push(`${spotId}/${sceneId}: arrow goes to unknown stop "${h.sceneId}"`);
      }
    }
  }
  return errors;
}

// ---------- routing ----------
// Bohol + Panglao with a margin; the route function only accepts points inside it.
const BOHOL = { lat0: 9.3, lat1: 10.3, lon0: 123.5, lon1: 124.7 };

export function parsePoint(str) {
  const [lat, lon] = String(str ?? '').split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < BOHOL.lat0 || lat > BOHOL.lat1 || lon < BOHOL.lon0 || lon > BOHOL.lon1) return null;
  return { lat, lon };
}

// GraphHopper route (points_encoded=false) -> {coords: [[lat, lon]...], km, min}
export function parseGhRoute(gh) {
  const p = gh?.paths?.[0];
  if (!p) return null;
  return {
    coords: p.points.coordinates.map(([lon, lat]) => [lat, lon]),
    km: Math.round(p.distance / 100) / 10,
    min: Math.round(p.time / 60000),
  };
}

export function formatDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

// Google Maps directions link (no key needed). Without an origin the app starts from the phone's own location.
export function navLink(from, to) {
  const p = new URLSearchParams({ api: '1' });
  if (from) p.set('origin', `${from.lat},${from.lon}`);
  p.set('destination', `${to.lat},${to.lon}`);
  p.set('travelmode', 'driving');
  return 'https://www.google.com/maps/dir/?' + p;
}

// ---------- Google Maps 360° embeds (free, no key) ----------
// Visitor photo ids must be wrapped (protobuf + url-safe base64, '.' padding) the way Google's own embed code does.
const wrapPhotoId = id => btoa(String.fromCharCode(8, 10, 18, id.length) + id)
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '.');

export function embedUrl({ kind, pano, lat, lon, heading = 0 }) {
  const id = kind === 'photo' ? wrapPhotoId(pano) : pano;
  return `https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1s${id}!2m2!1d${lat}!2d${lon}!3f${heading}!4f0!5f0.78`;
}
