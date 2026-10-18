'use strict';
/* Grammar track: 45 topics from "to be" to reported speech (data/grammar.json, built by tools/build_content.py).
   Each topic adapts to the learner:
   - new:    rule cards, then a short entry check (6 tasks). 5 of 6 right → straight to the match.
   - train:  tasks are picked where he makes mistakes; every skill (tag) climbs from level 1 (recognise) to
             level 3 (use). Repeated errors bring a tip card and, if the root is an earlier topic, a quick review of it.
   - final:  the match: 12 tasks, no hints, 80 % (10 of 12) to pass. A lost match can be replayed the next day.
   - done:   the topic comes back for short checks after 3, 7 and 21 days. A failed check sends it back to training.
   Progress per topic lives in S.gr[id] and is synced (document en_meta/gr). */
const GR = { data: null, loading: false, error: '', list: [], byId: {}, items: {} };
const FINAL_N = 12, FINAL_PASS = 10, CHECK_N = 6, SHIFT_N = 12;

function grLoad(cb) {
  if (GR.data) { if (cb) cb(); return; }
  if (GR.loading) return;
  GR.loading = true;
  fetch('data/grammar.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(d => {
    GR.data = d; GR.list = d.slice().sort((a, b) => a.id.localeCompare(b.id));
    GR.byId = Object.fromEntries(GR.list.map(t => [t.id, t]));
    GR.list.forEach(t => t.items.forEach(it => { GR.items[it.id] = { t, it }; }));
    GR.loading = false; if (cb) cb(); else if (!OV) render();
  }).catch(e => { GR.loading = false; GR.error = String(e.message || e); if (!OV) render(); });
}

/* ---------- topic state ---------- */
function grRec(id, create) {
  let r = S.gr[id];
  if (!r && create) { r = S.gr[id] = { ph: 'new', tg: {}, lv: {}, hist: [], seen: {}, fin: [], done: '', rv: [], n: 0, t: Date.now() }; }
  return r;
}
const grTouch = r => { r.t = Date.now(); Dirty.gr = true; };
const topicDone = id => !!(S.gr[id] && S.gr[id].done);
function topicStatus(t) {
  const r = S.gr[t.id];
  if (r && r.done) return r.ph === 'train' ? 'review' : 'done';
  if (r && r.ph !== 'new') return r.ph;
  return t.prereq.every(topicDone) ? 'open' : 'locked';
}
// the topic to work on: the first one not passed whose earlier topics are passed
function currentTopic() {
  if (!GR.data) return null;
  const pinned = S.cfg.grPin && GR.byId[S.cfg.grPin];
  if (pinned && !topicDone(pinned.id)) return pinned;
  return GR.list.find(t => !topicDone(t.id) && t.prereq.every(topicDone)) || GR.list.find(t => !topicDone(t.id)) || null;
}
const finalAllowed = id => { const r = S.gr[id]; if (!r) return false; const last = r.fin[r.fin.length - 1]; return !last || last.s >= FINAL_PASS || last.d !== today(); };
function tagAcc(r, tag) { const g = r.tg[tag]; return g && g.n ? g.ok / g.n : null; }
function readyForFinal(t, r) {
  if (r.n < 12) return false;
  const last = r.hist.slice(-10); if (last.length < 10 || last.filter(Boolean).length < 8) return false;
  return Object.keys(t.tags).every(tag => (r.lv[tag] || 1) >= 2 || !t.items.some(it => it.tag === tag && it.lv >= 2));
}

