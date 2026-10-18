# Картинки для Power Play: промпты

Порядок такой:
1. Сначала **листы персонажей** (раздел 1).
2. Потом **страницы комиксов** (разделы 2 и 3). К каждой странице прикладывайте нужные листы персонажей как образец.

Общие правила:
- Квадратная картинка, чем крупнее, тем лучше.
- **На картинках не должно быть никакого текста**: ни реплик, ни надписей, ни вывесок. Реплики я наложу в приложении, чтобы их можно было нажимать, слушать и переводить.
- Если герой на кадре вышел не похожим на свой лист (другой цвет шапки, другое лицо), перегенерируйте только эту страницу и напишите: `Keep the characters exactly as in the attached character sheet.`
- Присылайте картинки как есть, обрезку и сжатие я сделаю сама.

Этот общий блок стиля нужно вставлять **в начало каждого промпта**:

```
STYLE: modern European comic style, like a friendly animated movie for teenagers.
Clean bold outlines, bright flat colors with soft shading, expressive faces and poses,
simple readable backgrounds. Absolutely NO text, NO letters, NO numbers except on
jerseys, NO speech bubbles, NO signs with words anywhere in the image.
```

---

## 1. Листы персонажей

Каждый лист — одна картинка: персонаж несколько раз в разных позах на светло-сером фоне, с белой обводкой-стикером, позы отделены друг от друга.

### 1.1 Бенни, медвежонок

```
[STYLE]
Character sheet of BENNY: a small brown bear cub, kind, curious and clumsy.
Round ears, big friendly eyes, soft brown fur, a light-brown muzzle.
He always wears a blue knitted beanie with a white pompom and a red scarf.
He carries a small old brown suitcase with stickers (stickers without words).
Show 6 poses side by side on a plain light-grey background, each with a white
sticker outline and space between them: 1) standing and waving hello,
2) walking with the suitcase, 3) surprised with big eyes, 4) laughing,
5) sad with ears down, 6) holding a jar of honey and smiling.
Same character in every pose. Square image.
```

### 1.2 Рекс, тираннозавр-вратарь

```
[STYLE]
Character sheet of REX: a young green Tyrannosaurus rex, friendly goofy face,
enthusiastic and a bit dramatic. Very tiny arms, a long strong tail, big feet.
He is a hockey goalie: orange and black goalie jersey with the number 1,
white goalie leg pads, a goalie mask that he often wears pushed up on top
of his head so his face is visible.
Show 6 poses side by side on a plain light-grey background, each with a white
sticker outline and space between them: 1) proud pose with arms on hips (tiny arms!),
2) trying to catch a puck and missing because his arms are too short,
3) blocking a puck with his tail, 4) laughing, 5) sad and disappointed,
6) cheering with his tail up. Same character in every pose. Square image.
```

### 1.3 Семья Паркер (у них живёт Бенни)

```
[STYLE]
Character sheet of THE PARKER FAMILY, a friendly Canadian family, standing side by
side on a plain light-grey background, each with a white sticker outline:
1) MIA PARKER, a 14-year-old girl, hockey player, brown ponytail, green hoodie,
   jeans, hockey stick in hand, energetic smile;
2) MR PARKER, the dad, tall, short dark beard, glasses, checked shirt, loves cooking;
3) MRS PARKER, the mum, curly red hair, warm smile, cosy sweater.
Show each person twice: once neutral, once laughing. Square image.
```

### 1.4 Тренер Уолт, бобр (он будет хвалить сына в приложении)

```
[STYLE]
Character sheet of COACH WALT: a big friendly beaver who is a hockey coach.
Big white moustache and two small tusks, kind eyes, red baseball cap,
dark-blue tracksuit, a whistle on a cord around his neck, sometimes a clipboard.
Show 6 poses side by side on a plain light-grey background, each with a white
sticker outline and space between them: 1) proud with a big smile,
2) cheering with both flippers up, 3) thumbs-up (flipper up) encouraging,
4) thinking with a flipper on his chin, 5) surprised and impressed,
6) laughing. Same character in every pose. Square image.
```

