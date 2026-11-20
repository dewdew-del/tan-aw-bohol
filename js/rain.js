// Chance of rain from Open-Meteo (free, no key). Used by the home page and the map page.
import { rainSummary } from './lib.js';

const cache = new Map(); // "lat,lon" -> {at, hourly}
const manilaNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T');

export async function loadRain(p) {
  const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > 30 * 60 * 1000) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&hourly=precipitation_probability&forecast_days=2&timezone=Asia%2FManila`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) }); // weak mobile data: don't hang forever
      if (!r.ok) throw new Error(r.status);
      cache.set(key, { at: Date.now(), hourly: (await r.json()).hourly });
    } catch {
      if (!hit) return null; // offline: fall back to the older forecast if we have one
    }
  }
  return rainSummary(cache.get(key).hourly, manilaNow());
}

export const rainWarning = sum => `🌧️ Heads up: ${sum.next3Max}% chance of rain near you in the next 3 hours. Bring an umbrella!`;
