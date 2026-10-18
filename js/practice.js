'use strict';
/* The practice overlay. Every exercise in the app (grammar, words, irregular verbs, games) is turned into a "task"
   and played here, one after another. A task:
   { key, src, ui: 'choice'|'input'|'tiles'|'tap'|'pairs'|'self'|'info', label, lead, main, say,
     opts, a                      — choice: options and the index of the right one
     tpl, gaps                    — input: text with ___ for every gap and a list of accepted answers per gap
                                    (no tpl = one answer field under the prompt)
     tiles, answer                — tiles: word tiles and the sentence they must make
     words, bad, fix              — tap: words of a sentence, index of the wrong one and its correction
     pairs                        — pairs: [[left, right], …]
     self                         — speak / write tasks the learner checks himself: {mode, say, model, check}
     why, after, tag, final, typo — explanation, text to read aloud after answering, skill tag, no hints, typo allowed
     done(res)                    — called with {ok, help, typo, given}, may return extra info }
   A session supplies tasks through next() so that the grammar engine can adapt to every answer. */
let OV = null;

function startSession(opts) {
  // opts: { title, kind, next(): task|null, finish(summary): extra, total, shift }
  if (OV && OV.timer) clearInterval(OV.timer);
  OV = Object.assign({ i: 0, results: [], combo: 0, best: 0, xp: 0, t0: Date.now(), cur: null, phase: 'ask' }, opts);
  levelBefore = null;
  // the sprint shows a countdown and ends by itself
  if (OV.sprint) OV.timer = setInterval(() => { if (!OV || OV.phase === 'end') return; const left = $('#sprint-left'); if (left) left.textContent = Math.max(0, Math.ceil((OV.deadline - Date.now()) / 1000)) + ' с'; if (Date.now() > OV.deadline && OV.phase !== 'fb') finishSession(); }, 250);
  nextTask();
}
function closeOV() {
  if (OV && OV.timer) clearInterval(OV.timer);
  stopListening(); AudioPlayer.stop();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  OV = null; persist(); renderOV(); render();
}
function nextTask() {
  const t = OV.next(OV);
  if (!t) { finishSession(); return; }
  OV.cur = { t, typed: [], picked: null, tiles: [], line: [], help: 0, tapped: null, sel: null, done: new Set(), msg: '', res: null, shown: Date.now() };
  if (t.ui === 'tiles') OV.cur.tiles = shuffle(t.tiles.map((w, id) => ({ w, id })));
  if (t.ui === 'pairs') OV.cur.right = shuffle(t.pairs.map((p, i) => ({ w: p[1], i })));
  if (t.ui === 'choice' && t.shuffle !== false) { const order = shuffle(t.opts.map((_, i) => i)); OV.cur.order = order; } else OV.cur.order = (t.opts || []).map((_, i) => i);
  OV.phase = t.ui === 'info' ? 'info' : 'ask';
  renderOV();
  if (t.say && t.autoplay !== false) setTimeout(() => speak(t.say), 250);
  focusFirst();
}
function focusFirst() { setTimeout(() => { const f = document.querySelector('#ov input.gapin, #ov textarea'); if (f && matchMedia('(hover: hover)').matches) f.focus({ preventScroll: true }); }, 60); }

