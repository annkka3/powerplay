'use strict';
/* Power Play core: DOM helpers, dates, state (local first, one copy per account), spaced repetition,
   English answer checking, speech, cloud sync. */

/* ---------- tiny DOM helpers ---------- */
const $ = (s, e) => (e || document).querySelector(s);
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(p => { if (p.startsWith('--')) e.style.setProperty(p, v[p]); else e.style[p] = v[p]; });
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return e;
}
const pad2 = n => String(n).padStart(2, '0');
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function plural(n, a, b, c) { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }
// **bold** inside our own texts → <b>
function rich(text) {
  const out = [];
  String(text || '').split(/(\*\*[^*]+\*\*)/).forEach(p => { if (/^\*\*.+\*\*$/.test(p)) out.push(el('b', null, p.slice(2, -2))); else if (p) out.push(p); });
  return out;
}

/* ---------- dates ---------- */
function dstr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
const today = () => dstr();
function addDays(ds, n) { const [y, m, d] = ds.split('-').map(Number); return dstr(new Date(y, m - 1, d + n)); }
function daysBetween(a, b) { const f = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((f(b) - f(a)) / 864e5); }
function weekStart(ds) { const [y, m, d] = (ds || today()).split('-').map(Number); const dt = new Date(y, m - 1, d); const wd = (dt.getDay() + 6) % 7; return addDays(dstr(dt), -wd); }
function whenLabel(ds) {
  const n = daysBetween(today(), ds);
  if (n <= 0) return 'сегодня';
  if (n === 1) return 'завтра';
  return `через ${n} ${plural(n, 'день', 'дня', 'дней')}`;
}

/* ---------- state ---------- */
const LS_ANON = 'pp_state_v1', LS_UID = 'pp_last_uid', DEV_KEY = 'pp_dev_v1';
const defCfg = () => ({ name: '', num: 19, ipa: true, newWords: 8, newVerbs: 5, school: '', pin: '', onboarded: false });
const freshState = () => ({ v: 1, cfg: defCfg(), cfgT: 0, cards: {}, days: {}, gr: {}, sc: {}, ach: {}, goal: null, msgs: [], seen: {}, log: [], cm: {}, rst: 0 });
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
const keyFor = u => (u ? LS_ANON + '_' + u : LS_ANON);
function parseState(raw) {
  try {
    const s = JSON.parse(raw);
    if (s && s.v === 1) { const f = freshState(); Object.keys(f).forEach(k => { if (s[k] == null) s[k] = f[k]; }); s.cfg = Object.assign(defCfg(), s.cfg); return s; }
  } catch (e) { /* ignore */ }
  return null;
}
let CUR_UID = lsGet(LS_UID) || null;
let S = parseState(lsGet(keyFor(CUR_UID))) || freshState();
const saveLocal = () => lsSet(keyFor(CUR_UID), JSON.stringify(S));
const hasProgress = s => Object.keys(s.cards).length > 0 || Object.keys(s.days).length > 0;
function switchAccount(u) {
  if (u === CUR_UID) return;
  saveLocal();
  const outgoing = S, wasAnon = CUR_UID === null;
  CUR_UID = u;
  if (u) lsSet(LS_UID, u); else lsDel(LS_UID);
  let incoming = parseState(lsGet(keyFor(u)));
  if (!incoming) {
    if (u && wasAnon && hasProgress(outgoing)) { incoming = outgoing; lsSet(keyFor(null), JSON.stringify(freshState())); }
    else incoming = freshState();
  }
  S = incoming; Dirty.clear();
  saveLocal();
}
let DEV = (() => { let d = {}; try { d = JSON.parse(lsGet(DEV_KEY)) || {}; } catch (e) { /* ignore */ } return Object.assign({ voice: '', rate: 0.9, loud: true }, d); })();
function saveDev() { lsSet(DEV_KEY, JSON.stringify(DEV)); }

// what changed since the last cloud write
const Dirty = { cards: new Set(), main: false, gr: false, sc: false, clear() { this.cards.clear(); this.main = this.gr = this.sc = false; } };
function persist() { saveLocal(); Cloud.soon(); }
function setCfg(patch) { Object.assign(S.cfg, patch); S.cfgT = Date.now(); Dirty.main = true; persist(); }

