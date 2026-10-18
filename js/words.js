'use strict';
/* Words and irregular verbs: spaced repetition (core.js), the warm-up shift and the Words tab.
   Word card ids: w05-01 (from js/vocab.js). Verb card ids: v:go. */
const WORD = Object.fromEntries(WORDS.map(w => [w.id, w]));
const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const VERB = Object.fromEntries(IRREGULAR.map(v => [v.v, v]));
const GRP_RU = { AAA: 'все три одинаковые', ABB: '2-я и 3-я совпадают', ABA: '1-я и 3-я совпадают', ABC: 'все три разные', AAB: '1-я и 2-я совпадают' };

const dueWordCount = () => WORDS.filter(w => isDue(S.cards[w.id])).length;
const dueVerbCount = () => IRREGULAR.filter(v => isDue(S.cards['v:' + v.v])).length;
const newWordsToday = () => WORDS.filter(w => S.cards[w.id] && S.cards[w.id].f === today()).length;
function nextNewWords(n) { return WORDS.filter(w => !S.cards[w.id]).slice(0, n); }
// a new batch of verbs opens only when the previous ones are holding
function nextNewVerbs() {
  const learning = IRREGULAR.filter(v => { const r = S.cards['v:' + v.v]; return r && r.b < 3; }).length;
  if (learning > 4) return [];
  return IRREGULAR.filter(v => !S.cards['v:' + v.v]).slice(0, S.cfg.newVerbs || 5);
}
const pastStr = v => v.p.join(' / '), ppStr = v => v.pp.join(' / ');
const maskWord = (sentence, word) => { const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'i'); return re.test(sentence) ? sentence.replace(re, '___') : null; };

/* ---------- word tasks ---------- */
function wordIntro(w) {
  return { key: 'intro:' + w.id, ui: 'info', label: 'Новое слово', chip: TOPIC[w.tp] ? TOPIC[w.tp].ru : '', say: w.en, btn: 'Запомнил',
    node: el('div', { class: 'wordcard stack center' }, el('div', { class: 'wc-e' }, w.e || '📝'), el('div', { class: 'wc-en en', lang: 'en' }, w.en),
      S.cfg.ipa && w.ipa ? el('div', { class: 'ipa' }, '/' + w.ipa + '/') : null, el('div', { class: 'wc-ru' }, w.ru),
      w.ex ? el('div', { class: 'card stack', style: { textAlign: 'left' } }, el('div', { class: 'row' }, el('div', { class: 'grow en', lang: 'en' }, w.ex), audioBtn(w.ex)), el('div', { class: 'small muted' }, w.exru)) : null),
    done: () => { if (!S.cards[w.id]) { const r = applyGrade(w.id, 2); r.b = 1; r.due = today(); } } };
}
function distractors(w, field, n) {
  const same = WORDS.filter(x => x.id !== w.id && x.tp === w.tp && x[field] !== w[field]);
  const pool = same.length >= n ? same : WORDS.filter(x => x.id !== w.id && x[field] !== w[field]);
  return shuffle(pool).slice(0, n).map(x => x[field]);
}
function wordTask(w) {
  const r = S.cards[w.id] || { b: 1 }, b = r.b;
  const done = res => { const g = res.ok ? (res.help || res.typo ? 2 : 3) : 0; const rr = applyGrade(w.id, g); logEvent('w', w.id, res.ok); return { note: res.ok ? (rr.b >= 5 ? 'Слово выучено!' : 'Повторим ' + whenLabel(rr.due) + '.') : 'Слово вернётся завтра.' }; };
  const meaning = el('div', { class: 'stack center' }, el('div', { class: 'wc-e' }, w.e || ''), el('div', { class: 'wc-ru' }, w.ru));
  const kind = b <= 1 ? rnd(['en2ru', 'listen']) : b === 2 ? rnd(['en2ru', 'ru2en', 'listen']) : rnd(['ru2en', 'ru2en', 'ex']);
  const base = { key: w.id + ':' + kind, src: 'w', chip: TOPIC[w.tp] ? TOPIC[w.tp].ru : 'Слово', done, why: (w.ex ? w.ex + ' — ' + w.exru : ''), after: w.en };
  if (kind === 'en2ru') { const opts = shuffle([w.ru].concat(distractors(w, 'ru', 3))); return Object.assign(base, { ui: 'choice', label: 'Что значит?', lead: 'Выбери перевод', main: w.en, mainEn: true, say: w.en, autoplay: true, opts, a: opts.indexOf(w.ru), optsEn: false, shuffle: false }); }
  if (kind === 'listen') { const opts = shuffle([w.en].concat(distractors(w, 'en', 3))); return Object.assign(base, { ui: 'choice', label: 'Слушай', lead: 'Какое слово прозвучало?', main: '🎧', say: w.en, opts, a: opts.indexOf(w.en), shuffle: false, why: w.en + ' — ' + w.ru }); }
  if (kind === 'ex' && w.ex) { const m = maskWord(w.ex, w.en.split(' ')[0]); if (m && w.en.indexOf(' ') < 0) { const form = w.ex.match(new RegExp('\\b' + w.en + '\\w*', 'i'))[0]; return Object.assign(base, { ui: 'input', label: 'Вставь слово', lead: 'Вставь слово «' + w.ru + '»', tpl: m, gaps: [[form]], full: w.ex, typo: true, after: w.ex, why: w.exru }); } }
  return Object.assign(base, { ui: 'input', label: 'Как по-английски?', lead: 'Напиши по-английски', main: meaning, gaps: [[w.en].concat(w.en.includes('/') ? w.en.split('/').map(s => s.trim()) : [])], full: w.en, typo: true });
}