/* ---------- grading ---------- */
function grade(res) {
  const c = OV.cur, t = c.t;
  c.res = res; OV.phase = 'fb';
  const ok = res.ok, clean = ok && !c.help && !res.typo;
  OV.results.push({ key: t.key, ok, clean, tag: t.tag, src: t.src });
  if (t.ui !== 'self' || res.counted !== false) countAnswer(ok);
  if (ok) {
    OV.combo++; OV.best = Math.max(OV.best, OV.combo);
    let gain = XP.ok + (clean ? XP.clean : 0);
    if (OV.combo === 3 || (OV.combo > 3 && OV.combo % 5 === 0)) { gain += XP.hat; c.hat = true; celebrate(OV.combo >= 5); }
    addXP(gain); OV.xp += gain; c.gain = gain;
  } else OV.combo = 0;
  c.coach = ok ? (c.hat ? coachLine(OV.combo >= 10 ? 'ten' : OV.combo >= 5 ? 'five' : 'hat') : (t.tagRu && Math.random() < 0.35 ? coachLine('okTag', { tag: t.tagRu }) : coachLine('ok'))) : coachLine('wrong');
  if (t.done) c.extra = t.done(Object.assign({ help: c.help }, res)) || null;
  persist();
  renderOV();
  if (OV.sprint) { setTimeout(() => { if (OV && OV.phase === 'fb' && OV.cur === c) nextAfterFeedback(); }, ok ? 450 : 1300); return; }
  if (t.after && DEV.loud !== null) setTimeout(() => speak(t.after), ok ? 150 : 350);
}
function checkInput() {
  const c = OV.cur, t = c.t;
  const inputs = Array.from(document.querySelectorAll('#ov input.gapin'));
  const vals = inputs.map(x => x.value);
  if (vals.every(v => !v.trim())) { inputs[0] && inputs[0].focus(); return; }
  c.typed = vals;
  const per = t.gaps.map((acc, i) => okAny(vals[i] || '', acc));
  const typo = !per.every(Boolean) && t.typo && t.gaps.length === 1 && isTypo(vals[0], t.gaps[0]);
  grade({ ok: per.every(Boolean) || typo, per, typo, given: vals.join(' / ') });
}
function pickOption(i) {
  const c = OV.cur; if (OV.phase !== 'ask') return;
  c.picked = i; grade({ ok: i === c.t.a, given: c.t.opts[i] });
}
function tapWord(i) {
  const c = OV.cur; if (OV.phase !== 'ask') return;
  c.tapped = i; grade({ ok: i === c.t.bad, given: c.t.words[i] });
}
function tileTap(tile) {
  const c = OV.cur; if (OV.phase !== 'ask') return;
  const inLine = c.line.indexOf(tile.id);
  if (inLine >= 0) c.line.splice(inLine, 1); else c.line.push(tile.id);
  renderOV();
}
function checkTiles() {
  const c = OV.cur, t = c.t;
  const made = c.line.map(id => t.tiles[id]).join(' ');
  grade({ ok: sameEn(made, t.answer), given: made });
}
// pairs: tap a left item, then its partner on the right; a wrong pair counts as one mistake
function pairTap(side, i) {
  const c = OV.cur, t = c.t; if (OV.phase !== 'ask') return;
  if (side === 'L') { if (!c.done.has(i)) c.sel = i; renderOV(); return; }
  if (c.sel == null) return;
  const r = c.right[i];
  if (r.i === c.sel) {
    c.done.add(c.sel); c.rdone = c.rdone || new Set(); c.rdone.add(i); c.sel = null;
    if (c.done.size === t.pairs.length) grade({ ok: !c.miss, given: '' }); else renderOV();
  } else { c.miss = (c.miss || 0) + 1; c.flash = i; renderOV(); setTimeout(() => { if (OV && OV.cur === c) { c.flash = null; renderOV(); } }, 450); }
}
function useHint() {
  const c = OV.cur, t = c.t; if (OV.phase !== 'ask' || t.final) return;
  c.help++;
  if (t.ui === 'choice' && t.opts.length > 2) {
    const wrong = c.order.filter(i => i !== t.a && !(c.hidden || []).includes(i));
    if (wrong.length) { c.hidden = (c.hidden || []).concat(rnd(wrong)); }
  } else if (t.ui === 'input') {
    const inputs = Array.from(document.querySelectorAll('#ov input.gapin'));
    inputs.forEach((x, i) => { const ans = t.gaps[i][0]; const n = Math.min(ans.length, (c.help) + 0); if (!x.value || ans.toLowerCase().startsWith(x.value.toLowerCase())) x.value = ans.slice(0, Math.max(1, n)); c.typed[i] = x.value; });
  } else if (t.ui === 'tiles') {
    const want = normEn(t.answer).split(' ');
    const first = t.tiles.findIndex((w, id) => normEn(w) === want[c.line.length] && !c.line.includes(id));
    if (first >= 0) c.line.push(first);
  } else if (t.ui === 'tap') { c.msg = 'Подсказка: ошибка в глаголе или служебном слове. Читай слева направо.'; }
  if (t.hint) c.msg = t.hint;
  renderOV(); focusFirst();
}
function skipTask() { if (OV.phase === 'ask') grade({ ok: false, given: '', skipped: true }); }
function nextAfterFeedback() { OV.i++; nextTask(); }