/* ---------- daily record: answers, active time, XP, the three shifts ---------- */
function dayRec(d) { d = d || today(); if (!S.days[d]) S.days[d] = { a: 0, k: 0, sec: 0, xp: 0, sh: {}, t: 0 }; return S.days[d]; }
let lastAct = 0;
// Counts active time: the gap since the previous answer, capped so a phone left on the table does not count.
function tick() {
  const now = Date.now(), d = dayRec();
  if (lastAct && now - lastAct < 90000) d.sec += Math.round(Math.min(now - lastAct, 60000) / 1000);
  else d.sec += 8;
  lastAct = now; d.t = now; Dirty.main = true;
}
function logEvent(kind, id, ok, extra) {
  S.log.push(Object.assign({ id: uid(), t: Date.now(), k: kind, i: id, ok: ok ? 1 : 0 }, extra || {}));
  if (S.log.length > 400) S.log = S.log.slice(-400);
  Dirty.gr = true;
}
function countAnswer(ok) { const d = dayRec(); d.a++; if (ok) d.k++; tick(); }

/* ---------- spaced repetition for words and irregular verbs (Leitner boxes) ---------- */
// box 1..6 → interval in days; box ≥5 counts as learned
const INT = [0, 1, 2, 4, 7, 14, 30];
const isDue = r => r && r.b >= 1 && r.due <= today();
function statusOf(id) { const r = S.cards[id]; if (!r || r.b < 1) return 'new'; if (r.b <= 2) return 'learning'; if (r.b <= 4) return 'review'; return 'strong'; }
// grade: 3 = clean, 2 = with help or a typo, 0 = missed
function applyGrade(id, grade) {
  const r = S.cards[id] || { b: 0, n: 0, l: 0, c: 0, h: 0, f: today(), t: 0, due: today() };
  r.n++; r.t = Date.now();
  if (grade === 3) { r.b = Math.min(6, r.b + 1); r.c++; if (r.c >= 2) r.h = 0; }
  else if (grade === 2) { r.b = Math.max(1, r.b); r.c = 0; }
  else { r.b = 1; r.c = 0; r.h = 1; r.l++; }
  r.due = addDays(today(), grade === 2 ? Math.max(1, Math.ceil(INT[r.b] / 2)) : INT[r.b]);
  S.cards[id] = r; Dirty.cards.add(id);
  return r;
}

/* ---------- checking English answers ---------- */
// Case, the final punctuation, commas, curly apostrophes and contractions do not matter: doesn't = does not.
function normEn(s) {
  s = String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[–—]/g, '-');
  s = s.replace(/\bcan't\b/g, 'can not').replace(/\bcannot\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not').replace(/\bi'm\b/g, 'i am').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will')
    // he's = he is, I'd = I would: both sides are normalised the same way, so listed full forms still match
    .replace(/\b(he|she|it|that|there|what|where|who|here|how|let)'s\b/g, (m, w) => (w === 'let' ? 'let us' : w + ' is')).replace(/\b(i|you|he|she|we|they)'d\b/g, '$1 would');
  s = s.replace(/(^|\s)-(\s|$)/g, '$1-$2');
  return s.replace(/[.,!?;:"“”«»()\[\]…]/g, ' ').replace(/\s+/g, ' ').trim();
}
const sameEn = (a, b) => normEn(a) === normEn(b);
const okAny = (typed, list) => [].concat(list).some(x => sameEn(typed, x));
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
// one letter off in a long single word: a typo, not a grammar mistake (used only for word cards)
const isTypo = (typed, list) => { const t = normEn(typed); return t.length >= 5 && [].concat(list).some(x => lev(t, normEn(x)) === 1); };

/* ---------- speech ---------- */
const TTS = { voices: [] };
function loadVoices() { if ('speechSynthesis' in window) TTS.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); }
if ('speechSynthesis' in window) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) { speechSynthesis.onvoiceschanged = loadVoices; } }
function bestVoice() {
  if (DEV.voice) { const v = TTS.voices.find(x => x.voiceURI === DEV.voice); if (v) return v; }
  const sc = v => (/en[-_]US/i.test(v.lang) ? 100 : 0) + (/premium|enhanced|siri/i.test(v.name + v.voiceURI) ? 40 : 0) + (v.localService ? 10 : 0) + (/samantha|ava|allison|nathan|tom/i.test(v.name) ? 5 : 0);
  return TTS.voices.slice().sort((a, b) => sc(b) - sc(a))[0] || null;
}
let curUtt = null, unlocked = false;
function audioMode() { try { if (navigator.audioSession) navigator.audioSession.type = DEV.loud ? 'playback' : 'auto'; } catch (e) { /* not supported */ } if (!DEV.loud) AudioPlayer.stop(); }
function unlockSpeech() {
  AudioPlayer.unlock();
  if (!unlocked && 'speechSynthesis' in window) { unlocked = true; try { const u = new SpeechSynthesisUtterance(''); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignore */ } }
}
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockSpeech, { capture: true, passive: true }));
audioMode();
function speakTTS(text, slow) {
  const ss = window.speechSynthesis;
  if (!ss) { toast('Этот браузер не умеет озвучивать.'); return; }
  try {
    if (!TTS.voices.length) loadVoices();
    const u = new SpeechSynthesisUtterance(String(text).replace(/ \/ /g, ', ').replace(/___/g, 'blank'));
    const v = bestVoice();
    u.lang = v ? v.lang : 'en-US'; if (v) u.voice = v;
    u.rate = slow ? Math.max(0.45, DEV.rate - 0.3) : DEV.rate;
    curUtt = u;
    if (ss.resume) ss.resume();
    if (ss.speaking || ss.pending) { ss.cancel(); setTimeout(() => ss.speak(u), 80); } else ss.speak(u);
  } catch (e) { /* ignore */ }
}
// Recorded clip when there is one (plays through the iPhone silent switch), otherwise the device voice.
function speak(text, slow) {
  if (!text) return;
  if (DEV.loud && AudioPlayer.has(text)) {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    AudioPlayer.play(text, slow).catch(() => speakTTS(text, slow));
  } else { AudioPlayer.stop(); speakTTS(text, slow); }
}

