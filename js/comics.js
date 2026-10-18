'use strict';
/* Comics: the reader (one panel at a time, speech bubbles over the picture), tap a word → translation and
   «add to my dictionary», every character speaks with his own recorded voice, questions after an episode.
   Episodes open for progress (full days, passed grammar topics). Data: js/comics_data.js (tools/build_content.py). */
const CM = { ep: null, i: 0, word: null, tr: false, playing: false };
const XP_COMIC = 30;
const COMIC_SERIES = [
  { id: 'benny', title: 'Бенни и Рекс', sub: 'Медвежонок в новой стране и тираннозавр-вратарь', e: '🐻🦖', total: 4 },
  { id: 'ghost', title: 'Кентервильское привидение', sub: 'Оскар Уайльд простым английским', e: '👻🏰', total: 2 },
];
const TOKEN_RE = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z]+)*/g;
const tokKey = t => t.toLowerCase().replace(/’/g, "'");
const cmRec = id => (S.cm || {})[id];
const cmRead = id => !!(cmRec(id) && cmRec(id).d);
const fullDays = () => Object.values(S.days).filter(d => SHIFTS.every(s => d.sh && d.sh[s.id])).length;
const topicsPassed = () => Object.values(S.gr).filter(r => r.done).length;

// Is the episode open, and if not, what is missing (in words for him)
function cmUnlock(ep) {
  const u = ep.unlock || {};
  if (u.after && !cmRead(u.after)) { const prev = COMICS.find(e => e.id === u.after); return { ok: false, why: 'Сначала прочитай серию ' + (prev ? prev.n : '') }; }
  const fd = u.full_days || 0, tp = u.topics || 0, f = fullDays(), t = topicsPassed();
  if (f < fd) return { ok: false, why: fd === 1 ? 'Сыграй все три смены за один день' : 'Сыграй все три смены ещё ' + (fd - f) + ' ' + plural(fd - f, 'день', 'дня', 'дней') };
  if (t < tp) return { ok: false, why: 'Сдай ещё ' + (tp - t) + ' ' + plural(tp - t, 'тему', 'темы', 'тем') + ' грамматики' };
  return { ok: true };
}
const cmFresh = () => COMICS.filter(ep => !cmRead(ep.id) && cmUnlock(ep).ok);