/* ---------- speaking: speech recognition where it exists, self-check otherwise ---------- */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
function micAvailable() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return !!SpeechRec && !(ios && standalone);
}
function stopListening() { const c = OV && OV.cur; if (c && c.recog) { c.recog.quiet = true; try { c.recog.abort(); } catch (e) { /* ignore */ } } }
function listen() {
  const c = OV.cur, t = c.t;
  if (c.recog) { try { c.recog.stop(); } catch (e) { /* ignore */ } return; }
  AudioPlayer.release();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) { /* ignore */ }
  let rec; try { rec = new SpeechRec(); } catch (e) { return; }
  rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
  let timer, over = false;
  const end = msg => { if (over) return; over = true; clearTimeout(timer); c.recog = null; c.listening = false; audioMode(); if (msg !== undefined) c.msg = msg; renderOV(); };
  c.recog = rec; c.listening = true; c.msg = ''; renderOV();
  rec.onresult = ev => {
    const alts = Array.from(ev.results[0] || []).map(a => a.transcript);
    const target = t.self.say;
    if (alts.some(a => sameEn(a, target))) { end(''); grade({ ok: true, given: alts[0] }); }
    else { c.tries = (c.tries || 0) + 1; end(`Я услышал: «${alts[0] || ''}». Попробуй ещё раз или проверь себя сам.`); }
  };
  rec.onerror = ev => {
    const e = ev && ev.error;
    end(e === 'not-allowed' || e === 'service-not-allowed' ? 'Микрофон не разрешён. Разреши его в настройках Safari или проверь себя сам.'
      : e === 'no-speech' ? 'Ничего не слышно. Нажми микрофон и говори сразу.' : e === 'aborted' ? (rec.quiet ? '' : 'Слушание остановлено.') : 'Не получилось распознать. Проверь себя сам.');
  };
  rec.onend = () => { if (!over) end('Ничего не распознано. Попробуй ещё раз или проверь себя сам.'); };
  timer = setTimeout(() => { if (!over) { try { rec.abort(); } catch (e) { /* ignore */ } end('Микрофон не ответил. Проверь себя сам.'); } }, 12000);
  try { rec.start(); } catch (e) { end('Не удалось включить микрофон.'); }
}

/* ---------- end of a session ---------- */
function finishSession() {
  const r = OV.results, graded = r.filter(x => x.ok !== undefined);
  const ok = graded.filter(x => x.ok).length, bad = graded.length - ok;
  const sum = { ok, bad, n: graded.length, xp: OV.xp, best: OV.best, secs: Math.round((Date.now() - OV.t0) / 1000) };
  sum.extra = OV.finish ? OV.finish(sum) : null;
  if (OV.shift) { sum.dayFull = markShift(OV.shift); }
  sum.rank = rankUp();
  sum.cards = checkAchievements();
  const pct = sum.n ? ok / sum.n : 1;
  sum.coach = sum.extra && sum.extra.coach ? sum.extra.coach : coachLine(pct >= 0.85 ? 'sessionTop' : pct >= 0.6 ? 'sessionOk' : 'sessionLow');
  sum.pose = pct >= 0.85 ? 'cheer' : pct >= 0.6 ? 'thumbs' : 'think';
  sum.mom = momMessage(sum);
  if (OV.timer) clearInterval(OV.timer);
  OV.summary = sum; OV.phase = 'end';
  persist(); renderOV();
  if (pct >= 0.85 && sum.n >= 5) celebrate(true);
}
// A message written by the parent appears once, at a good moment (end of a session).
function momMessage() {
  const m = (S.msgs || []).find(x => !x.del && !(S.seen[x.id]));
  if (!m) return null;
  S.seen[m.id] = { t: Date.now() }; Dirty.main = true;
  return m;
}

