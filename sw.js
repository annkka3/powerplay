/* Service worker: keeps the app on the device so it opens without internet.
   Page, scripts and styles: network first (updates arrive at once), cache when offline or slow.
   Libraries, icons, fonts: cache first. Firebase traffic is never touched. */
// The cache name has its own prefix: both apps live on annkka3.github.io and share Cache Storage, so a generic
// 'shell-' prefix would let one app's cleanup delete the other's cache.
const VERSION = 'v1';
const PREFIX = 'pp-shell-';
const CACHE = PREFIX + VERSION;
const CORE = [
  './', 'index.html', 'config.js', 'store.js', 'manifest.webmanifest', 'css/style.css',
  'js/vocab.js', 'js/verbs_data.js', 'js/art_files.js', 'js/audio-manifest.js', 'js/audio.js', 'js/core.js', 'js/game.js', 'js/ui.js',
  'js/practice.js', 'js/grammar.js', 'js/words.js', 'js/school.js', 'js/parent.js', 'js/main.js',
  'data/grammar.json', 'data/school.enc.json',
  'vendor/firebase-app.js', 'vendor/firebase-auth.js', 'vendor/firebase-firestore.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
const fromCache = req => caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }));
function networkFirst(req) {
  return new Promise(resolve => {
    let settled = false;
    const fallback = () => fromCache(req).then(hit => hit || caches.open(CACHE).then(c => c.match('index.html')));
    const timer = setTimeout(() => { if (!settled) { settled = true; fallback().then(r => r ? resolve(r) : fetch(req).then(resolve)); } }, 4000);
    fetch(req).then(res => { clearTimeout(timer); put(req, res); if (!settled) { settled = true; resolve(res); } })
      .catch(() => { clearTimeout(timer); if (!settled) { settled = true; fallback().then(r => resolve(r || Response.error())); } });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !font) return;
  const shell = same && (req.mode === 'navigate' || (/\.(html|js|css|webmanifest|json)$/.test(url.pathname) && !url.pathname.includes('/vendor/')) || url.pathname.endsWith('/'));
  if (shell) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(fromCache(req).then(hit => hit || fetch(req).then(res => put(req, res))));
});