/* ---------- item → task ---------- */
const TYPE_LABEL = { mc: 'Выбери', gap: 'Впиши', err: 'Найди ошибку', build: 'Собери', tr: 'Переделай', match: 'Пары', listen: 'Слушай', text: 'Текст', chat: 'Чат', ru2en: 'Переведи', speak: 'Скажи', write: 'Напиши' };
const fillGap = (q, a) => String(q).replace(/\s*\([^)]*\)\s*$/, '').replace('___', a).replace(/\s*\([^)]*\)/, '');
function tilesOf(sentence) { return sentence.replace(/[.?!]+$/, '').split(/\s+/).filter(Boolean); }
function itemTask(t, it, opt) {
  opt = opt || {};
  const tag = t.tags[it.tag] || {};
  const base = { key: it.id, src: 'gr', tag: it.tag, tagRu: tag.ru, why: it.why, label: TYPE_LABEL[it.t] || 'Задание', final: !!opt.final, chip: opt.chip || t.title_ru };
  switch (it.t) {
    case 'mc': return Object.assign(base, { ui: 'choice', lead: /___/.test(it.q) ? 'Выбери, что вставить' : 'Выбери правильный вариант', main: it.q, mainEn: true, opts: it.o, a: it.a, after: /___/.test(it.q) ? fillGap(it.q, it.o[it.a]) : null });
    case 'gap': return Object.assign(base, { ui: 'input', lead: 'Впиши пропущенное', tpl: it.q, gaps: [it.a], full: fillGap(it.q, it.a[0]), after: fillGap(it.q, it.a[0]) });
    case 'err': {
      const words = it.s.split(' '), fixed = words.slice(); fixed[it.bad] = it.fix + (words[it.bad].match(/[.,!?]+$/) || [''])[0];
      return Object.assign(base, { ui: 'tap', lead: 'Нажми на слово с ошибкой', words, bad: it.bad, fix: it.fix, after: fixed.join(' '), showRight: true, full: fixed.join(' ') });
    }
    case 'build': { const tiles = tilesOf(it.a).concat(it.extra || []); return Object.assign(base, { ui: 'tiles', lead: 'Собери предложение', main: it.ru, tiles, answer: it.a, after: it.a }); }
    case 'tr': return Object.assign(base, { ui: 'input', lead: it.task_ru, main: it.src, mainEn: true, gaps: [it.a], full: it.a[0], after: it.a[0] });
    case 'match': return Object.assign(base, { ui: 'pairs', lead: 'Соедини пары', pairs: it.pairs, rightEn: true });
    case 'listen': return Object.assign(base, { ui: 'choice', lead: 'Послушай и выбери, что прозвучало', main: '🎧', say: it.say, opts: it.o, a: it.a, showRight: true });
    case 'text': return Object.assign(base, { ui: 'input', lead: (it.title ? it.title + ': ' : '') + 'заполни пропуски', tpl: it.text, long: true, gaps: it.a, full: it.a.map(g => g[0]).join(' · ') });
    case 'chat': return Object.assign(base, { ui: 'input', lead: 'Допиши переписку', chat: it.lines, gaps: it.a, full: it.a.map(g => g[0]).join(' · ') });
    case 'ru2en': return Object.assign(base, { ui: 'input', lead: 'Переведи на английский', main: it.ru, gaps: [it.a], full: it.a[0], after: it.a[0] });
    case 'speak': return Object.assign(base, { ui: 'self', lead: 'Скажи вслух по-английски', main: it.ru, self: { mode: 'speak', say: it.say, model: it.say, modelRu: it.ru } });
    case 'write': return Object.assign(base, { ui: 'self', lead: 'Напиши сам', main: it.task_ru, self: { mode: 'write', model: it.model, check: it.check_ru } });
    default: return null;
  }
}

/* ---------- choosing tasks ---------- */
function pickItem(t, r, tag, lv, avoid) {
  const fresh = it => !avoid.has(it.id) && (!r.seen[it.id] || Date.now() - r.seen[it.id] > 36e5 * 20);
  for (const d of [0, -1, 1, -2, 2]) {
    const pool = t.items.filter(it => it.tag === tag && it.lv === lv + d && fresh(it));
    if (pool.length) return rnd(pool);
  }
  const any = t.items.filter(it => it.tag === tag && !avoid.has(it.id));
  return any.length ? rnd(any) : null;
}
function trainPick(t, r, avoid) {
  const tags = Object.keys(t.tags).filter(tag => t.items.some(it => it.tag === tag));
  // weak and little-practised skills first, with a bit of randomness
  const w = tags.map(tag => { const a = tagAcc(r, tag), n = (r.tg[tag] || {}).n || 0; return [tag, (a == null ? 1.2 : 1.1 - a) + (n < 4 ? 0.5 : 0) + Math.random() * 0.4]; }).sort((x, y) => y[1] - x[1]);
  for (const [tag] of w) { const it = pickItem(t, r, tag, r.lv[tag] || 1, avoid); if (it) return it; }
  return null;
}
function finalSet(t) {
  const tags = Object.keys(t.tags), out = [], used = new Set();
  const pool = t.items.filter(it => it.lv >= 2 && !['speak', 'write', 'match'].includes(it.t));
  let k = 0;
  while (out.length < FINAL_N && k < 200) {
    const tag = tags[k % tags.length]; k++;
    const c = pool.filter(it => it.tag === tag && !used.has(it.id));
    if (c.length) { const it = rnd(c); used.add(it.id); out.push(it); }
    if (k > tags.length * 6 && out.length < FINAL_N) { const rest = pool.filter(it => !used.has(it.id)); if (!rest.length) break; const it = rnd(rest); used.add(it.id); out.push(it); }
  }
  return shuffle(out);
}

