// Vercel serverless function: GET /api/route?from=lat,lon&to=lat,lon
// Keeps the OpenRouteService key on the server (env var ORS_API_KEY) so visitors can't copy it.
import { parsePoint, parseOrsRoute } from '../js/lib.js';

export default async function handler(req, res) {
  const from = parsePoint(req.query.from), to = parsePoint(req.query.to);
  if (!from || !to) return res.status(400).json({ error: 'from and to must be lat,lon points in Bohol' });
  const key = process.env.ORS_API_KEY;
  if (!key) return res.status(503).json({ error: 'Routing is not set up (missing ORS_API_KEY).' });
  try {
    const r = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[from.lon, from.lat], [to.lon, to.lat]] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return res.status(502).json({ error: `Routing service error ${r.status}` });
    const route = parseOrsRoute(await r.json());
    if (!route) return res.status(404).json({ error: 'No road route found.' });
    res.setHeader('Cache-Control', 's-maxage=86400'); // same trip, same roads: let Vercel cache it for a day
    return res.status(200).json(route);
  } catch {
    return res.status(502).json({ error: 'Routing service did not answer.' });
  }
}
