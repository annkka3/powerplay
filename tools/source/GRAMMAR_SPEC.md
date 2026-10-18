# Grammar topic format (Power Play)

The learner: a 14-year-old Russian-speaking boy, near A1 English (reads simple text, can say "I like…").
He plays ice hockey, makes and listens to music (electronic folk, phonk), watches YouTube, plays Roblox and
Brawl Stars, likes comics and dinosaurs. He may move to an English-speaking country. School textbook: Spotlight 8.
Comic characters you may use in sentences: Benny (a clumsy, kind bear cub who moved to Canada and lives with the
Parker family), Rex (a young T-rex hockey goalie with tiny arms), Mia Parker (14, hockey player), Mr and Mrs Parker,
Coach Walt (a beaver hockey coach). Do NOT invent facts about real people.

English: American spelling and usage by default (color, favorite, soccer, apartment, "have" rather than
"have got" in normal sentences). Where Spotlight uses a British form, it may be accepted as an alternative answer.
Explanations: Russian, short, friendly, like a good coach talking to a teenager (ты). No long theory.

## One topic = one JSON object

```json
{
  "id": "g09",
  "stage": "A1",
  "title_ru": "...",            // from the syllabus
  "goal_ru": "...",             // from the syllabus
  "prereq": ["g01"],            // from the syllabus
  "spotlight": ["1c"],          // from the syllabus
  "cards": [                    // 3 or 4 rule cards, shown before practice
    { "title_ru": "Главное правило", "body_ru": "…short text, **bold** allowed…",
      "ex": [["He plays hockey.", "Он играет в хоккей."], ["…", "…"]] }
  ],
  "traps": [                    // 3–5 typical mistakes of Russian speakers
    { "wrong": "He play hockey.", "right": "He plays hockey.", "why_ru": "После he/she/it добавляем -s." }
  ],
  "tags": {                     // 3–6 skill tags of this topic; every item has one of them
    "s-ending": { "ru": "-s после he/she/it", "tip_ru": "one or two sentences of explanation shown when he keeps missing this", "back": "g01" }
  },
  "items": [ … ]                // the exercise bank, see below
}
```

`back` (optional) = id of an earlier topic to review when this tag keeps failing (e.g. errors with am/is/are inside
Present Continuous → back to g01).

## Items (exercise bank)

Every item: `{"id": "g09-001", "t": "<type>", "lv": 1|2|3, "tag": "<tag>", …payload…, "why": "<Russian explanation>"}`

- `lv` 1 = recognize (choose), 2 = build (type a word, order words, transform), 3 = apply (texts, translation, harder mixes).
- `why`: ONE short Russian sentence that explains the correct answer (shown after every answer, right or wrong).
  It must explain the rule in this concrete case, e.g. «Подлежащее she → глагол с -s: plays.»
- Gaps are written `___` (three underscores). A hint for the gap goes in parentheses right after it: `___ (play)`.

Types and payloads:

| t | what the learner does | payload |
|---|---|---|
| `mc` | picks one option for the gap / question | `"q": "He ___ hockey.", "o": ["plays","play","playing","played"], "a": 0` (a = index of the right option). 2–4 options. |
| `gap` | types the missing word(s) | `"q": "___ she like phonk? (do / does)", "a": ["Does"]` (all accepted answers) |
| `err` | taps the wrong word in a sentence | `"s": "My brother play Brawl Stars every day.", "bad": 2, "fix": "plays"` (bad = 0-based index of the wrong word when the sentence is split by spaces; exactly ONE wrong word) |
| `build` | puts word tiles in order | `"a": "Does your sister play hockey?", "ru": "Твоя сестра играет в хоккей?", "extra": ["do"]` (extra = 0–2 distractor tiles, optional) |
| `tr` | rewrites a sentence | `"src": "She plays the guitar.", "task_ru": "Сделай вопрос.", "a": ["Does she play the guitar?"]` |
| `match` | matches pairs | `"pairs": [["he","plays"],["they","play"],["it","goes"],["I","go"]]` (4 pairs, all left items and all right items distinct) |
| `listen` | hears a sentence, picks what he heard | `"say": "She plays hockey.", "o": ["She plays hockey.","She play hockey."], "a": 0` |
| `text` | a short text with 4–6 gaps | `"title": "Rex's day", "t": "Rex ___ (get) up at 7. He ___ (eat) ten pancakes…", "a": [["gets"],["eats"],…]` (one list of accepted answers per gap, in order) |
| `chat` | a messenger dialogue with gaps | `"lines": [{"who":"Mia","t":"Do you like hockey?"},{"who":"you","t":"Yes, I ___ !"}], "a": [["do"]]` (gaps only in lines, answers in order) |
| `ru2en` | translates a short phrase | `"ru": "Он не играет в Roblox.", "a": ["He doesn't play Roblox.","He does not play Roblox."]` |
| `speak` | says a sentence aloud (self-check or speech recognition) | `"say": "My friend plays Brawl Stars every day.", "ru": "Мой друг играет в Brawl Stars каждый день."` |
| `write` | writes 2–3 own sentences, self-checks with a list | `"task_ru": "Напиши 3 предложения о том, что делает твой друг по выходным.", "check_ru": ["После he/she есть -s?", "…"], "model": "My friend Max plays…"` |

## Grading (the app does this; do not duplicate)

The app ignores letter case, extra spaces and the final . ! ?; treats ' and ’ the same; treats contractions and full
forms as equal (doesn't = does not, I'm = I am, can't = cannot, won't = will not, isn't = is not, aren't = are not,
didn't = did not, haven't = have not, hasn't = has not, don't = do not, wasn't, weren't, shouldn't, mustn't, wouldn't, couldn't).
So list only answers that differ in real words or word order. Commas inside a sentence are ignored too.

## Bank size and mix per topic (minimum)

- At least 36 items: lv1 ≥ 10, lv2 ≥ 14, lv3 ≥ 10.
- Types: mc ≥ 8 (of them ≥ 6 with exactly 2 options — used in the 60-second sprint), gap ≥ 6, err ≥ 4, build ≥ 4,
  tr ≥ 3, match ≥ 1, listen ≥ 2 (only where the difference is audible: plays/play, is/isn't, walked/walk…),
  text ≥ 2, chat ≥ 1, ru2en ≥ 3, speak ≥ 1, write 1.
- Every tag gets at least 5 items, spread over levels.
- Each item must have ONE clearly correct answer for exactly what is asked. If two answers are natural, list both.
- Sentences short (≤ 12 words at A1, ≤ 16 at B1), vocabulary simple (A1–A2), about his world. Vary subjects and
  verbs; no repeated sentences inside a topic. Keep it fun, sometimes funny (Rex and his tiny arms, Benny's disasters).
- Use only grammar from this topic and earlier topics (see prereq order).

## Output

Write a JSON array of your topic objects to the file named in your task. Validate with a small script before finishing:
JSON loads; required keys; counts per type/level/tag as above; `mc.a` in range; `err.bad` index points to a word that
differs from `fix`; `text`/`chat` gap counts equal answer list lengths; every item tag exists in `tags`; ids unique.
