# Vocabulary format (Power Play)

Learner: a 14-year-old Russian-speaking boy, near A1 English. Hockey player, music (electronic folk, phonk),
YouTube, Roblox, Brawl Stars, comics, dinosaurs; may move to an English-speaking country.
Goal: about 1000 core words A1 → A2 (some B1), ordered from most useful to less useful inside each topic.
American English (color, favorite, apartment, soccer, cell phone/phone, store, vacation, fall).

## Topics (50 words each)

| id | topic (ru) | focus |
|---|---|---|
| 01 | Привет и основа | greetings, yes/no, please/thanks, pronouns, question words, basic small words (and, but, or, because, very) |
| 02 | Главные глаголы | the 50 most useful verbs (base form): be, have, do, go, get, make, say, know, think, take, see, come, want, look, use, find, give, tell, work, call, try, ask, need, feel, become, leave, put, mean, keep, let, begin, help, talk, turn, start, show, hear, play, run, move, like, live, believe, bring, happen, write, sit, stand, lose, pay, meet… |
| 03 | Мой день | daily routine verbs and phrases: wake up, get up, brush teeth, take a shower, have breakfast, go to school, come home, do homework, go to bed… |
| 04 | Игры и интернет | gaming and internet words he sees in Roblox / Brawl Stars / YouTube: level, upgrade, reward, team, player, win, lose, attack, defend, skin, trade, update, download, subscribe, channel, video, comment, like, share, password, account, chat, online, offline, server, lag, map, mode, boss, health, power… |
| 05 | Хоккей и спорт | hockey and sports: puck, stick, goal, goalie, skate (n/v), rink, ice, helmet, gloves, pads, jersey, team, coach, game, match, score, shoot, pass, save, win, lose, tie, period, penalty, referee, fan, practice, training, tournament, champion, fast, strong, tired… |
| 06 | Музыка и хобби | music and hobbies: music, song, beat, bass, drums, guitar, piano, headphones, speaker, playlist, artist, track, album, concert, listen, record, mix, loud, quiet, draw, read, comic, movie, hobby, collect, build… |
| 07 | Школа и учёба | school: lesson, class, subject, math, history, science, homework, test, grade, teacher, classmate, notebook, pen, pencil, ruler, schoolbag, desk, board, break, learn, study, remember, forget, understand, explain, mistake, right, wrong, easy, difficult… |
| 08 | Семья и друзья | people and relationships: family, mom, dad, parents, brother, sister, grandma, grandpa, son, daughter, aunt, uncle, cousin, friend, best friend, boy, girl, kid, teenager, man, woman, people, neighbor, name, age, birthday, together, alone, help, trust… |
| 09 | Дом и вещи | home and things: home, house, apartment, room, bedroom, kitchen, bathroom, door, window, bed, table, chair, sofa, lamp, TV, phone, charger, computer, key, bag, box, clock, shelf, floor, wall, light, clean, messy… |
| 10 | Еда и напитки | food and drinks: food, breakfast, lunch, dinner, snack, water, juice, milk, tea, coffee, bread, cheese, egg, meat, chicken, fish, rice, pasta, pizza, burger, fries, salad, soup, apple, banana, orange, potato, tomato, sugar, salt, sweet, spicy, hungry, thirsty, delicious, order, menu… |
| 11 | Город и дорога | city and directions: city, street, road, corner, building, park, store, mall, cafe, restaurant, bank, hospital, pharmacy, police station, library, museum, stadium, arena, bus stop, station, left, right, straight, near, far, map, across, next to, opposite… |
| 12 | Путешествия и транспорт | travel and transport: travel, trip, vacation, airport, plane, flight, ticket, passport, luggage, suitcase, bus, train, subway, car, taxi, bike, hotel, room, reservation, arrive, leave, miss, late, early, abroad, country, border, visa, tourist… |
| 13 | Покупки, одежда, деньги | shopping, clothes, money: money, cash, card, price, cost, cheap, expensive, sale, buy, sell, pay, change, receipt, size, try on, clothes, T-shirt, hoodie, jacket, jeans, pants, shorts, shoes, sneakers, cap, socks, sweater, wear… |
| 14 | Тело и здоровье | body, health, feelings of the body: head, face, eye, ear, nose, mouth, tooth, neck, shoulder, arm, hand, finger, leg, knee, foot, back, stomach, heart, sick, hurt, pain, cold, fever, doctor, medicine, injury, broken, healthy, sleep, rest… |
| 15 | Природа, погода, животные | nature, weather, animals (dinosaurs welcome): weather, sun, rain, snow, wind, cloud, storm, hot, cold, warm, sky, tree, forest, river, lake, sea, mountain, animal, dog, cat, bear, wolf, bird, dinosaur, fossil, extinct, huge, wild… |
| 16 | Время и числа | time, days, months, numbers words: time, hour, minute, second, day, week, month, year, today, tomorrow, yesterday, morning, afternoon, evening, night, Monday…Sunday, January…December (pick the most useful to fill 50, include early/late/now/soon/ago), first, second, third, half, quarter… |
| 17 | Какой? Описания | describing things: big, small, long, short, tall, new, old, young, good, bad, best, worst, fast, slow, hard, soft, heavy, light, full, empty, open, closed, hot, cold, clean, dirty, beautiful, ugly, cool, awesome, funny, boring, important, different, same, real… |
| 18 | Чувства и характер | feelings and character: happy, sad, angry, scared, nervous, excited, bored, tired, proud, sorry, surprised, worried, calm, kind, brave, shy, lazy, smart, honest, friendly, rude, cheerful, confident, patient, funny, serious, love, hate, hope, worry… |
| 19 | Где и когда: связки | prepositions, adverbs, linkers: in, on, at, under, over, behind, between, before, after, during, until, since, always, usually, often, sometimes, never, already, yet, still, again, also, too, only, maybe, then, first, finally, so, because, if, when, while, although… |
| 20 | Новая страна и жизнь | moving abroad and everyday life: move, rent, landlord, lease, bill, bank account, address, form, fill in, ID, document, appointment, insurance, emergency, neighborhood, school registration, job, salary, interview, language, accent, culture, homesick, friendly, rules, permission, welcome… |