/* ---------- recording answers ---------- */
function grAnswer(t, it, res, mode) {
  const r = grRec(t.id, true);
  r.n++; r.seen[it.id] = Date.now();
  const g = r.tg[it.tag] || (r.tg[it.tag] = { ok: 0, n: 0, s: 0 });
  g.n++; if (res.ok) { g.ok++; g.s = Math.max(0, g.s) + 1; } else g.s = Math.min(0, g.s) - 1;
  r.hist.push(res.ok ? 1 : 0); if (r.hist.length > 20) r.hist = r.hist.slice(-20);
  // a skill climbs a level after three right answers in a row at its current level
  if (mode !== 'check' && mode !== 'final' && res.ok && !res.help && g.s >= 3) { r.lv[it.tag] = Math.min(3, (r.lv[it.tag] || 1) + 1); g.s = 0; }
  if (!res.ok && (r.lv[it.tag] || 1) > 1 && g.s <= -2) { r.lv[it.tag] = (r.lv[it.tag] || 1) - 1; }
  grTouch(r);
  logEvent('gr', it.id, res.ok, { tp: t.id, tag: it.tag, m: mode });
  return g;
}

/* ---------- sessions ---------- */
// The grammar shift: delayed checks of passed topics, then the current topic in its current phase.
function startGrammarShift(topicId, opts) {
  opts = opts || {};
  grLoad(() => {
    const t = topicId ? GR.byId[topicId] : currentTopic();
    if (!t) { toast('Все темы пройдены! Повторяй в матчах.'); return; }
    const r = grRec(t.id, true);
    if (r.ph === 'final' && !opts.train && finalAllowed(t.id)) { startFinal(t.id, opts.shift !== false ? 'g' : null); return; }
    const queue = [], avoid = new Set();
    let checksLeft = 0;
    // delayed checks of earlier topics (max two topics a shift)
    if (!topicId) GR.list.filter(x => S.gr[x.id] && S.gr[x.id].done && (S.gr[x.id].rv || []).length && S.gr[x.id].rv[0] <= today()).slice(0, 2).forEach(x => {
      const items = shuffle(x.items.filter(it => it.lv >= 2 && ['mc', 'gap', 'tr', 'err', 'build', 'ru2en'].includes(it.t))).slice(0, 3);
      const box = { ok: 0, n: items.length };
      items.forEach(it => queue.push({ kind: 'rv', t: x, it, box }));
      checksLeft += items.length;
    });
    if (r.ph === 'new') {
      t.cards.forEach((c, i) => queue.push({ kind: 'card', t, card: c, i }));
      if (t.traps && t.traps.length) queue.push({ kind: 'traps', t });
      r.ph = 'check'; grTouch(r);
    }
    const checkBox = { ok: 0, n: 0 };
    if (r.ph === 'check') {
      const tags = Object.keys(t.tags); const picks = [];
      for (let k = 0; picks.length < CHECK_N && k < 40; k++) { const tag = tags[k % tags.length]; const it = pickItem(t, r, tag, k < tags.length ? 1 : 2, new Set(picks.map(p => p.id))); if (it && !picks.includes(it)) picks.push(it); }
      picks.forEach(it => queue.push({ kind: 'check', t, it, box: checkBox }));
    }
    let shown = 0, tipShown = new Set(), backDone = new Set(), stopTrain = false;
    const total = Math.max(SHIFT_N, queue.filter(q => q.kind !== 'card' && q.kind !== 'traps').length) + queue.filter(q => q.kind === 'card' || q.kind === 'traps').length;
    startSession({
      title: 'Тренировка: ' + t.title_ru, shift: opts.shift === false ? null : 'g', total,
      next(ov) {
        let q = queue.shift();
        if (!q) {
          if (stopTrain || r.ph !== 'train' || shown >= SHIFT_N) return null;
          if (readyForFinal(t, r)) { r.ph = 'final'; grTouch(r); stopTrain = true; return null; }
          const it = trainPick(t, r, avoid); if (!it) return null;
          q = { kind: 'train', t, it };
        }
        if (q.kind === 'card') return { key: 'card', ui: 'info', label: 'Правило ' + (q.i + 1) + ' из ' + q.t.cards.length, chip: q.t.title_ru, lead: '', main: null, node: ruleCard(q.card), btn: 'Понятно' };
        if (q.kind === 'traps') return { key: 'traps', ui: 'info', label: 'Ловушки', chip: q.t.title_ru, node: trapsNode(q.t), btn: 'Запомнил, к заданиям!' };
        if (q.kind === 'tip') return { key: 'tip', ui: 'info', label: 'Подсказка тренера', chip: q.t.title_ru, node: tipNode(q.t, q.tag), btn: 'Ясно, дальше' };
        shown++; avoid.add(q.it.id);
        const task = itemTask(q.t, q.it, { chip: q.kind === 'rv' ? 'Проверка: ' + q.t.title_ru : q.kind === 'back' ? 'Повторим основу' : q.t.title_ru });
        task.done = res => {
          if (q.kind === 'rv') { grAnswer(q.t, q.it, res, 'rv'); q.box.ok += res.ok ? 1 : 0; q.box.seen = (q.box.seen || 0) + 1; if (q.box.seen === q.box.n) rvResult(q.t, q.box); return null; }
          if (q.kind === 'back') { grAnswer(q.t, q.it, res, 'back'); return null; }
          const g = grAnswer(t, q.it, res, q.kind === 'check' ? 'check' : 'train');
          if (q.kind === 'check') { checkBox.n++; if (res.ok) checkBox.ok++; if (checkBox.n === CHECK_N) { if (checkBox.ok >= CHECK_N - 1) { r.ph = 'final'; stopTrain = true; } else r.ph = 'train'; grTouch(r); } return null; }
          // repeated mistakes on one skill: a tip card, and a quick look back at the earlier topic it rests on
          if (!res.ok && g.s <= -2 && !tipShown.has(q.it.tag) && t.tags[q.it.tag] && t.tags[q.it.tag].tip_ru) { tipShown.add(q.it.tag); queue.unshift({ kind: 'tip', t, tag: q.it.tag }); }
          const back = t.tags[q.it.tag] && t.tags[q.it.tag].back;
          if (!res.ok && g.n - g.ok >= 3 && back && GR.byId[back] && !backDone.has(back)) {
            backDone.add(back); const bt = GR.byId[back];
            shuffle(bt.items.filter(x => x.lv <= 2 && ['mc', 'gap', 'err'].includes(x.t))).slice(0, 3).forEach(x => queue.push({ kind: 'back', t: bt, it: x }));
            return { note: 'Ошибки здесь растут из темы «' + bt.title_ru + '». Сейчас повторим её коротко.' };
          }
          return null;
        };
        return task;
      },
      finish() {
        if (r.ph === 'final' && finalAllowed(t.id)) return { node: el('div', { class: 'card hl stack' }, el('b', null, '🥅 Ты готов к матчу по теме!'), el('div', { class: 'small' }, '12 заданий без подсказок, нужно 10 верных.')), again: { label: 'Сыграть матч сейчас', go: () => { closeOV(); startFinal(t.id, null); } } };
        if (r.ph === 'final') return { node: el('div', { class: 'card stack' }, el('b', null, 'Реванш завтра'), el('div', { class: 'small' }, 'Матч по этой теме можно переиграть завтра. Сегодня — тренировка ошибок.')) };
        return null;
      },
    });
  });
}
function rvResult(t, box) {
  const r = grRec(t.id, true);
  if (box.ok >= Math.ceil(box.n * 2 / 3)) { r.rv = (r.rv || []).slice(1); }
  else { r.ph = 'train'; r.lv = {}; r.rv = []; toast('Тема «' + t.title_ru + '» подзабылась: вернём её в тренировку.'); }
  grTouch(r);
}
function startFinal(id, shift) {
  grLoad(() => {
    const t = GR.byId[id], r = grRec(id, true);
    const items = finalSet(t); let i = 0, ok = 0;
    startSession({
      title: 'Матч: ' + t.title_ru, shift, total: items.length,
      next() { const it = items[i++]; if (!it) return null; const task = itemTask(t, it, { final: true, chip: 'Матч' }); task.done = res => { grAnswer(t, it, res, 'final'); if (res.ok) ok++; return null; }; return task; },
      finish(sum) {
        const pass = ok >= FINAL_PASS;
        r.fin.push({ d: today(), s: ok, n: items.length });
        if (pass) {
          r.ph = 'done'; if (!r.done) { r.done = today(); addXP(XP.final); sum.xp += XP.final; }
          r.rv = [addDays(today(), 3), addDays(today(), 7), addDays(today(), 21)];
          if (S.cfg.grPin === id) setCfg({ grPin: '' });
        } else { r.ph = 'train'; }
        grTouch(r);
        const next = currentTopic();
        return {
          coach: coachLine(pass ? 'finalPass' : 'finalFail'),
          node: el('div', { class: 'card ' + (pass ? 'hl' : '') + ' stack' }, el('b', null, pass ? `🏆 Матч выигран: ${ok} из ${items.length}! Тема сдана, +${XP.final} XP` : `Счёт ${ok} из ${items.length}. Нужно ${FINAL_PASS}.`),
            el('div', { class: 'small' }, pass ? (next ? 'Следующая тема: «' + next.title_ru + '». Через 3 дня эта тема вернётся на короткую проверку.' : 'Это была последняя тема!') : 'Ошибки уже в тренировке. Реванш — завтра.')),
        };
      },
    });
  });
}

