'use strict';
/* The game layer: XP and hockey ranks, the daily streak (with one "freeze" a week), the three shifts of a day,
   achievements that unlock player cards, and Coach Walt's lines. Everything is computed from the saved progress,
   so nothing here can drift out of sync between devices. */

/* ---------- XP and ranks ---------- */
const LEVELS = [
  [0, 'Новичок'], [150, 'Юниор'], [400, 'Запасной'], [800, 'Четвёртое звено'], [1400, 'Третье звено'],
  [2200, 'Второе звено'], [3200, 'Первое звено'], [4500, 'Ассистент капитана'], [6000, 'Капитан'],
  [8000, 'Звезда лиги'], [10500, 'Олимпиец'], [14000, 'Легенда'],
];
const XP = { ok: 10, clean: 5, hat: 15, final: 100, topic: 50, day: 40, school: 5 };
const totalXP = () => Object.values(S.days).reduce((s, d) => s + (d.xp || 0), 0);
function levelOf(xp) {
  let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const from = LEVELS[i][0], to = i + 1 < LEVELS.length ? LEVELS[i + 1][0] : from;
  return { n: i + 1, name: LEVELS[i][1], from, to, next: i + 1 < LEVELS.length ? LEVELS[i + 1][1] : null, pct: to > from ? (xp - from) / (to - from) : 1 };
}
let levelBefore = null;
function addXP(n) {
  if (levelBefore == null) levelBefore = levelOf(totalXP()).n;
  const d = dayRec(); d.xp = (d.xp || 0) + n; d.t = Date.now(); Dirty.main = true;
}
// called at the end of a session: did the rank change?
function rankUp() {
  const now = levelOf(totalXP()); const up = levelBefore != null && now.n > levelBefore; levelBefore = null;
  return up ? now : null;
}
const weekXP = (ws) => { ws = ws || weekStart(); let s = 0; for (let i = 0; i < 7; i++) { const d = S.days[addDays(ws, i)]; if (d) s += d.xp || 0; } return s; };

/* ---------- streak ---------- */
// A day counts when at least one shift was finished. One missed day per week is forgiven (a "freeze").
const dayActive = d => !!(S.days[d] && S.days[d].sh && Object.keys(S.days[d].sh).length);
function streakInfo() {
  let n = 0, d = today(), freezeUsedAt = null;
  if (!dayActive(d)) d = addDays(d, -1);
  for (let guard = 0; guard < 400; guard++) {
    if (dayActive(d)) { n++; d = addDays(d, -1); continue; }
    // a single gap, with an active day before it, is covered if no freeze was used in the 7 days after it
    if (n > 0 && dayActive(addDays(d, -1)) && (freezeUsedAt === null || daysBetween(d, freezeUsedAt) >= 7)) { freezeUsedAt = d; d = addDays(d, -1); continue; }
    break;
  }
  return { n, froze: freezeUsedAt !== null };
}
const streak = () => streakInfo().n;
function longestStreak() {
  const ds = Object.keys(S.days).filter(dayActive).sort(); let best = 0, cur = 0, prev = null;
  ds.forEach(d => { cur = prev && daysBetween(prev, d) <= 2 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; });
  return best;
}

/* ---------- the three shifts of a day ---------- */
const SHIFTS = [
  { id: 'w', name: 'Разминка', sub: 'Слова и неправильные глаголы', min: 5, icon: 'skate' },
  { id: 'g', name: 'Тренировка', sub: 'Грамматика', min: 7, icon: 'stick' },
  { id: 'm', name: 'Матч', sub: 'Проверка, игра или школа', min: 5, icon: 'goal' },
];
const shiftDone = (id, d) => !!(S.days[d || today()] && S.days[d || today()].sh && S.days[d || today()].sh[id]);
function markShift(id) {
  const d = dayRec(); const was = Object.keys(d.sh).length;
  if (!d.sh[id]) { d.sh[id] = Date.now(); }
  const all = SHIFTS.every(s => d.sh[s.id]);
  if (all && was < 3 && !d.full) { d.full = 1; addXP(XP.day); }
  d.t = Date.now(); Dirty.main = true;
  return all;
}
const shiftsToday = () => SHIFTS.filter(s => shiftDone(s.id)).length;

