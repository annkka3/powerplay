# School track: Spotlight 8 answer keys (Power Play)

Goal: the boy does Spotlight 8 exercises in his PAPER textbook and types only his answers into the app. The app checks
each answer and explains in Russian why it is right or wrong. He is weaker than the book (≈ A1–A2), so explanations
must be simple.

COPYRIGHT RULE: do not copy the textbook's texts, sentences, dialogues or instructions into the output. Write the
instruction as your own short Russian paraphrase («Вставь глаголы в нужной форме»), store only answers (the words that
go into the gaps, option letters, T/F) and your own explanations. Your own explanations may quote the answer word
and the minimum needed context (2–4 words), never whole book sentences.

## Sources (PDF files, use the Read tool with `pages`, or `pdftotext -layout -f N -l M file -`)

- Student's Book: /Users/annagromyko/Downloads/08_Spotlight_8_-_SB_1.pdf — PDF page = book page + 1.
- Teacher's Book with answer keys: /Users/annagromyko/Downloads/Spotlight_8_TB.pdf
  (TB PDF pages: Module 1 = 12–28, Module 2 = 29–45, Module 3 = 46–62, Module 4 = 63–78, Module 5 = 79–94,
  Module 6 = 95–111, Module 7 = 112–128, Module 8 = 129–144, Grammar Check key = 145–150).
  The TB is printed in two columns, so `pdftotext -layout` interleaves columns; reading the page images with the Read
  tool is often clearer. "Answer Key" = exact answers; "Suggested Answer Key" = open answers (not checkable).
- The TB keys can contain mistakes or several answers; solve every item yourself as well, and if your answer differs
  from the key, think it through and keep the correct one(s); mention such cases in your report.

## Output: one JSON object per module

```json
{
  "module": 2, "title_en": "Food & Shopping", "title_ru": "Еда и покупки",
  "sections": [
    {
      "sec": "2c", "name": "Grammar in Use", "pages": "30-31",
      "topic_ru": "О чём урок, своими словами, 1 предложение.",
      "grammar_ids": ["g34", "g35", "g37"],
      "words": [{"en": "already", "ru": "уже"}],
      "explain_ru": "Только для разделов с грамматикой (Grammar in Use и где грамматика есть в содержании): 3–6 коротких абзацев простым русским языком для ученика уровня A1–A2 со СВОИМИ примерами (про хоккей, игры, школу). Разделяй абзацы пустой строкой; **жирный** можно.",
      "exercises": [
        {
          "no": "4", "page": 30, "kind": "gap",
          "instr_ru": "Вставь глаголы в Present Perfect или Present Perfect Continuous.",
          "check": true,
          "items": [ {"n": "1", "a": ["has been working"], "why_ru": "Действие длится до сих пор и важна длительность → have/has been + -ing."} ]
        },
        {
          "no": "2", "page": 30, "kind": "mc", "opts": ["a", "b", "c"],
          "instr_ru": "Выбери правильный вариант.", "check": true,
          "items": [ {"n": "1", "a": ["b"], "why_ru": "…"} ]
        },
        { "no": "6", "page": 31, "kind": "speak", "instr_ru": "Расскажи партнёру…", "check": false }
      ]
    }
  ]
}
```

Rules:
- Include EVERY numbered exercise of every section in your module (1a–1f, Culture Corner, Across the Curriculum /
  Going Green, Progress Check), in book order. Non-checkable ones (speaking, writing, open answers, project, reading
  for gist without key) get `"check": false` and just `instr_ru`.
- `kind`: gap (type a word/phrase), mc (choose a/b/c/d — give `opts` letters), match (match numbers to letters —
  give `opts` letters), tf (true/false/doesn't say — `opts` like ["T","F"] or ["T","F","DS"]), order (put in order,
  answer is the sequence like "c, a, b"), transform (rewrite a sentence — answer is the full new sentence; this is the
  only kind where the answer may be a full sentence, keep it), listen, read, speak, write, open.
- Sub-items: `n` as printed ("1", "2", "a", "B"). Multi-part exercises (3a, 3b) → separate exercise entries "3a", "3b".
- `a`: all correct answers (variants listed separately, e.g. "is going to leave" and "is leaving"). Case does not
  matter; contractions are treated equal by the app (doesn't = does not). For mc/match/tf store only the letter.
- `why_ru` for EVERY checkable item: one short Russian sentence that explains the answer simply (rule, meaning, or
  the clue in the text: «В тексте сказано, что…» paraphrased). For vocabulary items explain the meaning.
- `grammar_ids`: ids from /Users/annagromyko/Applications/powerplay/tools/source/grammar_syllabus.json whose topic
  this section practises (can be empty).
- `words`: 8–25 key words/phrases of the section (vocabulary box / bold words) with Russian translations — needed so the
  app can pre-teach them.
- Write the JSON (one object) to the file named in your task; it must load with `json.load`. Validate counts
  and that every checkable item has `a` and `why_ru`.

Report: file path, number of sections / exercises / checkable items, and every place where you disagreed with the TB
key or were unsure.
