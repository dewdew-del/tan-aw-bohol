// The illustrated Bohol map shared by the home preview and the map page:
// green island with a beach rim and shallow water, hills, forests, towns, seas, boats and icon pins.
import { MAIN, PANG } from './coast.js';

const L = window.L;
const ll = ring => ring.map(([lon, lat]) => [lat, lon]);
export const islandBounds = L.latLngBounds(ll([...MAIN, ...PANG]));

export const ICONS = {
  Heritage: '⛪', Nature: '⛰️', Beach: '🏖️', Marine: '🐠', Cave: '🦇',
  Waterfall: '💧', River: '🛶', Wildlife: '🐒', Adventure: '🧗', Food: '🍯',
};

// small hand-drawn glyphs
const HILL = '<svg viewBox="0 0 30 18" width="26" height="16"><path d="M1 17Q15 -4 29 17Z" fill="#8a5a36"/><path d="M6 11Q11 4 15 3" stroke="#b98a5e" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const GREEN_HILL = '<svg viewBox="0 0 40 20" width="38" height="19"><path d="M1 19Q12 2 22 12Q30 4 39 19Z" fill="#7fae5f"/><path d="M8 12Q12 7 16 7" stroke="#a7cf86" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const TREE = '<svg viewBox="0 0 14 20" width="12" height="18"><rect x="6" y="13" width="2" height="6" fill="#6b3f23"/><path d="M7 1L1 14H13Z" fill="#3d8b37"/></svg>';
const BOAT = '<svg viewBox="0 0 30 26" width="28" height="24"><path d="M14 2V18H4Z" fill="#fff"/><path d="M16 5V18H25Z" fill="#f6efe0"/><path d="M2 19H28L24 25H6Z" fill="#6b3f23"/></svg>';