/* ---------- rendering ---------- */
function renderOV() {
  let ov = $('#ov');
  if (!OV) { if (ov) ov.remove(); document.body.style.overflow = ''; return; }
  if (!ov) { ov = el('div', { id: 'ov', class: 'overlay' }); document.body.append(ov); }
  document.body.style.overflow = 'hidden';
  ov.replaceChildren(OV.phase === 'end' ? summaryView() : taskView());
  const fb = ov.querySelector('.feedback'); if (fb) fb.scrollIntoView({ block: 'nearest' });
}
function topBar() {
  const total = OV.total || 0, frac = total ? Math.min(1, OV.i / total) : 0;
  return el('div', { class: 'ov-top' },
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Закрыть', onclick: () => { if (OV.results.length && OV.phase !== 'end') { if (!confirmLeave()) return; } closeOV(); } }, icon('close')),
    OV.sprint ? el('div', { class: 'grow row' }, el('span', { class: 'chip red num', id: 'sprint-left' }, Math.max(0, Math.ceil((OV.deadline - Date.now()) / 1000)) + ' с'), el('span', { class: 'small muted' }, 'Спринт')) : el('div', { class: 'meter grow' }, el('i', { style: { width: (frac * 100) + '%' } })),
    el('div', { class: 'combo' + (OV.combo >= 3 ? ' hot' : '') }, icon('puck'), String(OV.combo)),
    el('div', { class: 'xp-chip num' }, '+' + OV.xp + ' XP'));
}
let leaveArmed = 0;
function confirmLeave() { if (Date.now() - leaveArmed < 3000) return true; leaveArmed = Date.now(); toast('Нажми ещё раз, чтобы выйти. Прогресс сохранён.'); return false; }