/* ---------- toast ---------- */
let toastTm;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', class: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTm); toastTm = setTimeout(() => t.classList.remove('on'), 2800);
}

/* ---------- merging progress between devices ---------- */
// Records with a time stamp `t`: the newer one wins. Records older than a reset are dropped.
function mergeMap(local, remote) {
  let changed = false;
  Object.keys(remote || {}).forEach(k => { const y = remote[k], x = local[k]; if (y && (y.t || 0) >= S.rst && (!x || (y.t || 0) > (x.t || 0))) { local[k] = y; changed = true; } });
  return changed;
}
function adoptCard(id, d) {
  if (!d || (d.t || 0) < S.rst) return false;
  const l = S.cards[id];
  if (!l || (d.t || 0) > (l.t || 0)) { S.cards[id] = d; return true; }
  return false;
}
function adoptMain(d) {
  if (!d) return false;
  const before = JSON.stringify([S.cfg, S.days, S.ach, S.goal, S.msgs, S.seen, S.cm, S.rst]);
  S.rst = Math.max(S.rst || 0, d.rst || 0);
  if ((d.cfgT || 0) > (S.cfgT || 0)) { S.cfg = Object.assign(defCfg(), d.cfg); S.cfgT = d.cfgT; }
  Object.keys(d.days || {}).forEach(k => {
    const y = d.days[k]; if ((y.t || 0) < S.rst) return;
    const x = S.days[k];
    if (!x) { S.days[k] = y; return; }
    ['a', 'k', 'sec', 'xp'].forEach(f => { x[f] = Math.max(x[f] || 0, y[f] || 0); });
    x.sh = Object.assign({}, y.sh || {}, x.sh || {}); x.t = Math.max(x.t || 0, y.t || 0);
  });
  mergeMap(S.ach, d.ach); mergeMap(S.seen, d.seen); mergeMap(S.cm, d.cm);
  if (d.goal && (!S.goal || (d.goal.t || 0) > (S.goal.t || 0))) S.goal = d.goal;
  const ids = new Set(S.msgs.map(m => m.id));
  (d.msgs || []).forEach(m => { const i = S.msgs.findIndex(x => x.id === m.id); if (i < 0) { if (!ids.has(m.id)) S.msgs.push(m); } else if ((m.t || 0) > (S.msgs[i].t || 0)) S.msgs[i] = m; });
  Object.keys(S.cards).forEach(id => { if ((S.cards[id].t || 0) < S.rst) delete S.cards[id]; });
  return before !== JSON.stringify([S.cfg, S.days, S.ach, S.goal, S.msgs, S.seen, S.cm, S.rst]);
}
function adoptGr(d) {
  if (!d) return false;
  const before = JSON.stringify([S.gr, S.log.length]);
  mergeMap(S.gr, d.topics);
  const seen = new Set(S.log.map(l => l.id));
  (d.log || []).forEach(l => { if (!seen.has(l.id) && (l.t || 0) >= S.rst) { S.log.push(l); seen.add(l.id); } });
  S.log.sort((a, b) => a.t - b.t); if (S.log.length > 400) S.log = S.log.slice(-400);
  return before !== JSON.stringify([S.gr, S.log.length]);
}
function adoptSc(d) { return d ? mergeMap(S.sc, d.ex) : false; }
const mainPayload = () => JSON.parse(JSON.stringify({ v: 1, cfg: S.cfg, cfgT: S.cfgT, days: S.days, ach: S.ach, goal: S.goal, msgs: S.msgs, seen: S.seen, cm: S.cm, rst: S.rst }));

