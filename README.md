# Tan-aw Bohol

**Live demo:** https://tan-aw-bohol.vercel.app

An interactive tourism and cultural heritage map of Bohol, Philippines.

- **Home page:** popular places and a preview of the map; **Open the map** goes to the full map page (`map.html`)
- **Illustrated map** of 28 tourist and heritage spots (Leaflet, island outlines from OpenStreetMap), with icon pins, search and category filters
- **Chance of rain** for each spot for the next 12 hours (Open-Meteo, no API key)
- **My location (GPS, asked automatically when the site opens):** blue dot, nearest spots, distances from where you stand, and a warning when rain is likely near you in the next 3 hours. Your location stays in your browser.
- **Directions:** each spot has *Show route* (road route, distance and drive time on the map, from GraphHopper, OpenStreetMap roads) and *Start navigation* (opens Google Maps for live turn-by-turn). Zoom in close to see real streets.
- **360° views:** 12 spots open a Google Maps 360° view inside the site (free embed, no key). 4 are walkable with arrows (Bilar forest, Loboc River, Bee Farm, Tagbilaran plaza); 8 are look-around visitor photos, credited inside each view. Your own walk-throughs in `js/tours.js` replace them (see TOURS.md).

BSCS 3B — Bohol Island State University.

## Run it locally
No build step. From this folder:

```bash
python -m http.server 5173
```

Then open http://localhost:5173. (GPS only works on `localhost` or an `https://` link.)

## Tests
```bash
npm test
```

## Add your own 360° photos
See [TOURS.md](TOURS.md).

## Routing key (for Show route)
1. Sign up free at https://graphhopper.com/dashboard/#/signup, then open **API Keys** in the dashboard and copy your key.
2. In Vercel: Project → Settings → Environment Variables → add `GRAPHHOPPER_API_KEY` = your key, then redeploy.

The key stays on the server (`api/route.js`); the page never sees it. Without a key, *Show route* says it's unavailable and *Start navigation* still works. Locally, `python -m http.server` can't run the route function; use `npx vercel dev` with the key in a `.env.local` file to test it.

## Deploy to Vercel
Import this repo in Vercel, keep the defaults (Framework: Other, no build command), and deploy. Then put the link at the top of this README.