/* ---------- verb tasks ---------- */
function verbIntro(list) {
  return { key: 'vintro', ui: 'info', label: 'Новые неправильные глаголы', chip: list.length + ' глаголов', btn: 'Поехали!',
    node: el('div', { class: 'stack' }, el('p', { class: 'muted small' }, 'Три формы: сейчас — в прошлом (Past Simple) — «сделано» (Present Perfect, have + 3-я форма). Нажми, чтобы послушать.'),
      el('div', { class: 'tablewrap' }, el('table', { class: 'vt' }, el('tbody', null, list.map(v => el('tr', { onclick: () => AudioPlayer && speak([v.v, v.p[0], v.pp[0]].join(', ')) }, el('td', null, el('b', { lang: 'en' }, v.v), el('div', { class: 'vt-ru' }, v.ru)), el('td', { lang: 'en' }, pastStr(v)), el('td', { lang: 'en' }, ppStr(v)))))))),
    done: () => list.forEach(v => { const id = 'v:' + v.v; if (!S.cards[id]) { const r = applyGrade(id, 2); r.b = 1; r.due = today(); } }) };
}
function verbTask(v) {
  const id = 'v:' + v.v, r = S.cards[id] || { b: 1 }, b = r.b;
  const done = res => { const g = res.ok ? (res.help ? 2 : 3) : 0; const rr = applyGrade(id, g); logEvent('v', id, res.ok); return { note: res.ok ? 'Следующий раз: ' + whenLabel(rr.due) + '.' : 'Глагол вернётся завтра.' }; };
  const why = `${v.v} — ${pastStr(v)} — ${ppStr(v)} (${v.ru}). ${GRP_RU[v.grp] ? 'Группа: ' + GRP_RU[v.grp] + '.' : ''}${v.note ? ' ' + v.note : ''}`;
  const base = { src: 'v', chip: 'Неправильные глаголы', done, why, after: [v.v, v.p[0], v.pp[0]].join(', ') };
  const kind = b <= 1 ? rnd(['past', 'forms']) : b <= 3 ? rnd(['forms', 'ex', 'pp']) : rnd(['forms', 'ex', 'ex3']);
  if (kind === 'past') {
    const wrong = [v.v.replace(/e$/, '') + 'ed', v.pp[0] !== v.p[0] ? v.pp[0] : v.v + 's'].filter(x => !v.p.includes(x));
    const opts = shuffle([v.p[0]].concat(wrong.slice(0, 2)));
    return Object.assign(base, { key: id + ':past', ui: 'choice', label: 'Прошедшее', lead: 'Как будет в прошлом (Past Simple)?', main: v.v + ' — ' + v.ru, opts, a: opts.indexOf(v.p[0]), shuffle: false });
  }
  if (kind === 'pp') return Object.assign(base, { key: id + ':pp', ui: 'input', label: '3-я форма', lead: 'Впиши третью форму (have …)', tpl: 'I have ___ (' + v.v + ')', gaps: [v.pp], full: v.pp[0] });
  if (kind === 'ex') { const m = new RegExp('\\b(' + v.p.join('|') + ')\\b', 'i'); if (m.test(v.ex)) return Object.assign(base, { key: id + ':ex', ui: 'input', label: 'В предложении', lead: 'Вставь «' + v.v + '» в прошлом', tpl: v.ex.replace(m, '___') + ' (' + v.v + ')', gaps: [v.p], full: v.ex, after: v.ex, why: v.exru + ' ' + why }); }
  if (kind === 'ex3') { const m = new RegExp('\\b(' + v.pp.join('|') + ')\\b', 'i'); if (m.test(v.ex3)) return Object.assign(base, { key: id + ':ex3', ui: 'input', label: 'Present Perfect', lead: 'Вставь третью форму «' + v.v + '»', tpl: v.ex3.replace(m, '___') + ' (' + v.v + ')', gaps: [v.pp], full: v.ex3, after: v.ex3, why: v.ex3ru + ' ' + why }); }
  return Object.assign(base, { key: id + ':forms', ui: 'input', label: 'Три формы', lead: v.ru, tpl: v.v + ' — ___ — ___', gaps: [v.p, v.pp], full: v.v + ' — ' + pastStr(v) + ' — ' + ppStr(v) });
}