/* ---------- cloud sync (Firebase; same project as the family's other apps, own branch en_*) ---------- */
const Cloud = {
  api: null, user: null, status: 'local', tm: null, remote: {}, first: {}, unsubs: [],
  configured: !!window.FIREBASE_CONFIG,
  soon() { if (!this.api) return; clearTimeout(this.tm); this.tm = setTimeout(() => this.flush(), 1200); },
  flush() {
    if (!this.api) return;
    Dirty.cards.forEach(id => { const r = S.cards[id]; if (r) this.api.setCard(id, r); });
    Dirty.cards.clear();
    if (Dirty.main) { this.api.setDoc('main', mainPayload()); Dirty.main = false; }
    if (Dirty.gr) { this.api.setDoc('gr', JSON.parse(JSON.stringify({ topics: S.gr, log: S.log }))); Dirty.gr = false; }
    if (Dirty.sc) { this.api.setDoc('sc', JSON.parse(JSON.stringify({ ex: S.sc }))); Dirty.sc = false; }
  },
  setStatus(meta) { this.status = !navigator.onLine ? 'offline' : (meta && (meta.hasPendingWrites || meta.fromCache)) ? 'syncing' : 'synced'; refreshBadge(); },
  fail(e) { this.status = (e && e.code === 'permission-denied') ? 'denied' : 'error'; refreshBadge(); },
  attach(user, api) {
    this.detach(); this.user = user; this.api = api; this.status = 'syncing'; this.remote = {}; this.first = { cards: true, main: true, gr: true, sc: true };
    refreshBadge();
    this.unsubs.push(api.onCards((changes, meta) => {
      let changed = false;
      changes.forEach(ch => { if (ch.type === 'removed') return; this.remote[ch.id] = (ch.data && ch.data.t) || 0; if (adoptCard(ch.id, ch.data)) changed = true; });
      if (this.first.cards && !meta.fromCache) {
        this.first.cards = false;
        Object.keys(S.cards).forEach(id => { if (!(id in this.remote) || (S.cards[id].t || 0) > this.remote[id]) Dirty.cards.add(id); });
        this.flush();
      }
      if (changed) { saveLocal(); onRemoteChange(); }
      this.setStatus(meta);
    }, e => this.fail(e)));
    [['main', adoptMain], ['gr', adoptGr], ['sc', adoptSc]].forEach(([name, adopt]) => {
      this.unsubs.push(api.onDoc(name, (data, meta) => {
        const changed = adopt(data);
        if (this.first[name] && !meta.fromCache) { this.first[name] = false; Dirty[name] = true; this.flush(); }
        if (changed) { saveLocal(); onRemoteChange(); }
        this.setStatus(meta);
      }, e => this.fail(e)));
    });
  },
  detach() { this.unsubs.forEach(u => { try { u(); } catch (e) { /* ignore */ } }); this.unsubs = []; this.api = null; this.user = null; this.status = 'local'; },
};
window.__onAuth = (user, api) => {
  if (user && api) { switchAccount(user.uid); Cloud.attach(user, api); } else { Cloud.detach(); switchAccount(null); }
  refreshBadge(); if (typeof render === 'function' && !OV) render();
};
window.addEventListener('online', () => { if (Cloud.api) { Cloud.status = 'syncing'; refreshBadge(); Cloud.flush(); } });
window.addEventListener('offline', () => { if (Cloud.api) { Cloud.status = 'offline'; refreshBadge(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) Cloud.flush(); });

/* ---------- backup and reset ---------- */
const exportCode = () => JSON.stringify(S);
function importCode(txt) {
  const o = JSON.parse(txt);
  if (!o || o.v !== 1 || typeof o.cards !== 'object') throw new Error('bad');
  Object.keys(o.cards).forEach(id => { if (adoptCard(id, o.cards[id])) Dirty.cards.add(id); });
  adoptMain(o); adoptGr({ topics: o.gr, log: o.log }); adoptSc({ ex: o.sc });
  Dirty.main = Dirty.gr = Dirty.sc = true; persist();
}
function resetAll() {
  const keep = Object.assign({}, S.cfg), keepT = S.cfgT;
  S = freshState(); S.cfg = keep; S.cfgT = Math.max(keepT, Date.now()); S.rst = Date.now();
  Dirty.clear(); Dirty.main = Dirty.gr = Dirty.sc = true; persist();
}