### 1.5 «Кентервильское привидение»: призрак и семья Отис

```
[STYLE] The story is set in England in the 1880s, funny rather than scary.
Character sheet on a plain light-grey background, each figure with a white
sticker outline and space between them:
1) SIR SIMON, the ghost: a tall old English lord from the 1500s, pale green and
   slightly transparent, long grey beard, ruff collar, old-fashioned doublet,
   heavy rusty chains on his wrists and ankles, glowing red eyes; show him twice:
   trying to look scary, and sad and tired;
2) MR HIRAM OTIS, an American gentleman: tall, moustache, dark suit, calm smile;
3) MRS LUCRETIA OTIS: elegant lady in an 1880s dress;
4) WASHINGTON OTIS: a young man, fair hair, smart suit;
5) VIRGINIA OTIS: a brave, kind 15-year-old girl, long brown hair, blue dress;
6) THE TWINS: two identical mischievous little boys in sailor suits;
7) MRS UMNEY: an old housekeeper in a black dress and white cap.
Square image.
```

---

## 2. Комикс «Бенни и Рекс»

Каждая серия — **две картинки**, в каждой 4 кадра сеткой 2×2 с белыми полями между кадрами. К каждой картинке прикладывайте листы Бенни, Рекса, семьи Паркер, а в серии 3 ещё тренера Уолта.

Начало каждого промпта страницы:

```
[STYLE]
A comic page: a 2 by 2 grid of four square panels with white gutters between them.
Use the characters exactly as in the attached character sheets.
Leave some calm empty space in the upper part of every panel (for speech bubbles
that will be added later). Winter in a big Canadian city.
```

### Серия 1. «Новый дом»

Страница 1:
```
Panel 1: a busy airport arrival hall; Benny with his suitcase looks around, lost and amazed, people rushing past.
Panel 2: Mia and her parents wave at Benny, Mia holds up a big hand-drawn picture of a bear paw (no words); Benny smiles shyly.
Panel 3: night, inside the family car; Benny presses his nose to the window, looking at a huge outdoor ice rink with lights and falling snow.
Panel 4: Benny's small cosy bedroom; he unpacks his suitcase: a jar of honey, a framed photo of a snowy forest, a small hockey stick.
```
Страница 2:
```
Panel 1: next morning at an outdoor ice rink; Mia skates easily; Benny wobbles on skates for the first time, arms waving.
Panel 2: Benny slides fast and crashes into Rex, who is standing in front of a hockey goal; snow flies everywhere.
Panel 3: Benny and Rex sit on the ice in a heap; Rex pushes up his mask and laughs; Rex tries to offer a handshake but his tiny arm is too short to reach.
Panel 4: Benny happily shakes the tip of Rex's tail instead; both laugh; Mia laughs in the background.
```

### Серия 2. «Завтрак-катастрофа»

Страница 1:
```
Panel 1: early morning; Benny in pajamas tiptoes into the Parkers' kitchen, everyone else is asleep.
Panel 2: Benny reads a big cookbook upside down; there is already flour on the table, on the floor and on his nose.
Panel 3: Benny flips a pancake too high and it sticks to the kitchen ceiling lamp; Benny stares up in shock.
Panel 4: the jar of honey falls over; Benny's paws are stuck to the floor in a big honey puddle.
```
Страница 2:
```
Panel 1: Mr Parker opens the kitchen door in his bathrobe and freezes: the whole kitchen is covered in flour and honey.
Panel 2: Benny, all white with flour, looks up with big sorry eyes.
Panel 3: Mr Parker laughs, puts on an apron and starts cooking together with Benny; Mia comes in, laughing.
Panel 4: the whole family and Benny eat pancakes with honey at the table; one pancake still hangs on the lamp above them.
```

### Серия 3. «Короткие лапки»

