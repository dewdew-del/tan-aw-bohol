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
  return { now: p[i] ?? 0, next3Max: Math.max(...next12.slice(0, 3).map(h => h.p)), next12 };
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
