'use strict';
/* The parent area (PIN): time spent, topics passed and stuck, difficult skills, words and verbs, school results,
   recent mistakes; the weekly goal with a reward, messages to the son and the current textbook module.
   It reads the same synced progress, so the parent can open it on her own phone signed in to his account. */
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pp:' + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
function openParent() { UI.parentOk = false; UI.pinIn = ''; UI.pin1 = ''; go('parent'); }
function screenParent() {
  const back = el('div', { class: 'row' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Назад', onclick: () => go('me') }, icon('back')), el('h1', { class: 'h2 grow' }, 'Для родителей'));
  if (!UI.parentOk) return [back, pinView()];
  return [back].concat(dashboard());
}
function pinView() {
  const setting = !S.cfg.pin, step = setting && UI.pin1 ? 2 : 1;
  const submit = async () => {
    const v = (UI.pinIn || '').trim(); if (!/^\d{4,6}$/.test(v)) { toast('PIN — 4–6 цифр.'); return; }
    if (setting) {
      if (step === 1) { UI.pin1 = v; UI.pinIn = ''; render(); return; }
      if (v !== UI.pin1) { UI.pin1 = ''; UI.pinIn = ''; toast('Не совпало, попробуйте ещё раз.'); render(); return; }
      setCfg({ pin: await sha(v) }); UI.parentOk = true; render(); return;
    }
    if ((await sha(v)) === S.cfg.pin) { UI.parentOk = true; render(); } else { UI.pinIn = ''; toast('Неверный PIN.'); render(); }
  };
  return el('div', { class: 'card stack center' }, icon('lock'),
    el('b', null, setting ? (step === 1 ? 'Придумайте PIN для родительского раздела' : 'Повторите PIN') : 'Введите PIN'),
    el('input', { class: 'field pin', type: 'password', inputmode: 'numeric', maxlength: 6, value: UI.pinIn || '', autocomplete: 'off', oninput: e => { UI.pinIn = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') submit(); } }),
    btn('Дальше', 'primary block', submit),
    setting ? el('p', { class: 'small muted' }, 'PIN хранится в виде хеша вместе с прогрессом, поэтому одинаков на всех устройствах аккаунта.') : null);
}
function minutes(d) { return Math.round(((S.days[d] && S.days[d].sec) || 0) / 60); }
function dashboard() {
  const out = [], ws = weekStart(), days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  const weekMin = Array.from({ length: 7 }, (_, i) => minutes(addDays(ws, i))).reduce((a, b) => a + b, 0);
  const st = stats(), lv = levelOf(totalXP());
  out.push(el('div', { class: 'statgrid' }, [['Минут за неделю', weekMin], ['Серия, дней', streak()], ['Тем сдано', st.topics], ['Слов выучено', st.words]].map(([l, v]) => el('div', { class: 'stat' }, el('b', { class: 'num' }, String(v)), el('span', null, l)))));
  const max = Math.max(10, ...days.map(minutes));
  out.push(el('section', { class: 'card stack' }, el('b', null, 'Активное время, 14 дней'),
    el('div', { class: 'chart' }, days.map(d => { const m = minutes(d), sh = S.days[d] && S.days[d].sh ? Object.keys(S.days[d].sh).length : 0; return el('div', { class: 'col', title: d + ': ' + m + ' мин, смен ' + sh }, el('span', { class: 'v num' }, m ? String(m) : ''), el('i', { style: { height: Math.round(m / max * 100) + '%' }, class: 'p' + sh }), el('span', { class: 'd' }, d.slice(8))); })),
    el('div', { class: 'small muted' }, 'Считается время между ответами (не больше минуты на ответ), поэтому это реальная работа, а не открытое приложение. Цвет столбика — сколько смен сыграно.'),
    el('div', { class: 'small' }, `Звание: ${lv.name} · ${totalXP()} XP · лучшая серия ${longestStreak()} дн.`)));

  // grammar
  if (GR.data) {
    const cur = currentTopic(), rows = [];
    GR.list.forEach(t => {
      const r = S.gr[t.id]; if (!r || r.ph === 'new') return;
      const fails = (r.fin || []).filter(f => f.s < FINAL_PASS).length, pass = (r.fin || []).find(f => f.s >= FINAL_PASS);
      const acc = r.hist.length ? Math.round(r.hist.filter(Boolean).length / r.hist.length * 100) : null;
      const first = Math.min(...S.log.filter(l => l.tp === t.id).map(l => l.t), Date.now());
      const stuck = !r.done && (fails >= 2 || (Date.now() - first > 7 * 864e5));
      rows.push(el('div', { class: 'list-row' }, el('div', { class: 'grow' }, el('b', null, t.title_ru), el('div', { class: 'small muted' },
        (r.done ? 'Сдана ' + r.done + (pass ? ` (матч ${pass.s}/${pass.n})` : '') : 'В работе') + (acc != null ? ` · точность ${acc}%` : '') + (fails ? ` · проигранных матчей: ${fails}` : '') + (r.ph === 'train' && r.done ? ' · подзабылась' : ''))),
        stuck ? el('span', { class: 'chip bad' }, 'застрял') : r.done ? el('span', { class: 'chip good' }, '✓') : null));
    });
    out.push(el('section', { class: 'card stack' }, el('b', null, 'Грамматика'), el('div', { class: 'small' }, cur ? 'Сейчас: ' + cur.title_ru : 'Все темы пройдены'), rows.length ? el('div', { class: 'stack', style: { gap: 0 } }, rows) : el('div', { class: 'small muted' }, 'Пока не начато.')));
    const weak = [];
    GR.list.forEach(t => { const r = S.gr[t.id]; if (!r) return; Object.keys(r.tg || {}).forEach(tag => { const g = r.tg[tag]; if (g.n >= 5 && g.ok / g.n < 0.6) weak.push([t, tag, g]); }); });
    if (weak.length) out.push(el('section', { class: 'card stack' }, el('b', null, 'Трудные навыки'), weak.sort((a, b) => a[2].ok / a[2].n - b[2].ok / b[2].n).slice(0, 10).map(([t, tag, g]) => el('div', { class: 'skill' }, el('div', { class: 'row between' }, el('span', null, (t.tags[tag] ? t.tags[tag].ru : tag) + ' · ' + t.title_ru), el('span', { class: 'small muted' }, `${g.ok}/${g.n}`)), bar(g.ok / g.n, 'red')))));
  } else grLoad();

  // words and verbs
  const hardW = WORDS.filter(w => S.cards[w.id] && (S.cards[w.id].h || S.cards[w.id].l >= 2)).slice(0, 20);
  const hardV = IRREGULAR.filter(v => { const r = S.cards['v:' + v.v]; return r && (r.h || r.l >= 2); });
  out.push(el('section', { class: 'card stack' }, el('b', null, 'Слова и глаголы'), el('div', { class: 'small' }, `Слов выучено: ${st.words} из ${CORE_WORDS.length}. Глаголов: ${st.verbs} из ${IRREGULAR.length}.`),
      typeof COMICS !== 'undefined' && COMICS.length ? el('div', { class: 'small' }, 'Комиксы: прочитано ' + COMICS.filter(e => cmRead(e.id)).length + ' из ' + COMICS.length + '. Слов добавлено из комиксов: ' + Object.keys(S.cards).filter(id => id.startsWith('cm-')).length + '.') : null,
    hardW.length ? el('div', { class: 'small' }, el('span', { class: 'muted' }, 'Трудные слова: '), hardW.map(w => w.en).join(', ')) : null,
    hardV.length ? el('div', { class: 'small' }, el('span', { class: 'muted' }, 'Трудные глаголы: '), hardV.map(v => v.v + ' – ' + v.p[0] + ' – ' + v.pp[0]).join('; ')) : null));

  // school
  const sc = Object.entries(S.sc).sort((a, b) => b[1].t - a[1].t);
  out.push(el('section', { class: 'card stack' }, el('b', null, 'Учебник'), sc.length ? el('div', { class: 'stack', style: { gap: 0 } }, sc.slice(0, 12).map(([k, r]) => { const [m, s, e] = k.split('|'); return el('div', { class: 'list-row' }, el('div', { class: 'grow' }, el('div', null, (String(m).startsWith('WB') ? 'Тетрадь ' + m.slice(2) : m === '9' ? 'Grammar Check' : 'Модуль ' + m) + ', ' + s + ', упр. ' + e), el('div', { class: 'small muted' }, r.open ? 'отмечено сделанным' : `лучший ${r.best}/${r.n}` + (r.err && r.err.length ? ' · ошибки в пунктах ' + r.err.join(', ') : ''))), el('span', { class: 'small muted' }, r.d || '')); })) : el('div', { class: 'small muted' }, 'Пока не открывал.'),
    el('div', { class: 'row between' }, el('span', { class: 'small' }, 'Модуль в классе сейчас:'), el('select', { class: 'field sm', onchange: e => setCfg({ school: e.target.value }) }, [['', '—']].concat([1, 2, 3, 4, 5, 6, 7, 8].map(n => [String(n), 'Модуль ' + n])).map(([v, l]) => el('option', { value: v, selected: String(S.cfg.school) === v ? true : null }, l))))));

  // recent mistakes
  const errs = S.log.filter(l => !l.ok).slice(-15).reverse();
  if (errs.length) out.push(el('section', { class: 'card stack' }, el('b', null, 'Последние ошибки'), el('div', { class: 'stack', style: { gap: 0 } }, errs.map(l => el('div', { class: 'list-row small' }, el('div', { class: 'grow' }, mistakeText(l)), el('span', { class: 'muted' }, new Date(l.t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })))))));

  // goal, messages, settings
  const g = S.goal || {};
  const gs = UI.goalEdit || (UI.goalEdit = { target: g.target || 15, reward: g.reward || '' });
  out.push(el('section', { class: 'card stack' }, el('b', null, '🎯 Цель на неделю'), el('div', { class: 'small muted' }, 'Сколько смен за неделю (в день их три). Награда видна ему на главном экране.'),
    el('div', { class: 'row' }, el('input', { class: 'field sm', type: 'number', min: 1, max: 21, value: gs.target, oninput: e => { gs.target = +e.target.value; } }), el('span', { class: 'small' }, 'смен')),
    el('input', { class: 'field', placeholder: 'Награда, например: поход на матч', value: gs.reward, oninput: e => { gs.reward = e.target.value; } }),
    btn('Сохранить цель', 'primary', () => { S.goal = { target: Math.max(1, Math.min(21, gs.target || 15)), reward: gs.reward.trim(), t: Date.now() }; Dirty.main = true; persist(); toast('Цель сохранена.'); render(); }),
    goalProgress() ? el('div', { class: 'small' }, `На этой неделе: ${goalProgress().done} из ${goalProgress().target}`) : null));
  out.push(el('section', { class: 'card stack' }, el('b', null, '💌 Сообщения сыну'), el('div', { class: 'small muted' }, 'Появятся у него один раз: на главном экране или после тренировки.'),
    el('textarea', { class: 'field', rows: 2, placeholder: 'Например: Горжусь тобой! Ты всё сможешь 💪', value: UI.msgDraft || '', oninput: e => { UI.msgDraft = e.target.value; } }),
    btn('Отправить', 'primary', () => { const t = (UI.msgDraft || '').trim(); if (!t) return; S.msgs.push({ id: uid(), text: t, t: Date.now() }); UI.msgDraft = ''; Dirty.main = true; persist(); toast('Сообщение ждёт его.'); render(); }),
    S.msgs.filter(m => !m.del).slice(-8).reverse().map(m => el('div', { class: 'list-row small' }, el('div', { class: 'grow' }, m.text, el('div', { class: 'muted' }, S.seen[m.id] ? 'прочитано' : 'ещё не видел')), btn('Удалить', 'ghost small', () => { m.del = 1; m.t = Date.now(); Dirty.main = true; persist(); render(); })))));
  out.push(el('section', { class: 'card stack' }, el('b', null, 'Настройки'),
    S.cfg.fk ? el('div', { class: 'small' }, 'Семейный код учебника: ', el('b', null, S.cfg.fk)) : el('div', { class: 'small muted' }, 'Учебник ещё не открыт кодом.'),
    btn('Сменить PIN', 'small', () => { setCfg({ pin: '' }); UI.parentOk = false; UI.pin1 = ''; render(); }),
    btn('Выйти из родительского раздела', 'small', () => { UI.parentOk = false; go('me'); })));
  return out;
}
function mistakeText(l) {
  if (l.k === 'gr' && GR.items[l.i]) { const { t, it } = GR.items[l.i]; const q = it.q || it.s || it.src || it.ru || it.say || ''; return el('span', null, el('span', { class: 'muted' }, t.title_ru + ': '), el('span', { lang: 'en' }, q)); }
  if (l.k === 'w' && WORD[l.i]) return 'Слово: ' + WORD[l.i].en + ' — ' + WORD[l.i].ru;
  if (l.k === 'v') { const v = VERB[l.i.slice(2)]; return v ? 'Глагол: ' + v.v + ' – ' + v.p[0] + ' – ' + v.pp[0] : l.i; }
  if (l.k === 'sc') { const [m, s, e] = l.i.split('|'); return 'Учебник: ' + (m === '9' ? 'Grammar Check' : String(m).startsWith('WB') ? 'тетрадь ' + m.slice(2) : 'модуль ' + m) + ', ' + s + ', упр. ' + e; }
  return l.i;
}