/* ---------- the warm-up shift ---------- */
function startWarmup(opts) {
  opts = opts || {};
  const queue = [];
  const dueW = shuffle(WORDS.filter(w => isDue(S.cards[w.id]))).slice(0, opts.only === 'v' ? 0 : 14);
  const dueV = shuffle(IRREGULAR.filter(v => isDue(S.cards['v:' + v.v]))).slice(0, opts.only === 'w' ? 0 : 8);
  const left = Math.max(0, (S.cfg.newWords || 8) - newWordsToday());
  const newW = opts.only === 'v' ? [] : nextNewWords(Math.min(left, 8));
  const newV = opts.only === 'w' ? [] : nextNewVerbs();
  // new words: intro, then a first check a few cards later
  newW.forEach(w => queue.push({ intro: w }));
  if (newV.length) queue.push({ vintro: newV });
  const checks = shuffle(dueW.map(w => ({ w })).concat(dueV.map(v => ({ v }))));
  newW.forEach(w => checks.push({ w, fresh: true }));
  newV.forEach(v => checks.push({ v, fresh: true }));
  const mixed = [];
  // interleave: intros first, then due cards mixed with checks of the new ones
  queue.forEach(q => mixed.push(q)); shuffle(checks).forEach(q => mixed.push(q));
  if (!mixed.length) { toast('Повторять нечего: все слова выучены на сегодня! Открой новые в разделе «Слова».'); markShift('w'); render(); return; }
  let i = 0;
  startSession({
    title: 'Разминка', shift: opts.shift === false ? null : 'w', total: mixed.length,
    next() {
      const q = mixed[i++]; if (!q) return null;
      if (q.intro) return wordIntro(q.intro);
      if (q.vintro) return verbIntro(q.vintro);
      return q.w ? wordTask(q.w) : verbTask(q.v);
    },
  });
}
function startTopicWords(tp) {
  const ws = WORDS.filter(w => w.tp === tp);
  const due = ws.filter(w => isDue(S.cards[w.id])), fresh = ws.filter(w => !S.cards[w.id]).slice(0, 8);
  const list = shuffle(due).slice(0, 12).map(w => ({ w })).concat(fresh.map(w => ({ intro: w }))).concat(fresh.map(w => ({ w })));
  if (!list.length) { const some = shuffle(ws).slice(0, 10).map(w => ({ w })); list.push(...some); }
  let i = 0;
  startSession({ title: TOPIC[tp].ru, total: list.length, next() { const q = list[i++]; if (!q) return null; return q.intro ? wordIntro(q.intro) : wordTask(q.w); } });
}