/* ---------- voices ---------- */
const lineKey = l => '@' + l.who + ' ' + l.en;
function sayLine(l) {
  if (l.who === 'sfx') return Promise.resolve();
  const k = lineKey(l);
  if (DEV.loud && AudioPlayer.has(k)) { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } return AudioPlayer.play(k).catch(() => speakTTS(l.en)); }
  speak(l.en); return new Promise(res => setTimeout(res, 400 + l.en.length * 70));
}
async function playPanel() {
  const lines = CM.ep.panels[CM.i].lines.filter(l => l.who !== 'sfx'), at = CM.i;
  CM.playing = true; renderCM();
  for (const l of lines) { if (!CM.ep || CM.i !== at || !CM.playing) break; markLine(l); await sayLine(l); }
  markLine(null); if (CM.ep) { CM.playing = false; renderCM(); }
}
function markLine(l) { document.querySelectorAll('#cm .bub').forEach(b => b.classList.toggle('now', !!l && b.dataset.en === l.en)); }
function stopCM() { CM.playing = false; AudioPlayer.stop(); try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

/* ---------- reader ---------- */
function openComic(id) {
  const ep = COMICS.find(e => e.id === id); if (!ep) return;
  Object.assign(CM, { ep, i: 0, word: null, tr: false, playing: false });
  if (!S.cm[id]) { S.cm[id] = { o: today(), t: Date.now() }; Dirty.main = true; persist(); }
  renderCM();
}
function closeComic() { stopCM(); CM.ep = null; renderCM(); render(); }
function goPanel(d) {
  stopCM(); const n = CM.ep.panels.length;
  CM.i = Math.max(0, Math.min(n - 1, CM.i + d)); CM.word = null; renderCM();
  const next = CM.ep.panels[CM.i + 1]; if (next) { const im = new Image(); im.src = next.img; }
}
function renderCM() {
  let ov = $('#cm');
  if (!CM.ep) { if (ov) ov.remove(); if (!OV) document.body.style.overflow = ''; return; }
  if (!ov) { ov = el('div', { id: 'cm', class: 'overlay' }); document.body.append(ov); }
  document.body.style.overflow = 'hidden';
  const y = ov.scrollTop; ov.replaceChildren(readerView()); ov.scrollTop = y;
}
function readerView() {
  const ep = CM.ep, p = ep.panels[CM.i], last = CM.i === ep.panels.length - 1;
  return el('div', { class: 'ov-wrap' },
    el('div', { class: 'ov-top' },
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Закрыть', onclick: closeComic }, icon('close')),
      el('div', { class: 'grow stack', style: { gap: '4px' } }, el('div', { class: 'small muted' }, 'Серия ' + ep.n + ' · ' + ep.title_ru), el('div', { class: 'meter' }, el('i', { style: { width: ((CM.i + 1) / ep.panels.length * 100) + '%' } }))),
      el('span', { class: 'chip num' }, (CM.i + 1) + ' / ' + ep.panels.length)),
    el('div', { class: 'ov-body stack' },
      CM.i === 0 ? el('div', { class: 'cm-title' }, el('div', { class: 'cm-en', lang: 'en' }, ep.title_en), el('div', { class: 'small muted' }, ep.about_ru)) : null,
      panelNode(p),
      el('div', { class: 'cm-tools' },
        el('button', { type: 'button', class: 'btn small', disabled: CM.i === 0, onclick: () => goPanel(-1), 'aria-label': 'Назад' }, '‹'),
        el('button', { type: 'button', class: 'btn small grow' + (CM.playing ? ' on' : ''), onclick: () => CM.playing ? (stopCM(), renderCM()) : playPanel() }, icon('vol'), CM.playing ? ' Стоп' : ' Слушать'),
        el('button', { type: 'button', class: 'btn small grow' + (CM.tr ? ' on' : ''), onclick: () => { CM.tr = !CM.tr; CM.word = null; renderCM(); } }, 'Перевод'),
        el('button', { type: 'button', class: 'btn small', disabled: last, onclick: () => goPanel(1), 'aria-label': 'Вперёд' }, '›')),
      CM.word ? wordCard() : CM.tr ? transNode(p) : el('p', { class: 'small muted center' }, 'Нажми на любое слово в пузыре: покажу перевод, и его можно добавить в словарь. Нажми на пузырь, чтобы услышать фразу.')),
    el('div', { class: 'ov-foot' }, last ? btn('К вопросам по серии', 'primary block', () => { stopCM(); startComicQuiz(ep); }) : btn('Дальше', 'primary block', () => goPanel(1))));
}
function panelNode(p) {
  const wrap = el('div', { class: 'cm-panel' }, el('img', { src: p.img, alt: '', draggable: 'false' }));
  p.lines.forEach(l => wrap.append(bubble(l)));
  return wrap;
}
function bubble(l) {
  const kind = l.who === 'cap' ? 'cap' : l.who === 'sfx' ? 'sfx' : 'say';
  const b = el('div', { class: 'bub ' + kind, lang: 'en', 'data-en': l.en, style: { left: l.x + '%', top: l.y + '%', width: l.w + '%' }, onclick: () => { stopCM(); markLine(l); sayLine(l).then(() => markLine(null)); } });
  if (kind === 'say') {
    const down = (l.my || 0) > l.y + 6;
    b.classList.add(down ? 'tail-down' : 'tail-up');
    b.style.setProperty('--tx', Math.max(14, Math.min(86, ((l.mx || 50) - l.x) / l.w * 100)) + '%');
    if (l.off) b.append(el('span', { class: 'bub-who' }, COMIC_CAST[l.who].name + ': '));
  }
  let last = 0; const txt = l.en;
  txt.replace(TOKEN_RE, (tok, pos) => {
    if (pos > last) b.append(document.createTextNode(txt.slice(last, pos)));
    const sel = CM.word && CM.word.line === l && CM.word.pos === pos;
    b.append(el('span', { class: 'w' + (sel ? ' sel' : ''), onclick: e => { e.stopPropagation(); pickWord(tok, pos, l); } }, tok));
    last = pos + tok.length; return tok;
  });
  if (last < txt.length) b.append(document.createTextNode(txt.slice(last)));
  return b;
}
function transNode(p) {
  return el('div', { class: 'card stack' }, p.lines.map(l => el('div', { class: 'cm-tr' },
    el('div', { class: 'small muted' }, l.who === 'cap' ? 'Автор' : l.who === 'sfx' ? 'Звук' : (COMIC_CAST[l.who].ru || COMIC_CAST[l.who].name)),
    el('div', { class: 'row' }, el('div', { class: 'grow' }, el('div', { lang: 'en', class: 'en' }, l.en), el('div', { class: 'small' }, l.ru)), l.who !== 'sfx' ? el('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Послушать', onclick: () => { stopCM(); sayLine(l); } }, icon('vol')) : null))));
}

