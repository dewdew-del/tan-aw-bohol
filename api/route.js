// Vercel serverless function: GET /api/route?from=lat,lon&to=lat,lon
// Keeps the GraphHopper key on the server (env var GRAPHHOPPER_API_KEY) so visitors can't copy it.
import { parsePoint, parseGhRoute } from '../js/lib.js';

export default async function handler(req, res) {
  const from = parsePoint(req.query.from), to = parsePoint(req.query.to);
  if (!from || !to) return res.status(400).json({ error: 'from and to must be lat,lon points in Bohol' });
  const key = process.env.GRAPHHOPPER_API_KEY;
  if (!key) return res.status(503).json({ error: 'Routing is not set up (missing GRAPHHOPPER_API_KEY).' });
  const url = new URL('https://graphhopper.com/api/1/route');
  url.searchParams.append('point', `${from.lat},${from.lon}`);
  url.searchParams.append('point', `${to.lat},${to.lon}`);
  for (const [k, v] of Object.entries({ profile: 'car', points_encoded: 'false', instructions: 'false', key })) url.searchParams.set(k, v);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return res.status(502).json({ error: `Routing service error ${r.status}` });
    const route = parseGhRoute(await r.json());
    if (!route) return res.status(404).json({ error: 'No road route found.' });
    res.setHeader('Cache-Control', 's-maxage=86400'); // same trip, same roads: let Vercel cache it for a day
    return res.status(200).json(route);
  } catch {
    return res.status(502).json({ error: 'Routing service did not answer.' });
  }
}
