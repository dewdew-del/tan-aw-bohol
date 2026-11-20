// Map page: full interactive map with search, filters, distances, rain, location and 360° walk-throughs.
import { spots } from './spots.js';
import { tours } from './tours.js';
import { haversineKm, roadKm, shouldWarn, formatDuration, navLink } from './lib.js';
import { loadRain, rainWarning } from './rain.js';
import { createBoholMap, islandBounds, spotIcon, meIcon, watchLocation, ICONS } from './basemap.js';

const L = window.L;
const $ = id => document.getElementById(id);
const TAGBILARAN = { lat: 9.6539, lon: 123.866, name: 'Tagbilaran City' };

let me = null;              // {lat, lon} from GPS
let selected = null;        // spot
const markers = new Map();  // id -> marker

// ---------- map ----------
const map = createBoholMap('map');
map.createPane('route').style.zIndex = 420; // route line above street tiles
// fit the whole island, leaving room for the floating list panel on wide screens
const showIsland = (animate = true) => map.fitBounds(islandBounds, {
  paddingTopLeft: [20, 20],
  paddingBottomRight: [20, 20],
  animate,
});
showIsland(false);
// can't zoom out further than the whole island
const capZoomOut = () => map.setMinZoom(map.getBoundsZoom(islandBounds) - 0.25);
capZoomOut();
addEventListener('resize', capZoomOut);

for (const s of spots) {
  const m = L.marker([s.lat, s.lon], { icon: spotIcon(s, { has360: !!tours[s.id] }), title: s.name, riseOnHover: true }).addTo(map);
  m.on('click', () => select(s));
  markers.set(s.id, m);
}

// ---------- search + list ----------
$('search').addEventListener('input', renderList);

// distances start from the visitor's location when we have it, otherwise Tagbilaran
const fromPoint = () => me ? { ...me, name: 'you' } : TAGBILARAN;

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const from = fromPoint();
  const shown = spots.filter(s =>
    (!q || (s.name + ' ' + s.type + ' ' + s.desc).toLowerCase().includes(q)));
  for (const s of spots) {
    const el = markers.get(s.id).getElement();
    el.style.display = shown.includes(s) ? '' : 'none';
    el.firstChild.classList.toggle('on', s === selected);
    markers.get(s.id).setZIndexOffset(s === selected ? 1000 : 0);
  }
  $('count').textContent = `(${shown.length})`;
  $('list').innerHTML = shown.map(s => {
    const km = from && from.id !== s.id ? `${roadKm(haversineKm(from, s))} km` : '';
    return `<li><button type="button" data-id="${s.id}" class="${s === selected ? 'on' : ''}"><span>${s.name}${tours[s.id] ? '<span class="badge360">360°</span>' : ''}</span><small>${km}</small></button></li>`;
  }).join('') || '<li class="meta">No spots match.</li>';
}
$('list').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  closeSearch(); // the panel is only for searching
  select(spots.find(s => s.id === b.dataset.id), true);
});

// ---------- spot popup (centred over the map; click outside to close) ----------
function select(s, fly = false) {
  selected = s;
  history.replaceState(null, '', '#' + s.id);
  renderDetail(s);
  if (fly) map.flyTo([s.lat, s.lon], 11.5, { duration: 0.8 });
  renderList();
}

function closeDetail() {
  if ($('detail').hidden) return;
  $('detail').hidden = $('backdrop').hidden = true;
  selected = null;
  history.replaceState(null, '', location.pathname);
  renderList();
}
$('backdrop').addEventListener('click', closeDetail);

function renderDetail(s) {
  const from = fromPoint();
  const km = from && from.id !== s.id ? roadKm(haversineKm(from, s)) : null;
  const bg = s.img ? `background-image:url('${s.img}')` : 'background-image:linear-gradient(135deg,#0e7c86,#0a4f57)';
  $('detail').hidden = $('backdrop').hidden = false;
  $('detail').innerHTML = `
    <button class="x" id="close-detail" type="button" aria-label="Close">&times;</button>
    <div class="ph2${s.img ? '' : ' no-photo'}" style="${bg}">${s.img ? '' : `<span>${ICONS[s.type] || '📍'}</span>`}</div>
    <div class="body">
      <span class="tag">${s.type}</span>
      <h3>${s.name}</h3>
      <p>${s.desc.split('. ')[0].replace(/\.$/, '')}.</p>
      <div class="facts">
        ${km != null ? `<span>📍 ~${Math.round(km)} km from ${from.name.replace(' City', '')}</span>` : ''}
        <span id="rain-chip" aria-live="polite">⛅ Checking rain…</span>
      </div>
      <div class="actions">
        ${tours[s.id] ? '<button class="walk" type="button" id="walk">🚶 Walk around 360°</button>' : ''}
        ${km != null ? `<button class="btn-dir" type="button" id="show-route">🗺️ Show route</button>
        <a class="btn-dir go" target="_blank" rel="noopener" href="${navLink(me ? null : from, s)}">🧭 Navigate</a>` : ''}
      </div>
    </div>`;
  $('close-detail').onclick = closeDetail;
  $('show-route')?.addEventListener('click', () => showRoute(from, s));
  if (tours[s.id]) $('walk').onclick = () => openTour(s);
  loadRain(s).then(sum => {
    if (selected !== s) return;
    $('rain-chip').textContent = sum ? `${sum.next3Max >= 50 ? '🌧️' : '⛅'} ${sum.next3Max}% chance of rain` : '';
  });
}