/* ---------- words ---------- */
const glossOf = ep => (COMIC_GLOSS[ep.series] || { words: {}, phrases: [] });
function pickWord(tok, pos, line) {
  stopCM();
  CM.word = { tok, pos, line, key: tokKey(tok) }; CM.tr = false;
  renderCM(); speak(tok);
  const c = $('#cm .cm-word'); if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function addWord(id) {
  if (!id || S.cards[id]) return;
  const r = applyGrade(id, 2); r.b = 1; r.due = today(); persist();
  toast('Добавлено в словарь. Повторим в разминке.'); renderCM();
}
function addBtn(id) {
  if (!id || !WORD[id]) return null;
  return S.cards[id] ? el('span', { class: 'chip good' }, '✓ в словаре') : btn('+ В словарь', 'small', () => addWord(id));
}
function wordCard() {
  const g = glossOf(CM.ep), w = CM.word, gw = g.words[w.key] || { ru: '—' };
  const lemma = gw.l && gw.l.toLowerCase() !== w.key ? gw.l : null;
  const low = w.line.en.toLowerCase().replace(/’/g, "'");
  const phrases = g.phrases.filter(ph => { const at = low.indexOf(ph.en); return at >= 0 && w.pos >= at && w.pos < at + ph.en.length; });
  return el('div', { class: 'card stack cm-word' },
    el('div', { class: 'row' },
      el('div', { class: 'grow' }, el('div', { class: 'cm-wen', lang: 'en' }, w.tok, lemma ? el('span', { class: 'small muted' }, '  ← ' + lemma) : null), el('div', { class: 'big' }, gw.ru)),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Послушать', onclick: () => speak(w.tok) }, icon('vol'))),
    gw.g ? el('div', { class: 'small muted' }, '💡 ' + gw.g) : null,
    addBtn(gw.w),
    phrases.map(ph => el('div', { class: 'cm-ph row' }, el('div', { class: 'grow' }, el('b', { lang: 'en' }, ph.en), el('div', { class: 'small' }, ph.ru)), addBtn(ph.w))),
    el('button', { type: 'button', class: 'btn ghost small', onclick: () => { CM.word = null; renderCM(); } }, 'Закрыть'));
}

/* ---------- questions after the episode ---------- */
function startComicQuiz(ep) {
  const topic = { tags: {}, title_ru: 'Комикс' }, items = ep.quiz.slice(); let i = 0;
  CM.ep = null; renderCM();
  startSession({
    title: 'Вопросы по серии', total: items.length,
    next() { const it = items[i++]; if (!it) return null; const t = itemTask(topic, it, { chip: 'Серия ' + ep.n }); t.key = it.id; t.done = () => null; return t; },
    finish(sum) {
      const first = !cmRead(ep.id), rec = S.cm[ep.id] || {};
      S.cm[ep.id] = Object.assign(rec, { d: rec.d || today(), best: Math.max(rec.best || 0, sum.ok), n: sum.n, t: Date.now() }); Dirty.main = true;
      if (first) { addXP(XP_COMIC); sum.xp += XP_COMIC; }
      const next = cmFresh()[0];
      return { coach: first ? 'Серия прочитана! Ты читаешь комиксы на английском, это уже серьёзно.' : null,
        node: el('div', { class: 'card hl stack center' }, el('div', { class: 'big' }, '📖 «' + ep.title_en + '»'), el('div', { class: 'small' }, first ? 'Серия прочитана: +' + XP_COMIC + ' XP' : 'Лучший результат: ' + S.cm[ep.id].best + ' из ' + sum.n)),
        again: next ? { label: 'Читать дальше: серия ' + next.n, go: () => { closeOV(); openComic(next.id); } } : { label: 'Перечитать серию', go: () => { closeOV(); openComic(ep.id); } } };
    },
  });
}

/* ---------- shelf (tab «Я») and a hint on the home screen ---------- */
function comicsShelf() {
  return el('div', { class: 'stack' }, COMIC_SERIES.map(s => {
    const eps = COMICS.filter(e => e.series === s.id);
    const rows = eps.map(ep => {
      const u = cmUnlock(ep), read = cmRead(ep.id);
      return el('button', { type: 'button', class: 'cm-ep' + (u.ok ? '' : ' locked'), onclick: () => u.ok ? openComic(ep.id) : toast(u.why) },
        el('img', { src: ep.panels[0].img, alt: '', class: 'cm-thumb' }),
        el('div', { class: 'grow' }, el('b', null, 'Серия ' + ep.n + ': ' + ep.title_en), el('div', { class: 'small muted' }, u.ok ? ep.title_ru + ' · ' + ep.grammar_ru : '🔒 ' + u.why)),
        el('span', { class: 'chip' + (read ? ' good' : u.ok ? ' red' : '') }, read ? '✓' : u.ok ? 'Читать' : '🔒'));
    });
    const soon = s.total - eps.length;
    return el('div', { class: 'card stack' }, el('div', { class: 'row' }, el('span', { class: 'cr-e' }, s.e), el('div', { class: 'grow' }, el('b', null, s.title), el('div', { class: 'small muted' }, s.sub))),
      rows, soon > 0 ? el('div', { class: 'small muted' }, (eps.length ? 'Ещё ' + soon + ' ' + plural(soon, 'серия', 'серии', 'серий') : 'Серии') + ' скоро появятся.') : null);
  }), el('p', { class: 'small muted' }, 'Серии открываются за прогресс: полные дни и сданные темы. Слова из пузырей можно добавлять в свой словарь.'));
}
function comicsHint() {
  const ep = cmFresh()[0]; if (!ep) return null;
  return el('button', { type: 'button', class: 'card cm-new row', onclick: () => openComic(ep.id) },
    el('img', { src: ep.panels[0].img, alt: '', class: 'cm-thumb' }),
    el('div', { class: 'grow' }, el('div', { class: 'eyebrow' }, '📖 Новая серия комикса'), el('b', null, ep.title_en), el('div', { class: 'small muted' }, ep.title_ru)),
    el('span', { class: 'chip red' }, 'Читать'));
}