/* ---------- weekly goal set by the parent ---------- */
function goalProgress() {
  const g = S.goal; if (!g || !g.target) return null;
  const ws = weekStart(); let done = 0;
  for (let i = 0; i < 7; i++) { const d = S.days[addDays(ws, i)]; if (d && d.sh) done += Object.keys(d.sh).length; }
  return { done, target: g.target, reward: g.reward || '', pct: Math.min(1, done / g.target) };
}

/* ---------- player cards and the achievements that unlock them ---------- */
// Facts are kept to stable ones (position, country, big titles); teams change, so they are not named.
const PLAYERS = [
  { id: 'ovechkin', name: 'Alexander Ovechkin', ru: 'Александр Овечкин', num: 8, pos: 'Нападающий', c1: '#C8102E', c2: '#041E42', rare: 'legend',
    en: ['He is from Moscow, Russia.', 'He is a left wing.', 'He has scored more NHL goals than any other player.'],
    ach: 'first', how: 'Закончи первую смену' },
  { id: 'kucherov', name: 'Nikita Kucherov', ru: 'Никита Кучеров', num: 86, pos: 'Нападающий', c1: '#002868', c2: '#FFFFFF', rare: 'star',
    en: ['He is from Maykop, Russia.', 'He is a right wing.', 'He won the Hart Trophy as the best player of the season.'],
    ach: 'words50', how: '50 выученных слов' },
  { id: 'malkin', name: 'Evgeni Malkin', ru: 'Евгений Малкин', num: 71, pos: 'Центральный нападающий', c1: '#111111', c2: '#FCB514', rare: 'star',
    en: ['He is from Magnitogorsk, Russia.', 'He is a center.', 'He has won the Stanley Cup three times.'],
    ach: 'topic1', how: 'Сдай первый матч по грамматике' },
  { id: 'kaprizov', name: 'Kirill Kaprizov', ru: 'Кирилл Капризов', num: 97, pos: 'Нападающий', c1: '#154734', c2: '#A6192E', rare: 'star',
    en: ['He is from Novokuznetsk, Russia.', 'He is a left wing.', 'He won the Calder Trophy as the best rookie.'],
    ach: 'streak3', how: '3 дня подряд' },
  { id: 'panarin', name: 'Artemi Panarin', ru: 'Артемий Панарин', num: 10, pos: 'Нападающий', c1: '#0038A8', c2: '#CE1126', rare: 'star',
    en: ['He is from Korkino, Russia.', 'He is a left wing.', 'He makes amazing passes.'],
    ach: 'verbs10', how: '10 неправильных глаголов выучено' },
  { id: 'vasilevskiy', name: 'Andrei Vasilevskiy', ru: 'Андрей Василевский', num: 88, pos: 'Вратарь', c1: '#002868', c2: '#FFFFFF', rare: 'legend',
    en: ['He is from Tyumen, Russia.', 'He is a goalie.', 'He won the Stanley Cup two times.'],
    ach: 'shutout', how: 'Матч по грамматике без единой ошибки' },
  { id: 'shesterkin', name: 'Igor Shesterkin', ru: 'Игорь Шестёркин', num: 31, pos: 'Вратарь', c1: '#0038A8', c2: '#CE1126', rare: 'star',
    en: ['He is from Moscow, Russia.', 'He is a goalie.', 'He won the Vezina Trophy as the best goalie.'],
    ach: 'streak7', how: '7 дней подряд' },
  { id: 'bobrovsky', name: 'Sergei Bobrovsky', ru: 'Сергей Бобровский', num: 72, pos: 'Вратарь', c1: '#C8102E', c2: '#041E42', rare: 'star',
    en: ['He is from Novokuznetsk, Russia.', 'He is a goalie.', 'He has won the Vezina Trophy twice.'],
    ach: 'topic5', how: '5 тем грамматики сдано' },
  { id: 'michkov', name: 'Matvei Michkov', ru: 'Матвей Мичков', num: 39, pos: 'Нападающий', c1: '#F74902', c2: '#000000', rare: 'rising',
    en: ['He is from Perm, Russia.', 'He is a young forward.', 'He started in the NHL as a teenager.'],
    ach: 'school1', how: 'Упражнение из учебника без ошибок' },
  { id: 'demidov', name: 'Ivan Demidov', ru: 'Иван Демидов', num: 93, pos: 'Нападающий', c1: '#AF1E2D', c2: '#192168', rare: 'rising',
    en: ['He is from Sergiyev Posad, Russia.', 'He is a young forward.', 'He is famous for his fast hands.'],
    ach: 'words150', how: '150 выученных слов' },
  { id: 'mcdavid', name: 'Connor McDavid', ru: 'Коннор Макдэвид', num: 97, pos: 'Центральный нападающий', c1: '#FF4C00', c2: '#041E42', rare: 'legend',
    en: ['He is from Canada.', 'He is a center.', 'Many people call him the fastest skater in the world.'],
    ach: 'verbs30', how: '30 неправильных глаголов выучено' },
  { id: 'mackinnon', name: 'Nathan MacKinnon', ru: 'Натан Маккиннон', num: 29, pos: 'Центральный нападающий', c1: '#6F263D', c2: '#236192', rare: 'star',
    en: ['He is from Canada.', 'He is a center.', 'He won the Stanley Cup.'],
    ach: 'level4', how: 'Звание «Четвёртое звено»' },
  { id: 'matthews', name: 'Auston Matthews', ru: 'Остон Мэттьюс', num: 34, pos: 'Центральный нападающий', c1: '#00205B', c2: '#FFFFFF', rare: 'star',
    en: ['He is from the USA.', 'He is a center.', 'He is one of the best goal scorers in the NHL.'],
    ach: 'topic15', how: '15 тем грамматики сдано' },
  { id: 'crosby', name: 'Sidney Crosby', ru: 'Сидни Кросби', num: 87, pos: 'Центральный нападающий', c1: '#111111', c2: '#FCB514', rare: 'legend',
    en: ['He is from Canada.', 'He is a center and a team captain.', 'He has won the Stanley Cup three times.'],
    ach: 'streak30', how: '30 дней подряд' },
  { id: 'draisaitl', name: 'Leon Draisaitl', ru: 'Леон Драйзайтль', num: 29, pos: 'Центральный нападающий', c1: '#FF4C00', c2: '#041E42', rare: 'star',
    en: ['He is from Germany.', 'He is a center.', 'He won the Hart Trophy as the best player of the season.'],
    ach: 'words300', how: '300 выученных слов' },
];
const PLAYER = Object.fromEntries(PLAYERS.map(p => [p.id, p]));

