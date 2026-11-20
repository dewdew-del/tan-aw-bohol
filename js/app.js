import { spots } from './spots.js';
import { MAIN, PANG } from './coast.js';
import { tours } from './tours.js';
import { haversineKm, roadKm, nearest, rainSummary, shouldWarn } from './lib.js';

const L = window.L;
const $ = id => document.getElementById(id);
const TAGBILARAN = { lat: 9.6539, lon: 123.866, name: 'Tagbilaran City' };
const PIN = '#0e7c86', PIN_ON = '#6b3f23';

let me = null;              // {lat, lon} from GPS
let selected = null;        // spot
let category = 'All';
const markers = new Map();  // id -> marker

// ---------- map ----------
const map = L.map('map', { zoomControl: false, zoomSnap: 0.25 }).setView([9.85, 124.15], 10);
L.control.zoom({ position: 'bottomright' }).addTo(map); // left side is taken by the detail card
// Drawn island like the original site: beige land on a light-blue sea, no street tiles.
const land = { color: '#8a7a55', weight: 1.3, fillColor: '#e4dcc4', fillOpacity: 1, interactive: false };
for (const ring of [MAIN, PANG]) L.polygon(ring.map(([lon, lat]) => [lat, lon]), land).addTo(map);
map.attributionControl.setPrefix(false).addAttribution('Outlines © OpenStreetMap contributors · pins approximate');
map.setMaxBounds([[9.2, 123.3], [10.4, 124.9]]).setMinZoom(8).setMaxZoom(15);
const island = L.latLngBounds([...MAIN, ...PANG].map(([lon, lat]) => [lat, lon]));
// fit the whole island, leaving room for the floating list panel on wide screens
const showIsland = (animate = true) => map.fitBounds(island, {
  paddingTopLeft: [20, 20],
  paddingBottomRight: [getComputedStyle(document.querySelector('.tools')).position === 'absolute' ? 350 : 20, 20],
  animate,
});
showIsland(false);

for (const s of spots) {
  const m = L.circleMarker([s.lat, s.lon], {
    radius: 8, color: '#fff', weight: 2, fillColor: PIN, fillOpacity: 1,
  }).addTo(map).bindTooltip(s.name + (tours[s.id] ? ' · 360°' : ''));
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
    const on = shown.includes(s);
    markers.get(s.id).setStyle({ opacity: on ? 1 : 0, fillOpacity: on ? 1 : 0, fillColor: s === selected ? PIN_ON : PIN });
    markers.get(s.id).setRadius(s === selected ? 11 : 8);
    markers.get(s.id).getElement()?.style.setProperty('pointer-events', on ? 'auto' : 'none');
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
  if (fly) map.flyTo([s.lat, s.lon], 13, { duration: 0.8 });
  renderDetail(s);
  renderList();
  const r = document.querySelector('.mapbox').getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) document.querySelector('.mapbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  $('close-detail').onclick = () => { $('detail').hidden = true; selected = null; renderList(); showIsland(); };
  if (tours[s.id]) $('walk').onclick = () => openTour(s);
  loadRain(s).then(sum => { if (selected === s) $('rain-box').innerHTML = rainHtml(sum); });
}

// ---------- rain (Open-Meteo) ----------
const rainCache = new Map(); // "lat,lon" -> {at, hourly}
const manilaNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T');