/* ---------- the match shift: a real match if one is ready, otherwise a sprint or mixed review ---------- */
function startMatchShift() {
  grLoad(() => {
    const t = currentTopic(), r = t && S.gr[t.id];
    if (t && r && r.ph === 'final' && finalAllowed(t.id)) { startFinal(t.id, 'm'); return; }
    openSheet(el('div', { class: 'stack' }, el('h2', { class: 'h2' }, 'Смена 3: выбери игру'),
      choiceRow('⚡', 'Спринт 60 секунд', 'Быстрые вопросы на два варианта. Сколько успеешь?', () => { closeSheet(); startSprint('m'); }),
      choiceRow('🔁', 'Повторение тем', '10 заданий из пройденных тем вперемешку', () => { closeSheet(); startMixedReview('m'); }),
      choiceRow('📘', 'Учебник Spotlight', 'Упражнение из школьного учебника с проверкой', () => { closeSheet(); go('school'); toast('Выбери упражнение — после проверки смена засчитается.'); UI.scShift = true; })));
  });
}
function choiceRow(e, title, sub, onclick) { return el('button', { type: 'button', class: 'choice-row', onclick }, el('span', { class: 'cr-e' }, e), el('span', { class: 'grow' }, el('b', null, title), el('div', { class: 'small muted' }, sub))); }
function reviewPool() {
  const done = GR.list.filter(t => S.gr[t.id] && S.gr[t.id].ph && S.gr[t.id].ph !== 'new');
  return done.length ? done : GR.list.slice(0, 2);
}
function startSprint(shift) {
  grLoad(() => {
    const topics = reviewPool(), pool = [];
    topics.forEach(t => t.items.filter(it => it.t === 'mc' && it.o.length === 2).forEach(it => pool.push({ t, it })));
    const order = shuffle(pool); let i = 0, ok = 0;
    startSession({
      title: 'Спринт', shift, total: 0, sprint: true, deadline: Date.now() + 60000,
      next(ov) { if (Date.now() > ov.deadline) return null; const q = order[i++ % order.length]; if (!q) return null; const task = itemTask(q.t, q.it, { chip: 'Спринт' }); task.final = true; task.done = res => { grAnswer(q.t, q.it, res, 'sprint'); if (res.ok) ok++; return null; }; return task; },
      finish(sum) { const best = Math.max(ok, S.cfg.sprintBest || 0); if (ok > (S.cfg.sprintBest || 0)) setCfg({ sprintBest: ok }); return { node: el('div', { class: 'card hl stack center' }, el('div', { class: 'big num' }, ok + ' верных за минуту'), el('div', { class: 'small' }, 'Твой рекорд: ' + best)), again: { label: 'Ещё спринт', go: () => { closeOV(); startSprint(null); } } }; },
    });
  });
}
function startMixedReview(shift) {
  grLoad(() => {
    const topics = reviewPool(), pool = [];
    topics.forEach(t => t.items.filter(it => it.lv >= 2 && ['mc', 'gap', 'err', 'build', 'tr', 'ru2en', 'listen'].includes(it.t)).forEach(it => pool.push({ t, it })));
    const order = shuffle(pool).slice(0, 10); let i = 0;
    startSession({ title: 'Повторение тем', shift, total: order.length, next() { const q = order[i++]; if (!q) return null; const task = itemTask(q.t, q.it, { chip: q.t.title_ru }); task.done = res => { grAnswer(q.t, q.it, res, 'mix'); return null; }; return task; } });
  });
}