// ---------- route preview (GraphHopper via /api/route) ----------
let routeLayer = null;
function clearRoute() { routeLayer?.remove(); routeLayer = null; $('route-bar').hidden = true; }

async function showRoute(from, to) {
  $('show-route').textContent = 'Finding route…';
  try {
    const r = await fetch(`/api/route?from=${from.lat},${from.lon}&to=${to.lat},${to.lon}`, { signal: AbortSignal.timeout(20000) });
    const route = await r.json();
    if (!r.ok) throw new Error(route.error);
    if (selected !== to) return; // user moved on
    closeDetail();
    clearRoute();
    routeLayer = L.layerGroup([
      L.polyline(route.coords, { pane: 'route', color: '#fff', weight: 9, opacity: 0.9, interactive: false }),
      L.polyline(route.coords, { pane: 'route', color: '#0e7c86', weight: 5, interactive: false }),
    ]).addTo(map);
    map.fitBounds(L.latLngBounds(route.coords), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 120] });
    $('route-bar').hidden = false;
    $('route-bar').innerHTML = `
      <div><b>${route.km} km · ${formatDuration(route.min)}</b> to ${to.name}<small>Estimate, no live traffic</small></div>
      <a class="btn-dir go" target="_blank" rel="noopener" href="${navLink(me ? null : from, to)}">🧭 Navigate</a>
      <button class="x-small" type="button" id="clear-route" aria-label="Clear route">&times;</button>`;
    $('clear-route').onclick = clearRoute;
  } catch {
    if (selected !== to) return;
    $('show-route').textContent = '🗺️ Show route';
    toast('Route preview is not available right now. Navigate still works.');
  }
}

// ---------- search panel (hidden until asked for) ----------
$('search-toggle').addEventListener('click', () => {
  $('tools').hidden = false; $('search-toggle').hidden = true; $('search').focus();
});
function closeSearch() { $('tools').hidden = true; $('search-toggle').hidden = false; }
$('tools-close').addEventListener('click', closeSearch);

// ---------- location ----------
let meMarker = null, lastRainCheck = 0;
watchLocation(p => {
  const first = !me;
  me = p;
  if (!meMarker) meMarker = L.marker([me.lat, me.lon], { icon: meIcon(), zIndexOffset: 2000 }).addTo(map).bindTooltip('You are here');
  else meMarker.setLatLng([me.lat, me.lon]);
  if (first) {
    if (!selected) map.flyTo([me.lat, me.lon], 11);
    renderList(); if (selected) renderDetail(selected);
  }
  if (Date.now() - lastRainCheck > 10 * 60 * 1000) {
    lastRainCheck = Date.now();
    loadRain(me).then(sum => { $('rain-banner').hidden = !shouldWarn(sum); if (sum) $('rain-banner').textContent = rainWarning(sum); });
  }
}, toast);

// ---------- 360° walk-through ----------
let viewer = null, readoutTimer = null, lastFocus = null;
function openTour(s) {
  const t = tours[s.id];
  lastFocus = document.activeElement;
  $('pano').hidden = false;
  $('pano-title').textContent = s.name;
  if (!window.pannellum) { closeTour(); return toast('The 360° viewer could not load. Check your internet and try again.'); }
  viewer = window.pannellum.viewer('pano-view', {
    default: { firstScene: t.firstScene, sceneFadeDuration: 600, autoLoad: true, compass: false },
    scenes: Object.fromEntries(Object.entries(t.scenes).map(([id, sc]) => [id, { ...sc, type: 'equirectangular' }])),
  });
  viewer.on('scenechange', id => { $('pano-title').textContent = t.scenes[id].title; });
  $('pano-title').textContent = t.scenes[t.firstScene].title;
  // yaw/pitch readout helps place arrows (see TOURS.md)
  readoutTimer = setInterval(() => {
    $('pano-readout').textContent = `yaw ${Math.round(viewer.getYaw())} · pitch ${Math.round(viewer.getPitch())}`;
  }, 200);
  $('pano-close').focus();
}
function closeTour() {
  if ($('pano').hidden) return;
  clearInterval(readoutTimer);
  viewer?.destroy(); viewer = null;
  $('pano').hidden = true;
  lastFocus?.focus();
}
$('pano-close').addEventListener('click', closeTour);
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('pano').hidden) closeTour(); else closeDetail(); });

// ---------- misc ----------
let toastTimer;
function toast(msg) {
  $('toast').textContent = msg; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}

renderList();
// map.html#chocolate-hills opens that spot (used by the home page's photo panels)
const fromHash = spots.find(s => s.id === location.hash.slice(1));
if (fromHash) select(fromHash, true);
