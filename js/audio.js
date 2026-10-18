'use strict';
/* Recorded voice. Every English text the app speaks has a short audio file named after a hash of the text
   (audio/<key>.m4a, made by tools/make_audio.py). Playing a file works through the iPhone silent switch,
   which the built-in device voice does not. Texts without a file fall back to the device voice. */
function clipText(t) { return String(t).replace(/ \/ /g, ', ').replace(/’/g, "'").replace(/\s+/g, ' ').trim(); }
function cyrb53(str, seed) {
  let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const clipKey = t => cyrb53(clipText(t)).toString(36);

const AudioPlayer = {
  el: null, urls: new Map(), seq: 0, unlocked: false,
  has(t) { return typeof CLIPS !== 'undefined' && CLIPS.has(clipKey(t)); },
  element() {
    if (!this.el) { this.el = new Audio(); this.el.preload = 'auto'; this.el.setAttribute('playsinline', ''); }
    return this.el;
  },
  // On iOS a media element must be started by a tap once; after that it can be played from code.
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const a = this.element();
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      const p = a.play(); if (p && p.catch) p.catch(() => { this.unlocked = false; });
    } catch (e) { this.unlocked = false; }
  },
  async url(key) {
    if (this.urls.has(key)) return this.urls.get(key);
    const r = await fetch('audio/' + key + '.m4a');
    if (!r.ok) throw new Error('clip ' + r.status);
    const u = URL.createObjectURL(await r.blob());
    this.urls.set(key, u);
    return u;
  },
  // iOS Safari can leave the microphone recogniser hanging after HTML audio has played, so let the element go first.
  release() {
    this.stop();
    try { if (this.el) { this.el.removeAttribute('src'); this.el.load(); } } catch (e) { /* ignore */ }
  },
  stop() {
    this.seq++;
    try { if (this.el) this.el.pause(); } catch (e) { /* ignore */ }
    if (this.finish) { const f = this.finish; this.finish = null; f(); }
  },
  // texts: one string or a list played one after another (several clips one after another)
  async play(texts, slow) {
    const list = [].concat(texts), id = ++this.seq, a = this.element();
    for (const t of list) {
      const u = await this.url(clipKey(t));
      if (id !== this.seq) return;
      a.src = u; a.playbackRate = slow ? 0.7 : 1;
      if ('preservesPitch' in a) a.preservesPitch = true; else if ('webkitPreservesPitch' in a) a.webkitPreservesPitch = true;
      const done = new Promise((res, rej) => { this.finish = res; a.onended = res; a.onerror = () => rej(new Error('audio error')); });
      await a.play();
      await done;
      if (id !== this.seq) return;
    }
  },
  // Fetch every clip once so the service worker keeps it for offline use.
  async download(onProgress) {
    const keys = Array.from(CLIPS); let done = 0, failed = 0, i = 0;
    const worker = async () => {
      while (i < keys.length) {
        const k = keys[i++];
        try { const r = await fetch('audio/' + k + '.m4a'); if (!r.ok) failed++; else await r.arrayBuffer(); } catch (e) { failed++; }
        done++; if (onProgress && done % 20 === 0) onProgress(done, keys.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    if (onProgress) onProgress(keys.length, keys.length);
    return { total: keys.length, failed };
  },
  async cached() {
    try {
      let n = 0;
      for (const name of await caches.keys()) {
        if (!name.startsWith('pp-shell-')) continue;
        const c = await caches.open(name);
        n = Math.max(n, (await c.keys()).filter(r => r.url.includes('/audio/')).length);
      }
      return n;
    } catch (e) { return 0; }
  },
};