/* ---------- rule cards ---------- */
function ruleCard(c) {
  return el('div', { class: 'rule stack' }, el('h3', { class: 'h3' }, c.title_ru), el('div', { class: 'rule-body' }, String(c.body_ru || '').split(/\n\s*\n/).map(p => el('p', null, rich(p)))),
    (c.ex || []).length ? el('div', { class: 'examples' }, c.ex.map(([en, ru]) => el('div', { class: 'exrow' }, el('div', { class: 'grow' }, el('div', { class: 'en', lang: 'en' }, en), el('div', { class: 'small muted' }, ru)), audioBtn(en)))) : null);
}
function trapsNode(t) {
  return el('div', { class: 'stack' }, el('p', { class: 'muted small' }, 'Так часто ошибаются русскоязычные. Не попадись!'),
    t.traps.map(x => el('div', { class: 'trap' }, el('div', { class: 'wrong', lang: 'en' }, '✗ ' + x.wrong), el('div', { class: 'right', lang: 'en' }, '✓ ' + x.right), el('div', { class: 'small' }, x.why_ru))));
}
function tipNode(t, tag) { const g = t.tags[tag]; return el('div', { class: 'coach-say' }, coachFace('think', 80), el('div', { class: 'speech' }, el('b', null, g.ru), el('p', null, rich(g.tip_ru)))); }