async function loadRain(p) {
  const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
  const hit = rainCache.get(key);
  if (!hit || Date.now() - hit.at > 30 * 60 * 1000) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&hourly=precipitation_probability&forecast_days=2&timezone=Asia%2FManila`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) }); // weak mobile data: don't hang forever
      if (!r.ok) throw new Error(r.status);
      rainCache.set(key, { at: Date.now(), hourly: (await r.json()).hourly });
    } catch {
      if (!hit) return null; // offline: fall back to the older forecast if we have one
    }
  }
  return rainSummary(rainCache.get(key).hourly, manilaNow());
}

function rainHtml(sum) {
  if (!sum) return 'Rain forecast unavailable right now.';
  const word = sum.next3Max >= 70 ? 'Likely to rain' : sum.next3Max >= 50 ? 'Might rain' : sum.next3Max >= 20 ? 'Small chance of rain' : 'Rain unlikely';
  const hr = t => { const h = +t.slice(11, 13); return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`; };
  return `<strong>${sum.next3Max >= 50 ? '🌧️' : '⛅'} ${word}</strong> — ${sum.now}% now, up to ${sum.next3Max}% in the next 3 hours
    <div class="bars" aria-label="Chance of rain for the next 12 hours">${sum.next12.map(h => `<div style="height:${Math.max(h.p, 2)}%" title="${hr(h.time)}: ${h.p}%"></div>`).join('')}</div>
    <div class="hours"><span>${hr(sum.next12[0].time)}</span><span>${hr(sum.next12.at(-1).time)}</span></div>`;
}

// ---------- GPS ----------
let meMarker = null, watchId = null, lastRainCheck = 0;
// Ask for location as soon as the page opens; the browser shows its own permission prompt.
if ('geolocation' in navigator) {
  watchId = navigator.geolocation.watchPosition(onPosition, err => {
    if (err.code === 3 && me) return; // brief GPS timeout after a fix: keep the last position
    navigator.geolocation.clearWatch(watchId); watchId = null;
    toast(err.code === 1 ? 'Location is off. Allow it in your browser settings to see where you are and rain near you.'
      : 'Could not find your location. Turn on GPS and reload the page.');
  }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
}

function onPosition(pos) {
  const first = !me;
  me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
  if (!meMarker) {
    meMarker = L.marker([me.lat, me.lon], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [16, 16] }), zIndexOffset: 1000 })
      .addTo(map).bindTooltip('You are here');
  } else meMarker.setLatLng([me.lat, me.lon]);
  if (first) {
    map.flyTo([me.lat, me.lon], 12);
    renderFrom(); $('from').value = 'me';
    renderList(); if (selected) renderDetail(selected);
  }
  $('nearby').hidden = false;
  $('nearby-list').innerHTML = nearest(me, spots, 5).map(({ spot, km }) =>
    `<li><button type="button" data-id="${spot.id}"><span>${spot.name}</span><small>${roadKm(km)} km</small></button></li>`).join('');
  if (Date.now() - lastRainCheck > 10 * 60 * 1000) { lastRainCheck = Date.now(); checkRainNearMe(); }
}

async function checkRainNearMe() {
  const sum = await loadRain(me);
  const b = $('rain-banner');
  b.hidden = !shouldWarn(sum);
  if (!b.hidden) b.textContent = `🌧️ Heads up: ${sum.next3Max}% chance of rain near you in the next 3 hours. Bring an umbrella!`;
}

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

// ---------- photo panels ----------
$('panels').innerHTML = spots.filter(s => s.img).map(s =>
  `<button class="ph" type="button" data-id="${s.id}"><img src="${s.img}" alt="${s.name}" loading="lazy"><span class="cap"><b>${s.name}${tours[s.id] ? '<span class="badge360">360°</span>' : ''}</b><span>${s.desc.split('. ')[0]}.</span></span></button>`).join('');
$('panels').addEventListener('click', e => {
  const b = e.target.closest('.ph');
  if (b) select(spots.find(s => s.id === b.dataset.id), true);
});

// ---------- scroll reveal (same feel as the original site) ----------
(function reveal() {
  const els = [...document.querySelectorAll('.sec, .ph, .foot')];
  els.forEach(e => {
    e.classList.add('rv');
    if (e.classList.contains('ph')) e.style.setProperty('--d', ([...e.parentNode.children].indexOf(e) % 3) * 0.12 + 's');
    if (e.getBoundingClientRect().top > innerHeight) e.classList.add('pre');
  });
  if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.remove('pre'));
  const io = new IntersectionObserver(es => es.forEach(x => x.target.classList.toggle('pre', !x.isIntersecting)), { threshold: 0.2 });
  els.forEach(e => io.observe(e));
})();

renderFrom();
renderList();
