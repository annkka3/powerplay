'use strict';
/* School track: Spotlight 8 Student's Book (modules 1–8 + Grammar Check) and Workbook. He does the exercises in the
   paper book and types only his answers; the app checks them and explains each one. The answer keys and
   explanations are published only encrypted (data/school.enc.json, made by tools/encrypt_school.js); the family code
   unlocks them on the device and is kept in the account settings, so every device of the account opens by itself. */
const SC = { data: null, loading: false, error: '', mods: [] };
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function scDecrypt(code) {
  const r = await fetch('data/school.enc.json'); if (!r.ok) throw new Error('HTTP ' + r.status);
  const box = await r.json(), enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(code.trim().toUpperCase()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
function scLoad() {
  if (SC.data || SC.loading || !S.cfg.fk) return;
  SC.loading = true;
  scDecrypt(S.cfg.fk).then(d => { SC.data = d; SC.mods = d.modules; SC.loading = false; if (!OV) render(); })
    .catch(() => { SC.loading = false; SC.error = 'Код не подошёл или файл не загрузился.'; setCfg({ fk: '' }); if (!OV) render(); });
}
const scKey = (m, s, e) => m.module + '|' + s.sec + '|' + e.no;
const exState = (m, s, e) => S.sc[scKey(m, s, e)];
const checkable = e => e.check && e.items && e.items.length;
function sameScAnswer(typed, accepted) {
  const t = normEn(typed);
  return [].concat(accepted).some(a => {
    const n = normEn(a);
    if (n === '-' || n === '0' || n === '') return ['-', '0', 'x', 'нет', ''].includes(t) && typed.trim() !== '';
    return n === t || n.replace(/\s/g, '') === t.replace(/\s/g, '');
  });
}

/* ---------- the School tab ---------- */
function screenSchool() {
  const out = [el('h1', { class: 'h1' }, 'Школа · Spotlight 8')];
  if (!S.cfg.fk) {
    const st = UI.fk || (UI.fk = { code: '', busy: false });
    out.push(el('div', { class: 'card stack' }, el('b', null, 'Нужен семейный код'), el('p', { class: 'small muted' }, 'Ответы к учебнику закрыты кодом. Введи его один раз — дальше всё откроется само на всех твоих устройствах.'),
      el('input', { class: 'field', value: st.code, placeholder: 'Например: ABCD-1234', autocapitalize: 'characters', autocomplete: 'off', oninput: e => { st.code = e.target.value; } }),
      SC.error ? el('div', { class: 'chip bad wrap' }, SC.error) : null,
      btn(st.busy ? 'Проверяю…' : 'Открыть', 'primary block', async () => {
        st.busy = true; SC.error = ''; render();
        try { const d = await scDecrypt(st.code); SC.data = d; SC.mods = d.modules; setCfg({ fk: st.code.trim().toUpperCase() }); } catch (e) { SC.error = 'Код не подошёл. Проверь и попробуй ещё раз.'; }
        st.busy = false; render();
      })));
    return out;
  }
  if (!SC.data) { scLoad(); out.push(el('p', { class: 'muted' }, SC.error || 'Открываю учебник…')); return out; }
  if (UI.scEx) return exerciseScreen(UI.scEx);
  if (UI.scSec) return sectionScreen(UI.scSec);
  if (UI.scMod != null) return moduleScreen(SC.mods[UI.scMod]);
  const cur = S.cfg.school;
  out.push(el('p', { class: 'muted small' }, 'Делай упражнения в учебнике или тетради, а сюда вписывай только ответы — проверю и объясню каждую ошибку.'));
  const group = (title, filter) => {
    const ms = SC.mods.map((m, i) => [m, i]).filter(([m]) => filter(m)); if (!ms.length) return;
    out.push(sectionTitle(title));
    out.push(el('div', { class: 'stack' }, ms.map(([m, i]) => {
      const all = m.sections.flatMap(s => s.exercises.filter(checkable).map(e => [s, e])), done = all.filter(([s, e]) => exState(m, s, e)).length;
      const isCur = cur && String(m.module) === String(cur);
      return el('button', { type: 'button', class: 'modrow' + (isCur ? ' cur' : ''), onclick: () => { UI.scMod = i; render(); window.scrollTo(0, 0); } },
        el('span', { class: 'mn num' }, String(m.module).replace('WB', '')),
        el('span', { class: 'grow' }, el('b', null, m.title_ru || m.title_en), el('div', { class: 'small muted' }, (isCur ? 'Сейчас в классе · ' : '') + `проверено ${done} из ${all.length} упражнений`), bar(all.length ? done / all.length : 0, 'ice')));
    })));
  };
  group('Учебник', m => typeof m.module === 'number' && m.module <= 8);
  group('Grammar Check', m => m.module === 9);
  group('Рабочая тетрадь', m => String(m.module).startsWith('WB'));
  return out;
}
function backRow(label, onback) { return el('div', { class: 'row' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Назад', onclick: onback }, icon('back')), el('h2', { class: 'h2 grow' }, label)); }
function moduleScreen(m) {
  const out = [backRow((String(m.module).startsWith('WB') ? 'Тетрадь, модуль ' + m.module.slice(2) : m.module === 9 ? 'Grammar Check' : 'Модуль ' + m.module) + ' · ' + (m.title_ru || ''), () => { UI.scMod = null; render(); })];
  out.push(el('div', { class: 'stack' }, m.sections.map(s => {
    const ex = s.exercises.filter(checkable), done = ex.filter(e => exState(m, s, e)).length;
    return el('button', { type: 'button', class: 'modrow', onclick: () => { UI.scSec = [UI.scMod, m.sections.indexOf(s)]; render(); window.scrollTo(0, 0); } },
      el('span', { class: 'mn num' }, s.sec), el('span', { class: 'grow' }, el('b', null, s.name || s.sec), el('div', { class: 'small muted' }, (s.topic_ru || '') + (ex.length ? ` · ${done}/${ex.length}` : ''))));
  })));
  return out;
}
function sectionScreen([mi, si]) {
  const m = SC.mods[mi], s = m.sections[si];
  const out = [backRow(s.sec + ' · ' + (s.name || ''), () => { UI.scSec = null; render(); })];
  if (s.topic_ru) out.push(el('p', { class: 'muted' }, s.topic_ru));
  if (s.explain_ru) out.push(el('section', { class: 'card stack rule' }, el('div', { class: 'eyebrow' }, 'Объяснение'), s.explain_ru.split(/\n\s*\n/).map(p => el('p', null, rich(p)))));
  const links = (s.grammar_ids || []).filter(id => typeof GR !== 'undefined' && (GR.byId[id] || !GR.data));
  if (links.length) out.push(el('div', { class: 'row wrapr' }, el('span', { class: 'small muted' }, 'Потренировать:'), links.map(id => btn(GR.byId[id] ? GR.byId[id].title_ru : id, 'small', () => { grLoad(() => { UI.gTopic = id; go('grammar'); }); }))));
  if ((s.words || []).length) out.push(el('details', { class: 'card' }, el('summary', null, el('b', null, 'Слова раздела (' + s.words.length + ')')),
    el('div', { class: 'stack', style: { gap: 0, marginTop: '8px' } }, s.words.map(w => el('div', { class: 'list-row' }, el('div', { class: 'grow' }, el('div', { class: 'en', lang: 'en' }, w.en), el('div', { class: 'small muted' }, w.ru)), audioBtn(w.en)))),
    btn('Учить эти слова', 'small', () => startSchoolWords(s))));
  out.push(sectionTitle('Упражнения'));
  out.push(el('div', { class: 'stack', style: { gap: 0 } }, s.exercises.map((e, ei) => {
    const st = exState(m, s, e), can = checkable(e);
    return el('button', { type: 'button', class: 'list-row exrow2', onclick: () => { UI.scEx = [mi, si, ei]; UI.scAns = {}; UI.scRes = null; render(); window.scrollTo(0, 0); } },
      el('span', { class: 'mn num small' }, String(e.no)), el('div', { class: 'grow' }, el('div', null, e.instr_ru), el('div', { class: 'small muted' }, (e.page ? 'с. ' + e.page + ' · ' : '') + (can ? (st ? `лучший результат ${st.best}/${st.n}` : 'с проверкой') : 'без проверки'))),
      st && st.best === st.n ? el('span', { class: 'chip good' }, '✓') : null);
  })));
  return out;
}
function exerciseScreen([mi, si, ei]) {
  const m = SC.mods[mi], s = m.sections[si], e = s.exercises[ei], key = scKey(m, s, e), res = UI.scRes;
  const book = String(m.module).startsWith('WB') ? 'Рабочая тетрадь' : 'Учебник';
  const out = [backRow('Упражнение ' + e.no, () => { UI.scEx = null; render(); }),
    el('div', { class: 'card stack' }, el('div', { class: 'eyebrow' }, book + (e.page ? ', с. ' + e.page : '') + ', упр. ' + e.no), el('div', null, e.instr_ru), e.note_ru ? el('div', { class: 'small muted' }, e.note_ru) : null)];
  if (!checkable(e)) {
    if (e.model_en) out.push(el('details', { class: 'card' }, el('summary', null, el('b', null, 'Показать образец')), el('div', { class: 'stack', style: { marginTop: '8px' } }, el('div', { class: 'en', lang: 'en', style: { whiteSpace: 'pre-wrap' } }, e.model_en), e.model_note_ru ? el('div', { class: 'small muted' }, e.model_note_ru) : null, audioBtn(e.model_en, false, 'Послушать'))));
    const st = S.sc[key];
    out.push(st ? el('div', { class: 'chip good' }, 'Отмечено сделанным') : btn('Я сделал это задание', 'primary block', () => { S.sc[key] = { best: 0, n: 0, d: today(), t: Date.now(), open: 1 }; Dirty.sc = true; logEvent('sc', key, true); persist(); if (UI.scShift) { UI.scShift = false; markShift('m'); } render(); }));
    return out;
  }
  const opts = e.opts && e.opts.length ? e.opts : null;
  out.push(el('div', { class: 'stack' }, e.items.map(it => {
    const r = res && res.per[it.n];
    const row = [el('span', { class: 'itn num' }, String(it.n))];
    if (opts) row.push(el('div', { class: 'letters' }, opts.map(o => el('button', { type: 'button', class: 'letter' + (UI.scAns[it.n] === o ? ' on' : '') + (r ? (sameScAnswer(o, it.a) ? ' right' : UI.scAns[it.n] === o ? ' wrong' : '') : ''), disabled: res ? true : null, onclick: () => { UI.scAns[it.n] = o; render(); } }, o))));
    else row.push(el('input', { class: 'field sm' + (r ? (r.ok ? ' ok' : ' bad') : ''), value: UI.scAns[it.n] || '', disabled: res ? true : null, lang: 'en', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', oninput: ev => { UI.scAns[it.n] = ev.target.value; } }));
    return el('div', { class: 'scitem' + (r ? (r.ok ? ' ok' : ' bad') : '') }, el('div', { class: 'row' }, row),
      r && !r.ok ? el('div', { class: 'small' }, el('span', { class: 'muted' }, 'Правильно: '), el('b', { lang: 'en' }, [].concat(it.a).join(' / '))) : null,
      r && it.why_ru ? el('div', { class: 'small why' }, it.why_ru) : null);
  })));
  if (!res) out.push(btn('Проверить', 'primary big block', () => checkSchool(m, s, e)));
  else {
    out.push(el('div', { class: 'card ' + (res.ok === res.n ? 'hl' : '') + ' stack' }, el('div', { class: 'coach-say small-say' }, coachFace(res.ok === res.n ? 'cheer' : res.ok / res.n >= 0.7 ? 'thumbs' : 'think', 60),
      el('div', { class: 'speech' }, el('b', null, `${res.ok} из ${res.n}`), el('div', { class: 'small' }, res.ok === res.n ? 'Всё верно! Отличная работа.' : 'Разбери ошибки выше — объяснение под каждым пунктом.')))));
    out.push(el('div', { class: 'grid2' }, btn('Решить заново', '', () => { UI.scAns = {}; UI.scRes = null; render(); }), btn('К списку', 'primary', () => { UI.scEx = null; render(); })));
  }
  return out;
}
function checkSchool(m, s, e) {
  const key = scKey(m, s, e), per = {}; let ok = 0;
  e.items.forEach(it => { const v = UI.scAns[it.n] || ''; const good = !!v.trim() && sameScAnswer(v, it.a); per[it.n] = { ok: good }; if (good) ok++; countAnswer(good); });
  const prev = S.sc[key], best = Math.max(ok, prev ? prev.best : 0);
  const gained = Math.max(0, best - (prev ? prev.best : 0)) * XP.school + (prev ? 0 : 10);
  if (gained) addXP(gained);
  S.sc[key] = { best, n: e.items.length, last: ok, err: e.items.filter(it => !per[it.n].ok).map(it => String(it.n)), d: today(), t: Date.now() };
  Dirty.sc = true; logEvent('sc', key, ok === e.items.length, { s: ok, n: e.items.length });
  UI.scRes = { per, ok, n: e.items.length };
  if (UI.scShift) { UI.scShift = false; markShift('m'); }
  const fresh = checkAchievements(); persist(); render();
  if (ok === e.items.length) celebrate(false);
  fresh.forEach(p => toast('Новая карточка: ' + p.ru + '!'));
}
function startSchoolWords(s) {
  const list = s.words.map((w, i) => ({ id: 'sw:' + w.en.toLowerCase().replace(/[^a-z0-9]+/g, '-'), en: w.en, ru: w.ru, tp: '', e: '', ex: '', ipa: '' }));
  list.forEach(w => { WORD[w.id] = w; });
  const queue = shuffle(list).slice(0, 12); let i = 0;
  startSession({ title: 'Слова ' + s.sec, total: queue.length, next() { const w = queue[i++]; if (!w) return null; return wordTask(w); } });
}