/* ---------- the Words tab ---------- */
function screenWords() {
  const out = [el('h1', { class: 'h1' }, 'Слова'), seg([['words', 'Слова'], ['verbs', 'Неправильные глаголы']], UI.wtab, v => { UI.wtab = v; render(); })];
  if (UI.wtab === 'verbs') return out.concat(verbsScreen());
  if (UI.wTopic) return out.concat(topicWordsScreen(UI.wTopic));
  const learned = WORDS.filter(w => S.cards[w.id] && S.cards[w.id].b >= 2).length;
  out.push(el('div', { class: 'card stack' }, el('div', { class: 'row between' }, el('b', null, `Выучено ${learned} из ${WORDS.length}`), el('span', { class: 'chip' }, dueWordCount() + ' к повторению')), bar(learned / WORDS.length, 'ice'),
    btn('Тренировать слова', 'primary block', () => startWarmup({ only: 'w', shift: false }))));
  out.push(el('div', { class: 'searchbox' }, icon('search'), el('input', { class: 'field', type: 'search', placeholder: 'Найти слово (по-английски или по-русски)', value: UI.wq, oninput: e => { UI.wq = e.target.value; const box = $('#wres'); if (box) fillSearch(box); } })));
  const box = el('div', { id: 'wres', class: 'stack', style: { gap: 0 } }); fillSearch(box); out.push(box);
  out.push(el('div', { class: 'topicgrid' }, TOPICS.map(t => {
    const ws = WORDS.filter(w => w.tp === t.id), got = ws.filter(w => S.cards[w.id] && S.cards[w.id].b >= 2).length;
    return el('button', { type: 'button', class: 'ttile', onclick: () => { UI.wTopic = t.id; render(); window.scrollTo(0, 0); } }, el('div', { class: 'em' }, t.e), el('div', { class: 'nm' }, t.ru), bar(got / ws.length, 'ice'), el('div', { class: 'small muted' }, got + '/' + ws.length));
  })));
  return out;
}
function wordRow(w) {
  const st = statusOf(w.id);
  return el('div', { class: 'list-row' }, el('span', { class: 'em' }, w.e || ''), el('div', { class: 'grow' }, el('div', { class: 'en', lang: 'en' }, w.en, S.cfg.ipa && w.ipa ? el('span', { class: 'ipa small' }, ' /' + w.ipa + '/') : null), el('div', { class: 'small muted' }, w.ru)),
    el('span', { class: 'dot ' + st, title: { new: 'новое', learning: 'учу', review: 'повторяю', strong: 'выучено' }[st] }), audioBtn(w.en));
}
function fillSearch(box) {
  box.replaceChildren(); const q = UI.wq.trim().toLowerCase(); if (q.length < 2) return;
  const hits = WORDS.filter(w => w.en.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q)).slice(0, 30);
  if (!hits.length) box.append(el('p', { class: 'muted small' }, 'Ничего не нашлось.'));
  hits.forEach(w => box.append(wordRow(w)));
}
function topicWordsScreen(tp) {
  const t = TOPIC[tp], ws = WORDS.filter(w => w.tp === tp);
  return [el('div', { class: 'row' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Назад', onclick: () => { UI.wTopic = null; render(); } }, icon('back')), el('h2', { class: 'h2 grow' }, t.e + ' ' + t.ru)),
    btn('Тренировать эту тему', 'primary block', () => startTopicWords(tp)),
    el('div', { class: 'stack', style: { gap: 0 } }, ws.map(wordRow))];
}
function verbsScreen() {
  const learned = IRREGULAR.filter(v => S.cards['v:' + v.v] && S.cards['v:' + v.v].b >= 3).length;
  const out = [el('div', { class: 'card stack' }, el('div', { class: 'row between' }, el('b', null, `Выучено ${learned} из ${IRREGULAR.length}`), el('span', { class: 'chip' }, dueVerbCount() + ' к повторению')), bar(learned / IRREGULAR.length, 'gold'),
    el('p', { class: 'small muted' }, 'Глаголы приходят порциями по ' + (S.cfg.newVerbs || 5) + '. Новая порция — когда прошлая держится. Повторение через 1, 2, 4, 7, 14 и 30 дней.'),
    btn('Тренировать глаголы', 'primary block', () => startWarmup({ only: 'v', shift: false })))];
  out.push(el('div', { class: 'tablewrap' }, el('table', { class: 'vt' }, el('thead', null, el('tr', null, el('th', null, 'V1'), el('th', null, 'V2'), el('th', null, 'V3'))),
    el('tbody', null, IRREGULAR.map(v => { const st = statusOf('v:' + v.v); return el('tr', { class: st, onclick: () => speak([v.v, v.p[0], v.pp[0]].join(', ')) }, el('td', null, el('b', { lang: 'en' }, v.v), el('div', { class: 'vt-ru' }, v.ru)), el('td', { lang: 'en' }, pastStr(v)), el('td', { lang: 'en' }, ppStr(v))); })))));
  return out;
}