function stats() {
  const words = Object.keys(S.cards).filter(id => id[0] === 'w' && S.cards[id].b >= 2).length;
  const verbs = Object.keys(S.cards).filter(id => id.startsWith('v:') && S.cards[id].b >= 3).length;
  const topics = Object.values(S.gr).filter(r => r.done).length;
  const shutout = Object.values(S.gr).some(r => (r.fin || []).some(f => f.s === f.n && f.n >= 10));
  const school = Object.values(S.sc).some(r => r.best && r.best === r.n && r.n > 0);
  const sessions = Object.values(S.days).some(d => d.sh && Object.keys(d.sh).length);
  return { words, verbs, topics, shutout, school, sessions, streak: Math.max(streak(), longestStreak()), level: levelOf(totalXP()).n };
}
const ACH_TEST = {
  first: s => s.sessions, words50: s => s.words >= 50, topic1: s => s.topics >= 1, streak3: s => s.streak >= 3,
  verbs10: s => s.verbs >= 10, shutout: s => s.shutout, streak7: s => s.streak >= 7, topic5: s => s.topics >= 5,
  school1: s => s.school, words150: s => s.words >= 150, verbs30: s => s.verbs >= 30, level4: s => s.level >= 4,
  topic15: s => s.topics >= 15, streak30: s => s.streak >= 30, words300: s => s.words >= 300,
};
// returns newly unlocked players
function checkAchievements() {
  const s = stats(), fresh = [];
  PLAYERS.forEach(p => { if (!S.ach[p.ach] && ACH_TEST[p.ach] && ACH_TEST[p.ach](s)) { S.ach[p.ach] = { t: Date.now(), p: p.id }; fresh.push(p); } });
  if (fresh.length) Dirty.main = true;
  return fresh;
}
const hasPlayer = p => !!S.ach[p.ach];