/* ---------- the Grammar tab ---------- */
const STAGE_NAME = { A1: 'Сезон 1 · A1', A2: 'Сезон 2 · A2', B1: 'Сезон 3 · B1' };
function screenGrammar() {
  if (!GR.data) { grLoad(); return [el('p', { class: 'muted' }, GR.error ? 'Не загрузилось: ' + GR.error : 'Загружаю темы…')]; }
  if (UI.gTopic) return topicScreen(GR.byId[UI.gTopic]);
  const out = [], cur = currentTopic(), done = GR.list.filter(t => topicDone(t.id)).length;
  out.push(el('h1', { class: 'h1' }, 'Грамматика'));
  out.push(el('div', { class: 'card stack' }, el('div', { class: 'row between' }, el('b', null, `Сдано тем: ${done} из ${GR.list.length}`), el('span', { class: 'chip' }, cur ? 'Сейчас: ' + cur.id.slice(1) : '')), bar(done / GR.list.length, 'ice'),
    cur ? btn('Продолжить: ' + cur.title_ru, 'primary block', () => startGrammarShift(cur.id, { shift: false })) : null));
  ['A1', 'A2', 'B1'].forEach(st => {
    const ts = GR.list.filter(t => t.stage === st);
    out.push(sectionTitle(STAGE_NAME[st], el('span', { class: 'chip' }, ts.filter(t => topicDone(t.id)).length + ' / ' + ts.length)));
    out.push(el('div', { class: 'path' }, ts.map(t => {
      const s = topicStatus(t), isCur = cur && cur.id === t.id;
      return el('button', { type: 'button', class: 'topic ' + s + (isCur ? ' cur' : ''), onclick: () => { UI.gTopic = t.id; render(); window.scrollTo(0, 0); } },
        el('span', { class: 'tn num' }, s === 'done' ? '✓' : s === 'locked' ? '' : String(+t.id.slice(1))),
        el('span', { class: 'grow' }, el('b', null, t.title_ru), el('div', { class: 'small muted' }, statusText(t, s))),
        s === 'locked' ? icon('lock') : null);
    })));
  });
  return out;
}
function statusText(t, s) {
  const r = S.gr[t.id];
  if (s === 'done') { const f = r.fin.filter(x => x.s >= FINAL_PASS).pop(); return 'Сдано' + (f ? ` · матч ${f.s}/${f.n}` : ''); }
  if (s === 'review') return 'Подзабылась — потренируй';
  if (s === 'final') return 'Готов к матчу!';
  if (s === 'train' || s === 'check') { const last = r.hist.slice(-10); return 'Тренировка' + (last.length ? ` · точность ${Math.round(last.filter(Boolean).length / last.length * 100)}%` : ''); }
  if (s === 'open') return 'Можно начинать';
  return 'Откроется после: ' + t.prereq.filter(p => !topicDone(p)).map(p => GR.byId[p] ? GR.byId[p].title_ru : p).join(', ');
}
function topicScreen(t) {
  const r = S.gr[t.id], s = topicStatus(t);
  const out = [el('div', { class: 'row' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Назад', onclick: () => { UI.gTopic = null; render(); } }, icon('back')), el('div', { class: 'grow' }, el('div', { class: 'eyebrow' }, t.stage + ' · тема ' + (+t.id.slice(1)) + (t.spotlight.length ? ' · Spotlight ' + t.spotlight.join(', ') : '')), el('h1', { class: 'h2' }, t.title_ru)))];
  out.push(el('div', { class: 'card stack' }, el('div', { class: 'eyebrow' }, 'Цель'), el('p', null, t.goal_ru), el('div', { class: 'small muted' }, statusText(t, s))));
  const acts = [];
  if (s === 'final' && finalAllowed(t.id)) acts.push(btn('🥅 Сыграть матч', 'primary big block', () => startFinal(t.id, null)));
  if (s !== 'done') acts.push(btn(s === 'open' || s === 'locked' ? 'Начать тему' : 'Тренироваться', (acts.length ? '' : 'primary ') + 'big block', () => { if (s === 'locked') setCfg({ grPin: t.id }); startGrammarShift(t.id, { shift: false, train: true }); }));
  else acts.push(btn('Потренироваться ещё', 'big block', () => startGrammarShift(t.id, { shift: false, train: true })), btn('Сыграть матч заново', 'block', () => startFinal(t.id, null)));
  if (s === 'locked') acts.push(el('p', { class: 'small muted' }, 'Тема ещё закрыта, но если хочешь — можно начать её раньше.'));
  out.push(el('div', { class: 'stack' }, acts));
  if (r && r.n) {
    out.push(sectionTitle('Твои навыки в теме'));
    out.push(el('div', { class: 'card stack' }, Object.keys(t.tags).map(tag => { const a = tagAcc(r, tag); return el('div', { class: 'skill' }, el('div', { class: 'row between' }, el('span', null, t.tags[tag].ru), el('span', { class: 'small muted' }, a == null ? '—' : Math.round(a * 100) + '% · ур. ' + (r.lv[tag] || 1))), bar(a || 0, a != null && a < 0.6 ? 'red' : 'ice')); })));
  }
  out.push(sectionTitle('Правила'));
  t.cards.forEach(c => out.push(el('section', { class: 'card' }, ruleCard(c))));
  if (t.traps && t.traps.length) { out.push(sectionTitle('Ловушки')); out.push(el('section', { class: 'card' }, trapsNode(t))); }
  return out;
}
