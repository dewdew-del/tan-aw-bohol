import { spots } from './spots.js';
import { tours } from './tours.js';
import { haversineKm, roadKm, nearest, rainSummary, shouldWarn } from './lib.js';

const L = window.L;
const $ = id => document.getElementById(id);
const TAGBILARAN = { lat: 9.6539, lon: 123.866, name: 'Tagbilaran City' };
const COLORS = {
  Heritage: '#6b3f23', Nature: '#3d8b37', Beach: '#e8a33d', Marine: '#0e7c86', Cave: '#6c5b7b',
  Waterfall: '#2f80c9', River: '#3fa7b5', Wildlife: '#8c6d1f', Adventure: '#c0392b', Food: '#d35d8c',
};
const color = t => COLORS[t] || '#5a6f74';

let me = null;              // {lat, lon} from GPS
let selected = null;        // spot
let category = 'All';
const markers = new Map();  // id -> marker

// ---------- map ----------
const map = L.map('map', { zoomControl: true }).setView([9.85, 124.15], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18, attribution: '© OpenStreetMap contributors',
}).addTo(map);

for (const s of spots) {
  const m = L.circleMarker([s.lat, s.lon], {
    radius: 8, color: '#fff', weight: 2, fillColor: color(s.type), fillOpacity: 1,
  }).addTo(map).bindTooltip(s.name + (tours[s.id] ? ' · 360°' : ''));
  m.on('click', () => select(s));
  markers.set(s.id, m);
}

// ---------- filters, list ----------
const types = ['All', ...new Set(spots.map(s => s.type))];
$('chips').innerHTML = types.map(t =>
  `<button class="chip" type="button" data-t="${t}" aria-pressed="${t === 'All'}">${t === 'All' ? '' : `<span class="dot" style="background:${color(t)}"></span>`}${t}</button>`).join('');
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
    markers.get(s.id).setStyle({ opacity: on ? 1 : 0, fillOpacity: on ? 1 : 0 });
    markers.get(s.id).getElement()?.style.setProperty('pointer-events', on ? 'auto' : 'none');
  }
  $('count').textContent = `(${shown.length})`;
  $('list').innerHTML = shown.map(s => {
    const km = from && from.id !== s.id ? `${roadKm(haversineKm(from, s))} km` : '';
    return `<li><button type="button" data-id="${s.id}"><span><span class="dot" style="background:${color(s.type)}"></span>${s.name}${tours[s.id] ? '<span class="badge360">360°</span>' : ''}</span><small>${km}</small></button></li>`;
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
  $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderDetail(s) {
  const from = fromPoint();
  const km = from && from.id !== s.id ? haversineKm(from, s) : null;
  const hero = s.img
    ? `background-image:linear-gradient(transparent 55%,rgba(0,0,0,.4)),url('${s.img}')`
    : `background:linear-gradient(135deg,${color(s.type)},#14262b)`;
  $('detail').hidden = false;
  $('detail').innerHTML = `
    <div class="hero" style="${hero}"><span>${s.type}</span></div>
    <div class="body">
      <h2>${s.name}</h2>
      <p>${s.desc}</p>
      ${km != null ? `<p class="meta">≈ ${km.toFixed(1)} km straight line · about ${roadKm(km)} km by road from ${from.name}</p>` : ''}
      <div class="rain" id="rain-box">Checking the chance of rain…</div>
      <div class="actions">
        ${tours[s.id] ? '<button class="btn btn-primary" type="button" id="walk">🚶 Walk around (360°)</button>' : ''}
        <button class="btn" type="button" id="close-detail">Close</button>
      </div>
    </div>`;
  $('close-detail').onclick = () => { $('detail').hidden = true; selected = null; };
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
      const r = await fetch(url);
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
$('locate').addEventListener('click', () => {
  if (!('geolocation' in navigator)) return toast('Your browser does not support location.');
  if (watchId != null) { if (me) map.flyTo([me.lat, me.lon], 13); return; }
  $('locate').textContent = '📍 Finding you…';
  watchId = navigator.geolocation.watchPosition(onPosition, err => {
    navigator.geolocation.clearWatch(watchId); watchId = null;
    $('locate').textContent = '📍 Show my location';
    toast(err.code === 1 ? 'Location is blocked. Allow it in your browser settings to see where you are.'
      : 'Could not find your location. Try again outside or with GPS on.');
  }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
});

function onPosition(pos) {
  const first = !me;
  me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
  $('locate').textContent = '📍 My location';
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

renderFrom();
renderList();