/* ---------- Coach Walt ---------- */
// The coach praises something concrete and stays kind after a mistake. {tag} = the skill, {n} = a number.
const COACH = {
  ok: ['Точно в цель!', 'Чисто сыграно!', 'Есть! Правильно.', 'Отличный бросок!', 'Верно, так держать!', 'Шайба в воротах!', 'Красиво!', 'Nice shot!', 'Good job!', 'Yes! Правильно.'],
  okTag: ['Верно, и правило «{tag}» ты уже чувствуешь.', '«{tag}» — снова в точку!', 'Правильно: «{tag}» у тебя получается.'],
  hat: ['Хет-трик! Три подряд!', 'Hat trick! Три верных подряд, тренер доволен.', 'Три из трёх! Это уже хет-трик.'],
  five: ['Пять подряд! Ты в ударе.', 'Five in a row! Защита соперника в панике.'],
  ten: ['Десять подряд! Это уровень первого звена.', 'Ten in a row! Такое играют только звёзды.'],
  wrong: ['Мимо, но ничего: смотри, как правильно.', 'Не страшно, это тренировка. Запомни правило ниже.', 'Промах. Читай подсказку и следующую забьёшь.', 'Бывает. Главное — понять почему.', 'Даже Овечкин мажет. Смотри правильный ответ.'],
  fixed: ['Отыгрался! Теперь верно.', 'Вот! Ошибку исправил, это и есть прогресс.'],
  sessionTop: ['Отличная смена! Почти всё чисто.', 'Это было мощно. Тренер ставит тебя в первое звено!', 'Смена сыграна блестяще!'],
  sessionOk: ['Хорошая смена! Ошибки разобрали, завтра будет легче.', 'Неплохо! Каждая смена делает тебя сильнее.'],
  sessionLow: ['Трудная смена, но ты её доиграл. Это главное.', 'Сегодня было тяжело — значит, ты тренируешь то, что нужно.'],
  finalPass: ['Матч выигран! Тема твоя.', 'Победа! Эта тема сдана.', 'Вот это игра! Тема закрыта.'],
  finalFail: ['Матч проигран, но это не конец сезона. Потренируем ошибки и сыграем снова завтра.', 'В этот раз не хватило чуть-чуть. Разберём ошибки — и реванш!'],
  dayDone: ['Все три смены сыграны! Ты сегодня молодец.', 'Полный день! Так и становятся чемпионами.'],
  hello: ['Привет! На лёд?', 'Готов к тренировке?', 'Let’s go! Сегодня три смены.', 'Тренер на месте. Начинаем?'],
};
function coachLine(kind, vars) {
  const list = COACH[kind] || COACH.ok;
  let s = list[Math.floor(Math.random() * list.length)];
  Object.keys(vars || {}).forEach(k => { s = s.replace('{' + k + '}', vars[k]); });
  return s;
}
const COACH_POSE = { proud: 1, cheer: 2, thumbs: 3, think: 4, wow: 5, laugh: 6 };