// seeded random so decorations land in the same place on every visit
function rand(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function scatter(n, [lat0, lat1], [lon0, lon1], seed) {
  const r = rand(seed);
  return Array.from({ length: n }, () => [lat0 + r() * (lat1 - lat0), lon0 + r() * (lon1 - lon0)]);
}

const TOWNS = [
  ['Tagbilaran', 9.665, 123.835], ['Carmen', 9.835, 124.215], ['Tubigon', 9.955, 123.965], ['Talibon', 10.13, 124.31],
  ['Ubay', 10.05, 124.47], ['Jagna', 9.66, 124.37], ['Guindulman', 9.765, 124.475], ['Inabanga', 10.02, 124.08],
  ['Loon', 9.81, 123.83], ['Panglao', 9.575, 123.775], ['Loboc', 9.655, 124.035], ['Anda', 9.755, 124.555],
];
const SEAS = [['Bohol Sea', 9.38, 124.15], ['Camotes Sea', 10.32, 124.0], ['Bohol Strait', 9.98, 123.66]];

export function createBoholMap(el, { interactive = true } = {}) {
  const map = L.map(el, {
    zoomControl: false, zoomSnap: 0.25, minZoom: 8, maxZoom: 17,
    maxBounds: islandBounds.pad(0.25), maxBoundsViscosity: 1, // can't drag Bohol off screen
    dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive,
    touchZoom: interactive, boxZoom: interactive, keyboard: interactive,
  });
  if (interactive) L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.attributionControl.setPrefix(false).addAttribution('Outlines © OpenStreetMap contributors · pins approximate');
  map.createPane('deco').style.zIndex = 450; // above land, below pins

  for (const ring of [MAIN, PANG].map(ll)) {
    L.polygon(ring, { stroke: true, color: '#9fdbe3', weight: 26, opacity: 0.55, fill: false, className: 'coast', interactive: false }).addTo(map); // shallow water
    L.polygon(ring, { stroke: true, color: '#f3e3b8', weight: 6, fill: false, className: 'coast', interactive: false }).addTo(map);                  // beach
    L.polygon(ring, { color: '#6f8f4e', weight: 1.2, fillColor: '#b9d88f', fillOpacity: 1, className: 'land', interactive: false }).addTo(map);
  }

  // Zoomed in close, swap the drawing for real streets so routes have roads under them.
  if (interactive) {
    // shortcut: uses the public OSM tile server (fine for light/school traffic); switch to a tile provider if the site gets busy
    map.createPane('streets').style.zIndex = 410; // above the drawn island, so the island shows while tiles load
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { pane: 'streets', minZoom: 13, maxZoom: 19, attribution: 'Streets © OpenStreetMap contributors' }).addTo(map);
    const streets = () => map.getContainer().classList.toggle('streets', map.getZoom() >= 13);
    map.on('zoomend', streets);
  }

  const deco = (latlng, html, size, cls = 'deco') =>
    L.marker(latlng, { pane: 'deco', interactive: false, keyboard: false, icon: L.divIcon({ className: cls, html, iconSize: size }) }).addTo(map);

  // Chocolate Hills around Carmen/Batuan/Sagbayan
  scatter(22, [9.79, 9.9], [124.07, 124.2], 7).forEach(p => deco(p, HILL, [26, 16]));
  // green uplands
  [[9.97, 124.22], [9.9, 124.33], [9.76, 124.3], [10.02, 124.32], [9.73, 124.16], [9.85, 123.98], [9.98, 124.0]].forEach(p => deco(p, GREEN_HILL, [38, 19]));
  // forests: Bilar man-made forest and Rajah Sikatuna, plus the east
  scatter(18, [9.66, 9.74], [124.05, 124.13], 3).forEach(p => deco(p, TREE, [12, 18]));
  scatter(12, [9.88, 9.98], [124.36, 124.45], 11).forEach(p => deco(p, TREE, [12, 18]));
  // boats
  [[9.45, 123.95], [10.22, 123.9], [9.55, 124.55], [9.5, 123.65]].forEach(p => deco(p, BOAT, [28, 24]));
  // labels
  TOWNS.forEach(([n, lat, lon]) => deco([lat, lon], `<span>${n}</span>`, [0, 0], 'town'));
  SEAS.forEach(([n, lat, lon]) => deco([lat, lon], `<span>${n}</span>`, [0, 0], 'sea-label'));
  deco([9.93, 124.2], '<span>BOHOL</span>', [0, 0], 'island-label');

  // compass
  const compass = L.control({ position: interactive ? 'bottomright' : 'topright' });
  compass.onAdd = () => Object.assign(L.DomUtil.create('div', 'compass'), {
    innerHTML: '<svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#6b3f23" stroke-width="1.5"/><path d="M20 5L24 20H16Z" fill="#c0392b"/><path d="M20 35L16 20H24Z" fill="#14262b"/></svg><b>N</b>',
  });
  compass.addTo(map);

  return map;
}

export function spotIcon(spot, { on = false, has360 = false } = {}) {
  return L.divIcon({
    className: '',
    html: `<div class="pin${on ? ' on' : ''}" title="${spot.name}"><span>${ICONS[spot.type] || '📍'}</span>${has360 ? '<i>360°</i>' : ''}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 41], // tip of the teardrop sits on the place
  });
}

export const meIcon = () => L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [16, 16] });

// Ask for the location as soon as the page opens; the browser shows its own permission prompt.
// Devices without GPS (most laptops) often fail high-accuracy requests even when location is allowed,
// so on "unavailable" or "timeout" before the first fix, retry once in normal (Wi-Fi) accuracy.
export function watchLocation(onPos, onFail, highAccuracy = true) {
  if (!('geolocation' in navigator)) return;
  let have = false;
  const id = navigator.geolocation.watchPosition(p => { have = true; onPos({ lat: p.coords.latitude, lon: p.coords.longitude }); }, err => {
    if (err.code === 3 && have) return; // brief GPS timeout after a fix: keep the last position
    navigator.geolocation.clearWatch(id);
    if (err.code !== 1 && highAccuracy && !have) return watchLocation(onPos, onFail, false);
    onFail(err.code === 1 ? 'Location is off. Allow it in your browser settings to see where you are and rain near you.'
      : 'Could not find your location. Check that location is turned on for your device (on Windows: Settings > Privacy & security > Location), then reload the page.');
  }, { enableHighAccuracy: highAccuracy, maximumAge: 30000, timeout: highAccuracy ? 20000 : 30000 });
}
