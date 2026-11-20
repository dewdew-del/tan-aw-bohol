// Home page: popular places, a still preview of the map, and the rain-near-you warning.
import { spots } from './spots.js';
import { tours } from './tours.js';
import { shouldWarn } from './lib.js';
import { loadRain, rainWarning } from './rain.js';
import { createBoholMap, islandBounds, spotIcon, meIcon, watchLocation } from './basemap.js';

const L = window.L;
const $ = id => document.getElementById(id);

// hero video: show the still poster instead for people who turned off motion or save mobile data
if (matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) {
  const v = $('hero-video'); v.removeAttribute('autoplay'); v.preload = 'none'; v.pause();
}

// ---------- popular places (each opens that spot on the map page) ----------
$('panels').innerHTML = spots.filter(s => s.img).map(s =>
  `<a class="ph" href="map.html#${s.id}"><img src="${s.img}" alt="${s.name}" loading="lazy"><span class="cap"><span class="kicker">${s.type}${tours[s.id] ? ' · 360° walk' : ''}</span><b>${s.name}</b><span>${s.desc.split('. ')[0]}.</span></span></a>`).join('');

// ---------- map preview (not draggable; the whole card links to the map page) ----------
const map = createBoholMap('preview-map', { interactive: false });
const fit = () => map.fitBounds(islandBounds, { padding: [16, 16], animate: false });
fit();
addEventListener('resize', fit);
for (const s of spots) L.marker([s.lat, s.lon], { icon: spotIcon(s, { has360: !!tours[s.id] }), interactive: false, keyboard: false }).addTo(map);

// ---------- location: blue dot on the preview + rain warning ----------
let meMarker = null, checked = false;
watchLocation(p => {
  if (!meMarker) meMarker = L.marker([p.lat, p.lon], { icon: meIcon(), interactive: false, zIndexOffset: 2000 }).addTo(map);
  else meMarker.setLatLng([p.lat, p.lon]);
  if (checked) return;
  checked = true;
  loadRain(p).then(sum => { $('rain-banner').hidden = !shouldWarn(sum); if (sum) $('rain-banner').textContent = rainWarning(sum); });
}, msg => {
  $('toast').textContent = msg; $('toast').hidden = false;
  setTimeout(() => { $('toast').hidden = true; }, 5000);
});

// ---------- scroll reveal (same feel as the original site) ----------
(function reveal() {
  const els = [...document.querySelectorAll('.sec, .ph, .preview, .foot')];
  els.forEach(e => {
    e.classList.add('rv');
    if (e.classList.contains('ph')) e.style.setProperty('--d', ([...e.parentNode.children].indexOf(e) % 3) * 0.12 + 's');
    if (e.getBoundingClientRect().top > innerHeight) e.classList.add('pre');
  });
  if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.remove('pre'));
  const io = new IntersectionObserver(es => es.forEach(x => x.target.classList.toggle('pre', !x.isIntersecting)), { threshold: 0.2 });
  els.forEach(e => io.observe(e));
})();