## One word = one JSON object

```json
{"id": "w05-01", "topic": "05", "en": "puck", "ru": "шайба", "ipa": "pʌk", "pos": "n", "lv": "A2",
 "ex": "Rex can't catch the puck.", "exru": "Рекс не может поймать шайбу.", "e": "🏒"}
```

- `id`: `w<topic>-<nn>` in order of usefulness inside the topic (01 = most useful).
- `en`: the word or a short fixed phrase as he would learn it: verbs in base form without "to"; nouns without article;
  phrasal verbs as they are ("wake up"). One meaning per card.
- `ru`: natural Russian translation for this meaning (short; add a hint in brackets if needed: «ничья (в игре)»).
- `ipa`: General American IPA without slashes, with ˈ stress for words of 2+ syllables (e.g. "ˈhɑki", "ɪkˈsaɪtɪd").
- `pos`: n, v, adj, adv, prep, pron, conj, num, phr, int.
- `lv`: A1, A2 or B1.
- `ex`: one short natural example (≤ 9 words) from HIS world (hockey, games, music, school, friends, food, travel,
  dinosaurs, Benny the bear, Rex the T-rex goalie, Mia), simple grammar (A1–A2). The word itself must appear in `ex`
  (any form: puck → "pucks" is fine).
- `exru`: Russian translation of the example.
- `e`: one fitting emoji, or "" if none fits.
- No duplicates of `en` inside your part. Irregular past forms (went, saw…) are NOT separate cards.

## Output

Write a JSON array of word objects (all your topics, in topic order) to the file named in your task.
Check with a small script: 50 words per topic, ids, required keys, no duplicate `en`, the word (or a form of it)
appears in `ex`, IPA has ˈ for multi-syllable words.