function gapLen(acc) { return Math.max(3, Math.min(22, Math.max(...acc.map(a => a.length)) + 1)); }
function inputNode(i, acc) {
  const c = OV.cur, fb = OV.phase === 'fb', per = fb && c.res.per ? c.res.per[i] : null;
  return el('input', {
    class: 'gapin' + (fb ? (per ? ' ok' : ' bad') : ''), type: 'text', value: c.typed[i] || '', size: gapLen(acc), disabled: fb ? true : null,
    autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', lang: 'en', inputmode: 'text', enterkeyhint: 'done',
    'aria-label': 'Ответ ' + (i + 1),
    oninput: e => { c.typed[i] = e.target.value; },
    onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); const all = Array.from(document.querySelectorAll('#ov input.gapin')); const k = all.indexOf(e.target); if (k < all.length - 1) all[k + 1].focus(); else checkInput(); } },
  });
}
// a template with ___ gaps → text and inputs; chat lines are rendered as bubbles
function templateNodes(tpl, startIndex) {
  const parts = String(tpl).split('___'), out = [];
  parts.forEach((p, k) => { out.push(p); if (k < parts.length - 1) out.push(inputNode(startIndex + k, OV.cur.t.gaps[startIndex + k])); });
  return out;
}
function promptBlock(t) {
  const out = [];
  if (t.lead) out.push(el('div', { class: 'lead' }, t.lead));
  if (t.ui === 'input' && t.chat) {
    let gi = 0;
    out.push(el('div', { class: 'chat' }, t.chat.map(l => {
      const n = (l.t.match(/___/g) || []).length, nodes = templateNodes(l.t, gi); gi += n;
      return el('div', { class: 'bubble ' + (l.who === 'you' ? 'me' : 'them') }, el('div', { class: 'who' }, l.who === 'you' ? 'Ты' : l.who), el('div', { class: 'en', lang: 'en' }, nodes));
    })));
  } else if (t.ui === 'input' && t.tpl) {
    out.push(el('div', { class: t.long ? 'textblock en' : 'prompt en', lang: 'en' }, templateNodes(t.tpl, 0)));
  } else if (t.main) {
    out.push(el('div', { class: 'prompt' + (t.mainEn ? ' en' : ''), lang: t.mainEn ? 'en' : null }, t.main));
  }
  if (t.sub) out.push(el('div', { class: 'muted' }, t.sub));
  if (t.say) out.push(el('div', { class: 'row' }, audioBtn(t.say, false, 'Слушать'), audioBtn(t.say, true)));
  return out;
}
function taskView() {
  const c = OV.cur, t = c.t, fb = OV.phase === 'fb';
  const body = [el('div', { class: 'row between' }, el('span', { class: 'chip accent' }, t.label || 'Задание'), t.final ? el('span', { class: 'chip red' }, 'Матч · без подсказок') : t.chip ? el('span', { class: 'chip' }, t.chip) : null)];
  body.push(...promptBlock(t));
  let act = null;

  if (t.ui === 'info') {
    body.push(t.node);
    act = el('div', { class: 'stack' }, btn(t.btn || 'Понятно, дальше', 'primary big block', () => { if (t.done) t.done({ ok: true }); nextAfterFeedback(); }));
  }
  if (t.ui === 'choice') {
    body.push(el('div', { class: 'opts' + (t.opts.length === 2 ? ' two' : '') }, c.order.filter(i => !(c.hidden || []).includes(i)).map(i => {
      let cls = 'opt';
      if (fb) { if (i === t.a) cls += ' right'; else if (i === c.picked) cls += ' wrong'; else cls += ' dim'; }
      return el('button', { type: 'button', class: cls, lang: t.optsEn !== false ? 'en' : null, disabled: fb ? true : null, onclick: () => pickOption(i) }, t.opts[i]);
    })));
  }
  if (t.ui === 'input' && !t.tpl && !t.chat) body.push(el('div', { class: 'stack' }, inputNode(0, t.gaps[0])));
  if (t.ui === 'tap') {
    body.push(el('div', { class: 'tapline', lang: 'en' }, t.words.map((w, i) => {
      let cls = 'tapw'; if (fb) { if (i === t.bad) cls += ' right'; else if (i === c.tapped) cls += ' wrong'; }
      return el('button', { type: 'button', class: cls, disabled: fb ? true : null, onclick: () => tapWord(i) }, w);
    })));
  }
  if (t.ui === 'tiles') {
    body.push(el('div', { class: 'tileline' + (fb ? (c.res.ok ? ' ok' : ' bad') : ''), lang: 'en' }, c.line.length ? c.line.map(id => el('button', { type: 'button', class: 'tile on', disabled: fb ? true : null, onclick: () => tileTap({ id }) }, t.tiles[id])) : el('span', { class: 'muted small' }, 'Нажимай слова по порядку')));
    if (!fb) body.push(el('div', { class: 'tiles', lang: 'en' }, c.tiles.map(tl => el('button', { type: 'button', class: 'tile' + (c.line.includes(tl.id) ? ' used' : ''), disabled: c.line.includes(tl.id) ? true : null, onclick: () => tileTap(tl) }, tl.w))));
  }
  if (t.ui === 'pairs') {
    const rdone = c.rdone || new Set();
    body.push(el('div', { class: 'pairs' },
      el('div', { class: 'stack' }, t.pairs.map((p, i) => el('button', { type: 'button', class: 'pairbtn' + (c.done.has(i) ? ' ok' : c.sel === i ? ' sel' : ''), lang: 'en', disabled: c.done.has(i) || fb ? true : null, onclick: () => pairTap('L', i) }, p[0]))),
      el('div', { class: 'stack' }, c.right.map((r, i) => el('button', { type: 'button', class: 'pairbtn' + (rdone.has(i) ? ' ok' : c.flash === i ? ' bad' : ''), lang: t.rightEn ? 'en' : null, disabled: rdone.has(i) || fb ? true : null, onclick: () => pairTap('R', i) }, r.w)))));
    if (c.miss) body.push(el('div', { class: 'muted small' }, 'Промахов: ' + c.miss));
  }
  if (t.ui === 'self') {
    const s = t.self;
    if (s.mode === 'write') body.push(el('textarea', { class: 'field', rows: 4, lang: 'en', placeholder: 'Пиши здесь по-английски', autocapitalize: 'sentences', oninput: e => { c.draft = e.target.value; } }, c.draft || ''));
    if (s.mode === 'speak' && micAvailable() && !fb) body.push(btn(c.listening ? 'Готово: проверить' : 'Сказать в микрофон', 'big block' + (c.listening ? ' primary' : ''), listen));
    if (c.reveal || fb) {
      if (s.model) body.push(el('div', { class: 'card stack' }, el('div', { class: 'eyebrow' }, 'Образец'), el('div', { class: 'en big', lang: 'en' }, s.model), s.modelRu ? el('div', { class: 'muted small' }, s.modelRu) : null, s.say ? el('div', { class: 'row' }, audioBtn(s.say)) : null));
      if (s.check) body.push(el('div', { class: 'card stack' }, el('div', { class: 'eyebrow' }, 'Проверь себя'), s.check.map(x => el('label', { class: 'checkrow' }, el('input', { type: 'checkbox' }), el('span', null, x)))));
    }
  }
  if (c.msg) body.push(el('div', { class: 'chip hint wrap' }, c.msg));

  // feedback
  if (fb) body.push(feedbackView());

  if (!act) {
    if (fb) act = el('div', { class: 'stack' }, btn('Дальше', 'primary big block', nextAfterFeedback));
    else if (t.ui === 'self') {
      act = c.reveal ? el('div', { class: 'grid2' }, btn('Получилось', 'primary', () => grade({ ok: true, given: c.draft || '' })), btn('Пока не очень', '', () => grade({ ok: false, given: c.draft || '' })))
        : el('div', { class: 'stack' }, btn(t.self.mode === 'write' ? 'Готово, показать образец' : 'Сказал, показать образец', 'primary big block', () => { c.reveal = true; renderOV(); }));
    } else {
      const main = t.ui === 'input' ? btn('Проверить', 'primary big', checkInput) : t.ui === 'tiles' ? btn('Проверить', 'primary big', checkTiles, { disabled: c.line.length ? null : true }) : null;
      act = el('div', { class: 'stack' }, main, el('div', { class: 'row between' },
        t.final ? el('span') : btn('Подсказка', 'ghost small', useHint),
        btn('Не знаю', 'ghost small', skipTask)));
    }
  }
  return el('div', { class: 'ov-wrap' }, topBar(), el('div', { class: 'ov-body stack' }, body), el('div', { class: 'ov-foot' }, act));
}
function feedbackView() {
  const c = OV.cur, t = c.t, r = c.res;
  const right = t.ui === 'choice' ? t.opts[t.a] : t.ui === 'input' ? (t.full || t.gaps.map(g => g[0]).join(' / ')) : t.ui === 'tiles' ? t.answer : t.ui === 'tap' ? `${t.words[t.bad]} → ${t.fix}` : t.full || '';
  return el('div', { class: 'feedback ' + (r.ok ? 'ok' : 'bad') + (c.hat ? ' hat' : '') },
    el('div', { class: 'fb-head' }, coachFace(r.ok ? (c.hat ? 'cheer' : 'thumbs') : 'think', 54),
      el('div', { class: 'grow' }, el('div', { class: 'fb-title' }, r.ok ? (r.typo ? 'Почти: опечатка' : c.hat ? 'ХЕТ-ТРИК!' : 'Верно!') : r.skipped ? 'Разбираем' : 'Мимо'), el('div', { class: 'small' }, c.coach)),
      r.ok && c.gain ? el('div', { class: 'xp-pop num' }, '+' + c.gain) : null),
    (!r.ok || r.typo || t.showRight) && right ? el('div', { class: 'fb-right' }, el('span', { class: 'muted small' }, 'Правильно: '), el('b', { lang: 'en' }, right)) : null,
    t.why ? el('div', { class: 'fb-why' }, rich(t.why)) : null,
    c.extra && c.extra.note ? el('div', { class: 'fb-note small' }, c.extra.note) : null,
    t.after ? el('div', { class: 'row' }, audioBtn(t.after, false, 'Послушать')) : null);
}

