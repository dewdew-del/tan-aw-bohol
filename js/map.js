// Map page: full interactive map with search, filters, distances, rain, location and 360° walk-throughs.
import { spots } from './spots.js';
import { tours } from './tours.js';
import { haversineKm, roadKm, nearest, shouldWarn } from './lib.js';
import { loadRain, rainHtml, rainWarning } from './rain.js';
import { createBoholMap, islandBounds, spotIcon, meIcon, watchLocation } from './basemap.js';

const L = window.L;
const $ = id => document.getElementById(id);
const TAGBILARAN = { lat: 9.6539, lon: 123.866, name: 'Tagbilaran City' };

let me = null;              // {lat, lon} from GPS
let selected = null;        // spot
let category = 'All';
const markers = new Map();  // id -> marker

// ---------- map ----------
const map = createBoholMap('map');
// fit the whole island, leaving room for the floating list panel on wide screens
const showIsland = (animate = true) => map.fitBounds(islandBounds, {
  paddingTopLeft: [20, 20],
  paddingBottomRight: [getComputedStyle(document.querySelector('.tools')).position === 'absolute' ? 350 : 20, 20],
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

// ---------- filters, list ----------
const types = ['All', ...new Set(spots.map(s => s.type))];
$('chips').innerHTML = types.map(t =>
  `<button class="chip" type="button" data-t="${t}" aria-pressed="${t === 'All'}">${t}</button>`).join('');
$('chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  category = b.dataset.t;
  for (const c of $('chips').children) c.setAttribute('aria-pressed', c === b);
  renderList();
});
$('search').addEventListener('input', renderList);

function fromPoint() {
  const v = $('from').value;
  if (v === 'me') return me && { ...me, name: 'your location' };
  if (v === 'tagb') return TAGBILARAN;
  return spots.find(s => s.id === v);
}
function renderFrom() {
  const cur = $('from').value || 'tagb';
  $('from').innerHTML =
    `<option value="tagb">Tagbilaran City</option>` +
    `<option value="me" ${me ? '' : 'disabled'}>My location${me ? '' : ' (turn on location)'}</option>` +
    spots.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  $('from').value = cur === 'me' && !me ? 'tagb' : cur;
}
$('from').addEventListener('change', () => { renderList(); if (selected) renderDetail(selected); });

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const from = fromPoint();
  const shown = spots.filter(s =>
    (category === 'All' || s.type === category) &&
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
for (const listId of ['list', 'nearby-list']) {
  $(listId).addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (b) select(spots.find(s => s.id === b.dataset.id), true);
  });
}

// ---------- detail ----------
function select(s, fly = false) {
  selected = s;
  history.replaceState(null, '', '#' + s.id);
  renderDetail(s);
  if (fly) {
    // centre the spot in the free space beside the detail card, not behind it
    const z = 11.5, card = $('detail').offsetWidth, free = map.getSize().x - card;
    const shift = free > 200 ? card / 2 : 0;
    map.flyTo(map.unproject(map.project([s.lat, s.lon], z).subtract([shift, 0]), z), z, { duration: 0.8 });
  }
  renderList();
}

function renderDetail(s) {
  const from = fromPoint();
  const km = from && from.id !== s.id ? haversineKm(from, s) : null;
  const bg = s.img ? `background-image:linear-gradient(transparent 55%,rgba(10,30,34,.35)),url('${s.img}')` : 'background-image:linear-gradient(135deg,#0e7c86,#0a4f57)';
  $('detail').hidden = false;
  $('detail').innerHTML = `
    <button class="x" id="close-detail" type="button" aria-label="Close">&times;</button>
    <div class="ph2" style="${bg}">${s.img ? '' : s.type}</div>
    <div class="body">
      <span class="tag">${s.type}</span>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
      ${km != null ? `<div class="dist"><div><b>${km.toFixed(1)} km</b><span>straight line</span></div><div><b>~${Math.round(roadKm(km))} km</b><span>by road (estimate)</span></div></div>
      <span class="note">From ${from.name}</span>` : ''}
      <div class="rain" id="rain-box" aria-live="polite">Checking the chance of rain…</div>
      ${tours[s.id] ? '<button class="walk" type="button" id="walk">🚶 Walk around in 360°</button>' : ''}
    </div>`;
  $('close-detail').onclick = () => {
    $('detail').hidden = true; selected = null;
    history.replaceState(null, '', location.pathname);
    renderList(); showIsland();
  };
  if (tours[s.id]) $('walk').onclick = () => openTour(s);
  loadRain(s).then(sum => { if (selected === s) $('rain-box').innerHTML = rainHtml(sum); });
}

// ---------- location ----------
let meMarker = null, lastRainCheck = 0;
watchLocation(p => {
  const first = !me;
  me = p;
  if (!meMarker) meMarker = L.marker([me.lat, me.lon], { icon: meIcon(), zIndexOffset: 2000 }).addTo(map).bindTooltip('You are here');
  else meMarker.setLatLng([me.lat, me.lon]);
  if (first) {
    if (!selected) map.flyTo([me.lat, me.lon], 11);
    renderFrom(); $('from').value = 'me';
    renderList(); if (selected) renderDetail(selected);
  }
  $('nearby').hidden = false;
  $('nearby-list').innerHTML = nearest(me, spots, 5).map(({ spot, km }) =>
    `<li><button type="button" data-id="${spot.id}"><span>${spot.name}</span><small>${roadKm(km)} km</small></button></li>`).join('');
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTour(); });

// ---------- misc ----------
let toastTimer;
function toast(msg) {
  $('toast').textContent = msg; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}

renderFrom();
renderList();
// map.html#chocolate-hills opens that spot (used by the home page's photo panels)
const fromHash = spots.find(s => s.id === location.hash.slice(1));
if (fromHash) select(fromHash, true);
