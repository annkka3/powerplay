// Collects every English text the app reads aloud and writes tools/audio_texts.json: [{key, text}].
// Mirrors itemTask (js/grammar.js), wordIntro/verbIntro/verbTask (js/words.js) and the player cards (js/game.js).
// Run: node tools/audio_texts.js && python3 tools/make_audio.py
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, document: { addEventListener() {} }, window: {}, navigator: {}, Math, Date, Object, Set, Map, JSON, localStorage: null };
vm.createContext(ctx);
vm.runInContext([read('js/vocab.js'), read('js/verbs_data.js'), read('js/audio.js'), 'const PLAYERS_SRC = ' + JSON.stringify(read('js/game.js').match(/const PLAYERS = (\[[\s\S]*?\n\]);/)[1]) + ';', ';globalThis.__o = { WORDS, IRREGULAR, clipText, clipKey, PLAYERS_SRC };'].join('\n'), ctx);
const { WORDS, IRREGULAR, clipText, clipKey, PLAYERS_SRC } = ctx.__o;
const PLAYERS = vm.runInNewContext('(' + PLAYERS_SRC + ')');
const texts = new Map();
const add = t => { if (!t) return; const c = clipText(t); if (c && !/[А-Яа-яЁё]/.test(c) && !c.includes('___')) texts.set(clipKey(t), c); };
WORDS.forEach(w => { add(w.en); add(w.ex); });
IRREGULAR.forEach(v => { add([v.v, v.p[0], v.pp[0]].join(', ')); add(v.ex); add(v.ex3); });
PLAYERS.forEach(p => p.en.forEach(add));
const fillGap = (q, a) => String(q).replace(/\s*\([^)]*\)\s*$/, '').replace('___', a).replace(/\s*\([^)]*\)/, '');
JSON.parse(read('data/grammar.json')).forEach(t => {
  t.cards.forEach(c => (c.ex || []).forEach(([en]) => add(en)));
  t.items.forEach(it => {
    if (it.t === 'mc' && /___/.test(it.q)) add(fillGap(it.q, it.o[it.a]));
    if (it.t === 'gap') add(fillGap(it.q, it.a[0]));
    if (it.t === 'err') { const w = it.s.split(' '); w[it.bad] = it.fix + (w[it.bad].match(/[.,!?]+$/) || [''])[0]; add(w.join(' ')); }
    if (it.t === 'build') add(it.a);
    if (it.t === 'tr' || it.t === 'ru2en') add(it.a[0]);
    if (it.t === 'listen' || it.t === 'speak') add(it.say);
    if (it.t === 'write') add(it.model);
  });
});
// comics: every line in the voice of its character (key "@who text"), every word as written and its dictionary form
const voiced = [];
{
  const cv = { console, Object, JSON }; vm.createContext(cv);
  vm.runInContext(read('js/comics_data.js') + ';globalThis.__c = { COMICS, COMIC_CAST, COMIC_GLOSS, COMIC_WORDS };', cv);
  const { COMICS, COMIC_CAST, COMIC_GLOSS, COMIC_WORDS } = cv.__c;
  COMICS.forEach(ep => ep.panels.forEach(p => p.lines.forEach(l => {
    if (l.who === 'sfx') return;
    voiced.push({ key: clipKey('@' + l.who + ' ' + l.en), text: clipText(l.en), voice: COMIC_CAST[l.who].voice });
    (l.en.match(/[A-Za-z][A-Za-z'’]*(?:-[A-Za-z]+)*/g) || []).forEach(add);
  })));
  Object.values(COMIC_GLOSS).forEach(g => { Object.values(g.words).forEach(w => w.l && add(w.l)); g.phrases.forEach(ph => add(ph.en)); });
  COMIC_WORDS.forEach(w => { add(w.en); add(w.ex); });
}
const out = [...texts.entries()].map(([key, text]) => ({ key, text })).concat(voiced).sort((a, b) => a.text.localeCompare(b.text));
fs.writeFileSync(path.join(__dirname, 'audio_texts.json'), JSON.stringify(out, null, 0));
console.log('texts', out.length, 'chars', out.reduce((s, o) => s + o.text.length, 0), 'collisions', out.length - new Set(out.map(o => o.key)).size);