Страница 1:
```
Panel 1: hockey team tryouts in an indoor arena; Coach Walt with a clipboard and whistle; a line of teenage players; Rex in goalie gear looks nervous.
Panel 2: pucks fly at Rex; his tiny arms cannot reach them; the pucks go into the net; two players giggle.
Panel 3: Rex sits sadly on the bench, head down; Benny sits next to him with two cups of hot chocolate.
Panel 4: Benny has a bright idea, a little light bulb shape above his head, and points at Rex's long tail.
```
Страница 2:
```
Panel 1: evening practice at the empty outdoor rink under lights; Benny shoots pucks, Rex blocks them with his tail.
Panel 2: the next day at tryouts; a player shoots very hard; Rex makes an amazing save with his tail, ice spraying everywhere.
Panel 3: Coach Walt drops his clipboard, mouth wide open in surprise.
Panel 4: team photo: Rex in the middle of the team, everyone cheering; Benny in the stands waving a banner with a drawn heart and a dinosaur (no words).
```

### Серия 4. «Не тот автобус»

Страница 1:
```
Panel 1: a snowy city street; Benny at a bus stop holds a paper map upside down, looking confused.
Panel 2: Benny on a city bus, happily looking out of the window at tall buildings.
Panel 3: the bus stops at the end of the line near a frozen lake and a forest; Benny is alone at the stop, confused.
Panel 4: Benny asks an old lady with a small dog for directions; she points across the lake.
```
Страница 2:
```
Panel 1: Benny walks across the frozen lake and sees kids playing pond hockey.
Panel 2: Benny joins the game, slips, and scores a goal by accident while falling; the kids cheer.
Panel 3: Mia and Rex arrive running, out of breath and relieved; they were looking for him.
Panel 4: Benny, Mia and Rex ride the bus back home at sunset; Benny is asleep on Rex's shoulder.
```

---

## 3. «Кентервильское привидение»

Та же схема: две картинки на серию, сетка 2×2. Прикладывайте лист персонажей 1.5.

Начало каждого промпта страницы:

```
[STYLE]
A comic page: a 2 by 2 grid of four square panels with white gutters between them.
Use the characters exactly as in the attached character sheet.
Leave some calm empty space in the upper part of every panel.
England, 1880s, an old castle-like country house called Canterville Chase.
Funny and a little spooky, not scary.
```

### Серия 1. «Новый дом с сюрпризом»

Страница 1:
```
Panel 1: the English countryside under dark clouds; a horse carriage arrives at a big old castle-like house; the Otis family inside the carriage.
Panel 2: in a study, old Lord Canterville (a thin old English lord) seriously warns Mr Otis, pointing at a portrait of Sir Simon; Mr Otis smiles confidently.
Panel 3: old Mrs Umney in a black dress opens the big front door and bows to the family.
Panel 4: in the library a dark red stain on the floor near the fireplace; Mrs Umney points at it, frightened; the family looks curious.
```
Страница 2:
```
Panel 1: Washington kneels and rubs the stain with a small black stick; the family watches.
Panel 2: the stain is gone; Washington proudly shows the clean floor; Mrs Umney faints into Mrs Otis's arms.
Panel 3: lightning and thunder outside the tall window; the whole family looks up.
Panel 4: the next morning the red stain is back on the floor; the family stares at it, puzzled; the twins grin.
```

### Серия 2. «Призрак и масло»

Страница 1:
```
Panel 1: night, a dark corridor in moonlight; Mr Otis in pajamas with a candle hears clanking noises.
Panel 2: the ghost Sir Simon appears with glowing red eyes and heavy rusty chains, trying very hard to look scary.
Panel 3: Mr Otis calmly offers the ghost a small bottle of oil for his chains, smiling politely.
Panel 4: the ghost, furious, throws the bottle on the floor; it breaks.
```
Страница 2:
```
Panel 1: the twins appear at the top of the stairs in nightshirts and throw big pillows at the ghost.
Panel 2: the ghost runs away through the wall in panic, his chains flying.
Panel 3: the ghost sits alone in a secret room, holding his head sadly, chains on the floor.
Panel 4: Virginia looks thoughtfully at the ghost's portrait in the hall, holding a candle.
```

---

Итого: 5 листов персонажей и 12 страниц комикса. Можно присылать частями, в любом порядке.
