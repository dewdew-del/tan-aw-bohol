# Tan-aw Bohol Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Static Bohol tourism site with Leaflet map, per-spot rain chance, GPS location, and Pannellum 360° walk-throughs.

**Architecture:** One `index.html` with plain ES modules. Pure logic (distance, nearest, rain summary, tour config) lives in `js/lib.js` and is unit-tested with `node --test`; browser glue in `js/app.js`. Data in `js/spots.js` and `js/tours.js`.

**Tech Stack:** Leaflet 1.9.4, Pannellum 2.5.6 (cdnjs/jsdelivr, pinned), Open-Meteo forecast API, Node 24 test runner, Vercel static hosting.

**Spec:** `docs/superpowers/specs/2026-11-20-tan-aw-bohol-site-design.md`

## Global Constraints
- No Google services; no build step; no images inlined in HTML.
- Colors: `--accent:#6b3f23`, `--accent-2:#0e7c86`, `--bg:#f3f7f6`, `--fg:#14262b`; fonts Bricolage Grotesque (headings) + DM Sans.
- Road distance = straight-line km × 1.3.
- Rain banner threshold: max precipitation probability ≥ 50% in next 3 hours.
- Rain cache: 30 minutes per location.
- README has `**Live demo:** coming soon` near the top. No Claude attribution in commits.

## Review Focus
- GPS denied/unavailable → clear message, map still works (Task 3 handles error callback).
- Open-Meteo offline/error → panel shows "Rain forecast unavailable", no crash (`rainSummary(null)` test).
- Tour stop linking to a missing scene id → caught by `validateTours` test.
- Phone width 375px → panel doesn't cover the whole map permanently (manual check, Task 5).
- Spot with no photo → category-colored header, no broken image (manual check, Task 5).

---

### Task 1: Data and pure logic

**Files:**
- Create: `js/spots.js` (28 spots copied from sample: `{id, name, type, lat, lon, desc, img?}`), `js/lib.js`, `tests/lib.test.mjs`, `package.json` (`{"type":"module","scripts":{"test":"node --test tests/"}}`)

**Interfaces:**
- Produces: `haversineKm(a:{lat,lon}, b:{lat,lon}) -> number`, `roadKm(km) -> number`, `nearest(from, spots, n=5) -> [{spot, km}]`, `rainSummary(hourly:{time[],precipitation_probability[]}|null, nowIso) -> {now:number, next3Max:number, next12:[{time,p}]}|null`, `shouldWarn(summary) -> boolean`, `validateTours(tours) -> string[]` (list of errors)

- [ ] Tests: Tagbilaran (9.6539,123.866)→Chocolate Hills ≈ 32–36 km; `roadKm(10)===13`; `nearest` sorted ascending, length n; `rainSummary(null)===null`; `rainSummary` picks hour at/after now; `shouldWarn({next3Max:50})===true`, `49→false`; `validateTours` reports a link to unknown scene.
- [ ] Run `npm test` → FAIL; implement; run → PASS; commit.

### Task 2: Tours data and placeholder panoramas

**Files:** Create `js/tours.js` (`export const tours = {spotId: {firstScene, scenes:{id:{title, panorama, hotSpots:[{pitch,yaw,type:'scene',text,sceneId}]}}}}`), `scripts/make-placeholders.py` (Pillow-free: writes 2:1 SVG→ use PNG via plain Python zlib), `images/pano/*.png`, `TOURS.md`.
- [ ] Demo tour on Baclayon Church: 3 stops (gate → plaza → door), forward and back links.
- [ ] Placeholder images 4096×2048 with a horizon, compass labels N/E/S/W, and the stop name, so yaw makes sense when testing.
- [ ] Add `validateTours(tours)` test against real data → `[]`. Commit.

### Task 3: Page, map, GPS, rain

**Files:** Create `index.html`, `css/style.css`, `js/app.js`, `images/` (copy 6 sample photos).
- [ ] Leaflet map centered on Bohol (9.85, 124.15, zoom 10), category-colored circle markers, search + category filter list.
- [ ] Detail panel: photo/header, category, desc, distance from selector (Tagbilaran / any spot / My location), rain block, "Walk around" when `tours[id]` exists.
- [ ] Rain: `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=precipitation_probability&forecast_days=2&timezone=Asia/Manila`, cached 30 min in memory.
- [ ] GPS: `navigator.geolocation.watchPosition`; blue dot; nearest 5 list; rain banner via `shouldWarn`; errors shown in a toast.
- [ ] Commit.

### Task 4: 360° viewer
- [ ] Full-screen overlay with `pannellum.viewer(el, {default:{firstScene, sceneFadeDuration:600, autoLoad:true}, scenes})`; close button + Esc; destroy on close. Commit.

### Task 5: Verify, repo, README
- [ ] `npm test` passes; serve locally (`python -m http.server`), check desktop + 375px, GPS denied path, walk-through arrows.
- [ ] `vercel.json` not needed (static). README with Live demo: coming soon, how to run, how to add photos (link TOURS.md). `.gitignore`. git init + commit.
