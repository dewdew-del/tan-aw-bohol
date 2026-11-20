# Tan-aw Bohol site — design

## Intent
A tourism and cultural heritage site for Bohol (BSCS 3B school project) where visitors see the 28 spots on a real map, check the chance of rain, see where they are, and walk through selected spots with 360° photos the group will shoot later. Hosted on Vercel.

## Goals
- Real, zoomable map of Bohol with markers for the 28 spots (data from the sample `Tan-aw Bohol.html`: name, category, lat/lon, description).
- Spot detail panel: name, category, description, distance, rain chance (now + next hours), "Walk around" button when the spot has a walk-through.
- Rain chance from Open-Meteo (free, no key). With GPS on, a banner warns about rain near the user in the next 3 hours (only while the page is open).
- "Show my location": blue dot, "My location" in the measure-from selector, nearest spots list. Location never leaves the browser.
- 360° walk-through (Pannellum tour mode): full-screen viewer, arrows between stops along a path the group defines. Placeholder panoramas until real photos exist.
- Walk-through data in one file (`js/tours.js`) with a short guide (`TOURS.md`) on adding photos and links.
- Search and category filter. Works on phone and desktop.

## Non-goals
Push alarms when the site is closed, accounts, headset VR mode, language toggle, trip planner, directions.

## Anti-goals
No Google services. No build step or framework a classmate can't open and edit. No images embedded in HTML.

## Approaches considered
- **Pannellum tour mode inside the site (picked):** integrated with the map, one config file, arrows set by yaw numbers.
- Marzipano Tool export: drag-and-drop arrow placing, but each tour is a separate mini-site; harder to integrate and restyle.
- Google Street View Studio: least work, but the user does not want Google.

Map: Leaflet + OpenStreetMap tiles (picked) instead of the sample's drawn SVG map, because GPS and real coordinates work directly.

## Decisions (Claude's calls)
- Plain HTML/CSS/JS, libraries from cdnjs/jsdelivr with pinned versions; deploys to Vercel as static files.
- Look reused from the sample: Bricolage Grotesque + DM Sans, colors `--accent:#6b3f23`, `--accent-2:#0e7c86`, `--bg:#f3f7f6`, `--fg:#14262b`.
- Road distance estimate = straight-line × 1.3, as in the sample idea.
- Placeholder panoramas: generated equirectangular images in `images/pano/` so the walk-through works with no real photos yet. One demo tour (Baclayon Church, 3 stops).
- Rain is fetched per spot when its panel opens (cached for 30 min), not for all 28 at load.
- Spot photos: reuse the 6 photos in `images/`; other spots show a category-colored header.

## Left to the builder
Exact layout, wording, and marker styling.