/* ---------- summary: the arena scoreboard ---------- */
function summaryView() {
  const s = OV.summary;
  const parts = [
    el('div', { class: 'board' },
      el('div', { class: 'board-title' }, OV.title || 'Смена'),
      el('div', { class: 'board-score num' }, el('div', null, el('b', null, String(s.ok)), el('span', null, 'верно')), el('i', null, ':'), el('div', null, el('b', null, String(s.bad)), el('span', null, 'ошибок'))),
      el('div', { class: 'board-row' }, el('span', null, '+' + s.xp + ' XP'), el('span', null, 'Лучшая серия: ' + s.best), el('span', null, Math.max(1, Math.round(s.secs / 60)) + ' мин'))),
    el('div', { class: 'coach-say' }, coachFace(s.pose, 92), el('div', { class: 'speech' }, s.coach)),
  ];
  if (s.extra && s.extra.node) parts.push(s.extra.node);
  if (s.dayFull) parts.push(el('div', { class: 'card hl stack' }, el('b', null, '🏆 Все три смены сегодня сыграны! +' + XP.day + ' XP'), el('div', { class: 'small' }, coachLine('dayDone'))));
  if (s.rank) parts.push(el('div', { class: 'card hl stack' }, el('b', null, '⬆️ Новое звание: ' + s.rank.name), el('div', { class: 'small' }, 'Ты растёшь как игрок!')));
  s.cards.forEach(p => parts.push(el('div', { class: 'card hl stack center' }, el('div', { class: 'eyebrow' }, 'Новая карточка в коллекции!'), playerCard(p, true))));
  if (s.mom) parts.push(el('div', { class: 'card mom stack' }, el('div', { class: 'eyebrow' }, '💌 Сообщение от мамы'), el('div', { class: 'big' }, s.mom.text)));
  const foot = el('div', { class: 'stack' }, s.extra && s.extra.again ? btn(s.extra.again.label, 'primary big block', s.extra.again.go) : null, btn(s.extra && s.extra.again ? 'На главную' : 'Готово', (s.extra && s.extra.again ? '' : 'primary ') + 'big block', closeOV));
  return el('div', { class: 'ov-wrap' }, el('div', { class: 'ov-body stack end' }, parts), el('div', { class: 'ov-foot' }, foot));
}

/* ---------- confetti ---------- */
const CONFETTI = ['var(--ice)', 'var(--red)', 'var(--gold)', '#ffffff', 'var(--blue)'];
function celebrate(big) {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const host = document.createElement('div'); host.className = 'confetti' + (big ? ' big' : ''); host.setAttribute('aria-hidden', 'true');
    const n = big ? 36 : 18;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = (big ? 120 : 70) + Math.random() * (big ? 160 : 90);
      p.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); p.style.setProperty('--dy', Math.round(Math.sin(a) * d - 60) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg'); p.style.background = CONFETTI[i % CONFETTI.length];
      p.style.animationDelay = Math.round(Math.random() * 90) + 'ms'; if (i % 3 === 0) p.style.borderRadius = '50%';
      host.append(p);
    }
    document.body.append(host); setTimeout(() => host.remove(), 1500);
  } catch (e) { /* decoration only */ }
}
