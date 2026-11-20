# Tan-aw Bohol

**Live demo:** coming soon (will be deployed on Vercel)

An interactive tourism and cultural heritage map of Bohol, Philippines.

- **Home page:** popular places and a preview of the map; **Open the map** goes to the full map page (`map.html`)
- **Illustrated map** of 28 tourist and heritage spots (Leaflet, island outlines from OpenStreetMap), with icon pins, search and category filters
- **Chance of rain** for each spot for the next 12 hours (Open-Meteo, no API key)
- **My location (GPS, asked automatically when the site opens):** blue dot, nearest spots, distances from where you stand, and a warning when rain is likely near you in the next 3 hours. Your location stays in your browser.
- **360° walk-throughs:** walk around selected spots by clicking arrows between 360° photos (Pannellum). Baclayon Church has a demo walk with placeholder images.

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

## Deploy to Vercel
Import this repo in Vercel, keep the defaults (Framework: Other, no build command), and deploy. Then put the link at the top of this README.
