'use strict';
/* App shell: icons, navigation, the Today screen (the three shifts), the profile with the card collection,
   settings and the account. Grammar, words, school and the parent area have their own files. */

/* ---------- icons ---------- */
const IC = {
  today: [['path', { d: 'M4 20V10l8-6 8 6v10h-5v-6H9v6z' }]],
  grammar: [['path', { d: 'M4 19V6a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2zM8 8h6M8 12h6' }]],
  words: [['path', { d: 'M4 7V5h16v2M12 5v14M9 19h6' }]],
  school: [['path', { d: 'M3 8l9-4 9 4-9 4zM7 10v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5' }]],
  me: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', { d: 'M4 21c1-4 4.5-6 8-6s7 2 8 6' }]],
  vol: [['path', { d: 'M4 9v6h4l5 4V5L8 9z' }], ['path', { d: 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12' }]],
  close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  back: [['path', { d: 'M15 5l-7 7 7 7' }]],
  search: [['circle', { cx: 11, cy: 11, r: 6 }], ['path', { d: 'M20 20l-4-4' }]],
  lock: [['rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }], ['path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }]],
  check: [['path', { d: 'M5 12l5 5 9-10' }]],
  flame: [['path', { d: 'M12 3c1 4 6 5 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 .5 2 1.5 3 2.5 3 .5-3-1-5.5.5-8z' }]],
  puck: [['ellipse', { cx: 12, cy: 10, rx: 8, ry: 3 }], ['path', { d: 'M4 10v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4' }]],
  stick: [['path', { d: 'M15 3l-6 15h-4a2 2 0 0 0 0 4h6l7-19' }]],
  skate: [['path', { d: 'M5 4h5v8l7 2a2 2 0 0 1 2 2v1H5zM3 20h18' }]],
  goal: [['path', { d: 'M3 18V7h18v11M3 7l3 4h12l3-4M6 11v7M18 11v7' }]],
  star: [['path', { d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' }]],
  cards: [['rect', { x: 3, y: 5, width: 12, height: 16, rx: 2 }], ['path', { d: 'M9 3h10a2 2 0 0 1 2 2v14' }]],
  gear: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' }]],
  parent: [['circle', { cx: 8, cy: 8, r: 3 }], ['circle', { cx: 17, cy: 10, r: 2.4 }], ['path', { d: 'M2 20c.8-3.5 3-5 6-5s5.2 1.5 6 5M14 20c.4-2.5 1.6-3.8 3-3.8s2.8 1.3 3.2 3.8' }]],
  comic: [['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ['path', { d: 'M3 12h18M12 4v16' }]],
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  (IC[name] || []).forEach(([tag, attrs]) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) n.setAttribute(k, attrs[k]); s.append(n); });
  return s;
}

/* ---------- shared bits ---------- */
const UI = { tab: 'today', gTopic: null, gStep: 0, wtab: 'words', wq: '', wTopic: null, scMod: null, scSec: null, scEx: null, parentOpen: false, auth: { email: '', pw: '', msg: '', busy: false }, confirmReset: false };
function btn(label, cls, onclick, extra) { return el('button', Object.assign({ type: 'button', class: 'btn ' + (cls || ''), onclick }, extra || {}), label); }
function audioBtn(text, slow, label) {
  return el('button', { type: 'button', class: 'btn icon-btn' + (label ? ' wide' : ''), 'aria-label': slow ? 'Медленно' : 'Озвучить', onclick: e => { e.stopPropagation(); speak(text, slow); } },
    icon('vol'), slow ? el('span', { class: 'small' }, '½') : label ? el('span', { class: 'small' }, label) : null);
}
function seg(options, value, onpick) {
  return el('div', { class: 'seg', role: 'group' }, options.map(([v, label]) => el('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => onpick(v) }, label)));
}
function bar(frac, cls) { return el('div', { class: 'bar ' + (cls || '') }, el('i', { style: { width: Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' } })); }
function sectionTitle(t, right) { return el('div', { class: 'row between sec-title' }, el('h2', { class: 'h2' }, t), right || null); }

/* ---------- Coach Walt (a beaver): the generated pictures, a drawn stand-in if they are missing ---------- */
const COACH_IMG = typeof ART_FILES !== 'undefined' ? ART_FILES.coach || {} : {};
// small spots use the head pictures (f_*), big ones the whole coach
function coachFace(pose, size) {
  const f = (size <= 72 ? COACH_IMG['f_' + pose] || COACH_IMG.f_proud : null) || COACH_IMG[pose] || COACH_IMG.proud;
  if (f) return el('img', { class: 'coach-img', src: f, alt: 'Тренер Уолт', width: size, height: size, style: { width: size + 'px', height: size + 'px' } });
  return walrusSVG(pose, size);
}
function walrusSVG(pose, size) {
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('class', 'coach-img'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Тренер Уолт');
  const add = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); s.append(n); return n; };
  add('ellipse', { cx: 50, cy: 60, rx: 38, ry: 34, fill: '#9C7A63' });
  add('path', { d: 'M18 40 Q50 8 82 40 L80 46 Q50 30 20 46 Z', fill: '#D7263D' });
  add('rect', { x: 46, y: 22, width: 8, height: 6, rx: 2, fill: '#B81C30' });
  add('ellipse', { cx: 50, cy: 46, rx: 34, ry: 4, fill: '#B81C30' });
  const eyeY = 54;
  if (pose === 'cheer' || pose === 'laugh') { add('path', { d: 'M34 56 q5 -6 10 0 M56 56 q5 -6 10 0', stroke: '#1B1B1B', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }); }
  else { add('circle', { cx: 39, cy: eyeY, r: 4, fill: '#1B1B1B' }); add('circle', { cx: 61, cy: eyeY, r: 4, fill: '#1B1B1B' }); add('circle', { cx: 40.5, cy: eyeY - 1.5, r: 1.3, fill: '#fff' }); add('circle', { cx: 62.5, cy: eyeY - 1.5, r: 1.3, fill: '#fff' }); }
  if (pose === 'think') add('path', { d: 'M56 46 q6 -3 11 0', stroke: '#1B1B1B', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' });
  add('ellipse', { cx: 50, cy: 66, rx: 8, ry: 5, fill: '#4A3528' });
  add('ellipse', { cx: 40, cy: 74, rx: 13, ry: 9, fill: '#F2EDE6' }); add('ellipse', { cx: 60, cy: 74, rx: 13, ry: 9, fill: '#F2EDE6' });
  add('path', { d: 'M42 80 L40 95 L46 82 Z M58 80 L60 95 L54 82 Z', fill: '#FFFDF7', stroke: '#C9C2B8', 'stroke-width': 1 });
  if (pose === 'cheer' || pose === 'laugh') add('path', { d: 'M44 84 q6 6 12 0', stroke: '#7A2E2E', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' });
  add('path', { d: 'M30 92 Q50 99 70 92', stroke: '#C0C6CC', 'stroke-width': 2, fill: 'none' });
  add('circle', { cx: 50, cy: 96, r: 3, fill: '#C0C6CC' });
  return s;
}

/* ---------- player cards ---------- */
const PLAYER_IMG = typeof ART_FILES !== 'undefined' ? ART_FILES.players || {} : {};
function playerCard(p, open) {
  const got = open || hasPlayer(p), img = PLAYER_IMG[p.id];
  return el('button', { type: 'button', class: 'pcard ' + (got ? 'got ' + p.rare : 'locked'), style: { '--c1': p.c1, '--c2': p.c2 }, onclick: () => got ? showPlayer(p) : toast('Как открыть: ' + p.how) },
    el('div', { class: 'pc-num num' }, String(p.num)),
    got ? (img ? el('img', { src: img, alt: p.ru, class: 'pc-img', loading: 'lazy' }) : el('div', { class: 'pc-jersey num' }, String(p.num))) : el('div', { class: 'pc-lock' }, icon('lock')),
    el('div', { class: 'pc-name' }, got ? p.ru : '???'),
    el('div', { class: 'pc-pos small' }, got ? p.pos : p.how));
}
function showPlayer(p) {
  const img = PLAYER_IMG[p.id];
  openSheet(el('div', { class: 'stack' },
    el('div', { class: 'pc-big', style: { '--c1': p.c1, '--c2': p.c2 } }, img ? el('img', { src: img, alt: p.ru }) : el('div', { class: 'pc-jersey num' }, String(p.num)), el('div', { class: 'pc-num num' }, String(p.num))),
    el('h2', { class: 'h2' }, p.ru), el('div', { class: 'muted' }, p.name + ' · ' + p.pos),
    el('div', { class: 'card stack' }, el('div', { class: 'eyebrow' }, 'Прочитай по-английски'), p.en.map(s => el('div', { class: 'row' }, el('div', { class: 'grow en', lang: 'en' }, s), audioBtn(s)))),
    el('div', { class: 'muted small' }, 'Открыта за: ' + p.how)));
}

/* ---------- bottom sheet ---------- */
function openSheet(content) {
  closeSheet();
  const back = el('div', { class: 'sheet-back', onclick: e => { if (e.target === back) closeSheet(); } }, el('div', { class: 'sheet', role: 'dialog' }, el('div', { class: 'row between' }, el('span'), el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Закрыть', onclick: closeSheet }, icon('close'))), content));
  document.body.append(back);
}
function closeSheet() { const b = $('.sheet-back'); if (b) b.remove(); }

/* ---------- shell ---------- */
const TABS = [['today', 'Сегодня', 'today'], ['grammar', 'Грамматика', 'grammar'], ['words', 'Слова', 'words'], ['school', 'Школа', 'school'], ['me', 'Я', 'me']];
function go(tab) { UI.tab = tab; render(); window.scrollTo(0, 0); }
function refreshBadge() {
  const b = $('#sync'); if (!b) return;
  const s = Cloud.user ? Cloud.status : 'local';
  b.className = 'sync ' + s; b.title = { local: 'Только на этом устройстве', synced: 'Синхронизировано', syncing: 'Синхронизация…', offline: 'Нет сети: сохранится позже', error: 'Ошибка синхронизации', denied: 'Нет доступа к облаку' }[s] || s;
}
function onRemoteChange() { if (!OV) render(); }
function render() {
  const app = $('#app');
  if (!S.cfg.onboarded) { app.replaceChildren(onboardingView()); return; }
  const screens = { today: screenToday, grammar: screenGrammar, words: screenWords, school: screenSchool, me: screenMe };
  const main = el('main', { class: 'main wrap' }, (screens[UI.tab] || screenToday)());
  const xp = totalXP(), lv = levelOf(xp);
  app.replaceChildren(
    el('header', { class: 'top' }, el('div', { class: 'wrap row between' },
      el('div', { class: 'brand' }, logo(30), el('span', null, 'Power Play')),
      el('div', { class: 'row', style: { gap: '8px' } }, el('span', { class: 'streak-chip' + (streak() ? '' : ' off') }, icon('flame'), String(streak())), el('span', { class: 'lvl-chip num' }, lv.n + ' ур.'), el('span', { id: 'sync', class: 'sync' })))),
    main,
    el('nav', { class: 'nav' }, el('div', { class: 'wrap navrow' }, TABS.map(([id, label, ic]) => el('button', { type: 'button', 'aria-current': UI.tab === id ? 'page' : null, onclick: () => go(id) }, icon(ic), el('span', null, label))))));
  refreshBadge();
}
function logo(size) {
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'logo');
  const add = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); s.append(n); };
  add('rect', { x: 2, y: 2, width: 60, height: 60, rx: 16, fill: 'var(--red)' });
  add('ellipse', { cx: 32, cy: 40, rx: 20, ry: 7, fill: '#0B1220' }); add('rect', { x: 12, y: 32, width: 40, height: 8, fill: '#0B1220' }); add('ellipse', { cx: 32, cy: 32, rx: 20, ry: 7, fill: '#2A3550' });
  add('path', { d: 'M35 8 L24 30 L32 30 L27 48 L42 22 L33 22 L38 8 Z', fill: 'var(--gold)', stroke: '#0B1220', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  return s;
}

/* ---------- onboarding: name and jersey number ---------- */
function onboardingView() {
  const st = UI.ob || (UI.ob = { name: '', num: 19 });
  return el('main', { class: 'wrap onboard stack' },
    el('div', { class: 'center stack' }, logo(84), el('h1', { class: 'h1' }, 'Power Play'), el('p', { class: 'muted' }, 'Английский как хоккей: тренировки, матчи, карточки игроков.')),
    el('div', { class: 'coach-say' }, coachFace('proud', 96), el('div', { class: 'speech' }, 'Привет! Я тренер Уолт. Каждый день у нас три смены по 5–7 минут. Как тебя записать в состав?')),
    el('label', { class: 'stack' }, el('span', { class: 'eyebrow' }, 'Имя'), el('input', { class: 'field', value: st.name, maxlength: 20, autocomplete: 'given-name', oninput: e => { st.name = e.target.value; } })),
    el('div', { class: 'stack' }, el('span', { class: 'eyebrow' }, 'Номер на свитере'),
      el('div', { class: 'jersey-pick' }, el('div', { class: 'jersey num' }, String(st.num)),
        el('div', { class: 'row' }, btn('−', 'icon-btn', () => { st.num = Math.max(1, st.num - 1); render(); }), btn('+', 'icon-btn', () => { st.num = Math.min(99, st.num + 1); render(); })))),
    btn('На лёд!', 'primary big block', () => { setCfg({ name: st.name.trim() || 'Игрок', num: st.num, onboarded: true }); go('today'); }),
    Cloud.configured ? el('p', { class: 'muted small center' }, 'Уже есть аккаунт? Войти можно потом в разделе «Я».') : null);
}

/* ---------- Today ---------- */
function screenToday() {
  const out = [], xp = totalXP(), lv = levelOf(xp), st = streakInfo();
  out.push(el('section', { class: 'hero' },
    el('div', { class: 'hero-row' },
      el('div', { class: 'jersey sm num' }, String(S.cfg.num)),
      el('div', { class: 'grow stack', style: { gap: '4px' } }, el('div', { class: 'eyebrow light' }, lv.name), el('div', { class: 'h1' }, 'Привет, ' + (S.cfg.name || 'игрок') + '!'),
        el('div', { class: 'xpbar' }, el('i', { style: { width: Math.round(lv.pct * 100) + '%' } })),
        el('div', { class: 'small light' }, lv.next ? `${xp} XP · до «${lv.next}» ещё ${lv.to - xp}` : `${xp} XP · высшее звание`)))));

  // a message from mom, if there is one not yet read
  const m = (S.msgs || []).find(x => !x.del && !S.seen[x.id]);
  if (m) out.push(el('section', { class: 'card mom stack' }, el('div', { class: 'eyebrow' }, '💌 Сообщение от мамы'), el('div', { class: 'big' }, m.text), btn('Спасибо!', 'small', () => { S.seen[m.id] = { t: Date.now() }; Dirty.main = true; persist(); render(); })));

  out.push(sectionTitle('Сегодня: три смены', el('span', { class: 'chip' }, shiftsToday() + ' / 3')));
  out.push(el('div', { class: 'shifts' }, SHIFTS.map((s, i) => {
    const done = shiftDone(s.id), info = shiftInfo(s.id);
    return el('button', { type: 'button', class: 'shift' + (done ? ' done' : ''), onclick: () => startShift(s.id) },
      el('div', { class: 'shift-n num' }, done ? '✓' : String(i + 1)),
      el('div', { class: 'grow' }, el('div', { class: 'shift-name' }, s.name), el('div', { class: 'small muted' }, info)),
      el('div', { class: 'shift-ic' }, icon(s.icon)));
  })));
  out.push(el('div', { class: 'coach-say small-say' }, coachFace(shiftsToday() === 3 ? 'cheer' : 'proud', 64), el('div', { class: 'speech' }, shiftsToday() === 3 ? coachLine('dayDone') : shiftsToday() ? 'Хорошо идёшь! Сыграй ещё смену.' : coachLine('hello'))));

  const g = goalProgress();
  if (g) out.push(el('section', { class: 'card stack' }, el('div', { class: 'row between' }, el('b', null, '🎯 Цель недели'), el('span', { class: 'num' }, `${g.done} / ${g.target} смен`)), bar(g.pct, 'gold'), g.reward ? el('div', { class: 'small muted' }, 'Награда: ' + g.reward) : null));

  out.push(el('section', { class: 'card stack' },
    el('div', { class: 'row between' }, el('b', null, '🔥 Серия: ' + st.n + ' ' + plural(st.n, 'день', 'дня', 'дней')), st.froze ? el('span', { class: 'chip' }, '❄️ заморозка спасла серию') : null),
    el('div', { class: 'week' }, weekDots()),
    el('div', { class: 'small muted' }, 'Одна смена в день держит серию. Один пропуск в неделю прощается.')));

  const owned = PLAYERS.filter(hasPlayer).length;
  out.push(sectionTitle('Коллекция', btn('Все карточки', 'ghost small', () => go('me'))));
  const next = PLAYERS.find(p => !hasPlayer(p));
  out.push(el('div', { class: 'card row' }, el('div', { class: 'grow stack', style: { gap: '4px' } }, el('b', null, `${owned} из ${PLAYERS.length} игроков`), next ? el('div', { class: 'small muted' }, 'Следующая: ' + next.how) : el('div', { class: 'small' }, 'Вся команда собрана!')), bar(owned / PLAYERS.length, 'ice')));
  return out;
}
function weekDots() {
  const ws = weekStart(), names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return names.map((n, i) => { const d = addDays(ws, i), k = S.days[d] && S.days[d].sh ? Object.keys(S.days[d].sh).length : 0; return el('div', { class: 'wd' + (d === today() ? ' now' : '') }, el('i', { class: 'p' + k }), el('span', null, n)); });
}
function shiftInfo(id) {
  if (id === 'w') { const due = dueWordCount() + dueVerbCount(); return due ? `${due} на повторение + новые слова` : 'Новые слова и глаголы'; }
  if (id === 'g') { const t = currentTopic(); return t ? t.title_ru : 'Повторение пройденного'; }
  const t = currentTopic(), r = t && S.gr[t.id];
  if (r && r.ph === 'final' && finalAllowed(t.id)) return 'Матч по теме «' + t.title_ru + '»';
  return 'Спринт, проверка тем или учебник';
}
function startShift(id) {
  if (id === 'w') startWarmup();
  else if (id === 'g') startGrammarShift();
  else startMatchShift();
}

/* ---------- Me ---------- */
function screenMe() {
  const out = [], xp = totalXP(), lv = levelOf(xp), s = stats();
  out.push(el('section', { class: 'hero' }, el('div', { class: 'hero-row' }, el('div', { class: 'jersey num' }, String(S.cfg.num)),
    el('div', { class: 'grow stack', style: { gap: '4px' } }, el('div', { class: 'h1' }, S.cfg.name || 'Игрок'), el('div', { class: 'light' }, lv.name + ' · ' + xp + ' XP')))));
  out.push(el('div', { class: 'statgrid' },
    [['Слов выучено', s.words], ['Глаголов', s.verbs], ['Тем сдано', s.topics], ['Лучшая серия', longestStreak()]].map(([l, v]) => el('div', { class: 'stat' }, el('b', { class: 'num' }, String(v)), el('span', null, l)))));
  out.push(sectionTitle('Карточки игроков', el('span', { class: 'chip' }, PLAYERS.filter(hasPlayer).length + ' / ' + PLAYERS.length)));
  out.push(el('div', { class: 'cardgrid' }, PLAYERS.map(p => playerCard(p))));
  out.push(sectionTitle('Комиксы'));
  out.push(comicsShelf());
  out.push(sectionTitle('Настройки'));
  out.push(settingsCard());
  out.push(accountCard());
  out.push(el('section', { class: 'card stack' }, el('div', { class: 'row between' }, el('b', null, 'Для родителей'), icon('parent')), el('p', { class: 'small muted' }, 'Статистика, цель недели и сообщения. Вход по PIN-коду.'), btn('Открыть', '', openParent)));
  out.push(backupCard());
  return out;
}
function settingsCard() {
  return el('section', { class: 'card stack' },
    el('div', { class: 'row between' }, el('span', null, 'Звук даже в беззвучном режиме'), seg([[true, 'Вкл'], [false, 'Выкл']], DEV.loud, v => { DEV.loud = v; saveDev(); audioMode(); render(); })),
    el('div', { class: 'row between' }, el('span', null, 'Транскрипция у слов'), seg([[true, 'Да'], [false, 'Нет']], S.cfg.ipa, v => { setCfg({ ipa: v }); render(); })),
    el('div', { class: 'row between' }, el('span', null, 'Новых слов в день'), seg([[5, '5'], [8, '8'], [12, '12']], S.cfg.newWords, v => { setCfg({ newWords: v }); render(); })),
    el('div', { class: 'row between' }, el('span', null, 'Новых глаголов за раз'), seg([[3, '3'], [5, '5'], [7, '7']], S.cfg.newVerbs, v => { setCfg({ newVerbs: v }); render(); })),
    el('div', { class: 'row between' }, el('span', null, 'Имя и номер'), btn('Изменить', 'small', () => { UI.ob = { name: S.cfg.name, num: S.cfg.num }; setCfg({ onboarded: false }); render(); })),
    el('div', { class: 'row between' }, el('span', null, 'Весь звук для работы без интернета'), btn('Скачать', 'small', downloadAudio)));
}
async function downloadAudio() {
  if (!CLIPS.size) { toast('Записей пока нет.'); return; }
  toast('Скачиваю звук…');
  const r = await AudioPlayer.download((d, n) => toast(`Звук: ${d} из ${n}`));
  toast(r.failed ? `Готово, не скачалось: ${r.failed}` : 'Весь звук сохранён на устройстве.');
}
function accountCard() {
  if (!Cloud.configured) return null;
  const a = UI.auth;
  if (Cloud.user) return el('section', { class: 'card stack' }, el('div', { class: 'row between' }, el('b', null, 'Аккаунт'), el('span', { class: 'small muted' }, Cloud.user.email)),
    el('p', { class: 'small muted' }, 'Прогресс сохраняется в облаке и одинаков на всех устройствах с этим входом.'),
    btn('Выйти', 'small', () => window.__auth && window.__auth.signOut()));
  const doIt = async kind => {
    if (!window.__auth) { a.msg = 'Облако ещё загружается, попробуй через минуту.'; render(); return; }
    a.busy = true; a.msg = ''; render();
    try { if (kind === 'in') await window.__auth.signIn(a.email.trim(), a.pw); else if (kind === 'up') await window.__auth.signUp(a.email.trim(), a.pw); else { await window.__auth.reset(a.email.trim()); a.msg = 'Письмо для смены пароля отправлено.'; } a.pw = ''; }
    catch (e) { a.msg = { 'auth/invalid-credential': 'Неверная почта или пароль.', 'auth/email-already-in-use': 'Такой аккаунт уже есть: нажми «Войти».', 'auth/weak-password': 'Пароль — минимум 6 символов.', 'auth/invalid-email': 'Проверь почту.', 'auth/network-request-failed': 'Нет интернета.' }[e.code] || ('Ошибка: ' + (e.code || e.message)); }
    a.busy = false; render();
  };
  return el('section', { class: 'card stack' }, el('b', null, 'Аккаунт и синхронизация'),
    el('p', { class: 'small muted' }, 'Войди, чтобы прогресс сохранялся в облаке и был виден на другом устройстве.'),
    el('input', { class: 'field', type: 'email', placeholder: 'Почта', value: a.email, autocomplete: 'username', oninput: e => { a.email = e.target.value; } }),
    el('input', { class: 'field', type: 'password', placeholder: 'Пароль', value: a.pw, autocomplete: 'current-password', oninput: e => { a.pw = e.target.value; } }),
    a.msg ? el('div', { class: 'chip hint wrap' }, a.msg) : null,
    el('div', { class: 'grid2' }, btn('Войти', 'primary', () => doIt('in'), { disabled: a.busy ? true : null }), btn('Создать аккаунт', '', () => doIt('up'), { disabled: a.busy ? true : null })),
    btn('Забыл пароль', 'ghost small', () => doIt('reset')));
}
function backupCard() {
  return el('section', { class: 'card stack' }, el('b', null, 'Резервная копия'),
    el('div', { class: 'grid2' }, btn('Сохранить файл', 'small', () => {
      const blob = new Blob([exportCode()], { type: 'application/json' }); const a = el('a', { href: URL.createObjectURL(blob), download: 'powerplay-' + today() + '.json' }); document.body.append(a); a.click(); a.remove();
    }), btn('Загрузить копию', 'small', () => {
      const inp = el('input', { type: 'file', accept: 'application/json,.json', onchange: async e => { try { importCode(await e.target.files[0].text()); toast('Копия загружена.'); render(); } catch (er) { toast('Не получилось прочитать файл.'); } } }); inp.click();
    })),
    UI.confirmReset ? el('div', { class: 'grid2' }, btn('Да, стереть всё', 'danger small', () => { resetAll(); UI.confirmReset = false; render(); }), btn('Отмена', 'small', () => { UI.confirmReset = false; render(); }))
      : btn('Начать с нуля', 'ghost small', () => { UI.confirmReset = true; render(); }));
}
