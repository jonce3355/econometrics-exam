# Econometrics Exam Trainer

An interactive tutor and exam simulator built from the teacher's *Mid-term bank of questions* (211 questions) and *Formula sheet*. It runs entirely in your browser. There's no backend, no account and no AI API. Progress is saved in your browser.

## Run it

You need Node.js 18 or later.

```bash
npm install
npm run dev        # open the printed URL (usually http://localhost:5173)
```

To build a static version you can open without a dev server:

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ at http://localhost:4173
```

`dist/` is fully static, so you can host it anywhere (for example GitHub Pages or Netlify). The build uses relative paths.

Other commands:

```bash
npm test           # 81 checks: inventory, recomputed answer key, Stata cross-checks, 300 runs of every generator
npm run typecheck
```

## What's inside

| Section | What it does |
|---|---|
| **Dashboard** | Question counts, practised/correct/accuracy, topic mastery, today's plan items, and quick links to Continue Learning, Practice and Mock exam. |
| **Learn** | One question at a time in 7 steps: 1 understand, 2 concept, 3 formula, *(you answer)*, 4 worked solution, 5 answer + why the other options are wrong, 6 exam shortcut + what the teacher can change, 7 a new variation to solve. Steps 4–7 stay locked until you submit an answer or click "show me how". |
| **Practice** | Filter by topic and by all / unanswered / incorrect / bookmarked questions. Question order and option order are randomised, and the answer key follows the shuffle. You get immediate feedback with a full explanation, can retry a question later in the session or retry all incorrect ones, and can mark questions "Review later". |
| **Different numbers** | 54 numerical generators recreate each question type with new valid inputs. Each one recalculates the answer and builds the wrong options from typical errors (SE÷coef, forgetting ×100, wrong df, sign slips…). The 18 concept-only skills use equivalent concept drills instead. |
| **Mock exam** | Standard: exactly 20 questions, 2–3 per topic (the teacher's stated format). Full bank: all 211 questions in random order (untimed or at exam pace). You choose the time limit and the mix of original vs new-number questions. You can navigate freely, flag questions, change answers, and must confirm before submitting. The exam survives a page refresh. Results show the score, %, time, topic breakdown, a review of every question and what to study next. |
| **Mistakes** | Every wrong answer is tracked automatically, with repeated mistakes ranked first. You can retry without seeing the answer, read the explanation, or practise new-number versions. Skills you missed 3+ times in your last 5 attempts trigger a "revisit the lesson" warning. |
| **Formula sheet** | All formulas from the teacher's sheet, searchable and grouped by topic. Each has symbols, what it calculates, when to use it, a worked example, common mistakes and the related question IDs. Math is rendered with KaTeX. |
| **3-day plan** | Day 1 learn, Day 2 practise, Day 3 mocks. Set your exam date to highlight today. Some tasks tick themselves from your activity. Weak topics are inserted automatically, and Day 2 includes a suggested time split weighted towards weak topics. |
| **Answer key** | The explicit answer-review mode. It's the full inventory with the answer key, review notes, duplicates and pending items. It's the only place answers are shown without attempting first. |
| **Settings** | Light/dark/system theme, export/import of progress (.json), and reset. |

## Project layout

```
src/data/questions/*.ts   the question bank (one file per section), stable IDs like W3-Q22
src/data/skills.ts        topics + skills (concept, formula, shortcut) shared by questions
src/data/formulas.ts      formula sheet content
src/data/generators/      variation generators (numeric + conceptual drills)
src/data/stataOutputs.json  Stata output re-created from the data files
src/data/validate.test.ts automated checks of the bank, answer key and generators
scripts/stata_outputs.py  regenerates stataOutputs.json from data/*.DTA
data/                     the supplied .DTA files
```

The data is kept separate from the UI. To correct a question, edit its entry in `src/data/questions/` and run `npm test`.

## Deploying on Vercel

`vercel.json` pins the settings (framework Vite, build `npm run build`, output `dist`). Import the GitHub repo in Vercel and deploy the branch that contains this code. Every push redeploys automatically.

## Regenerating Stata output

All five data files (WAGE1, BWGHT, KIELMC, AEJfigs, FoS) are in `data/`. If a file changes:

```bash
pip install pandas statsmodels scipy wooldridge
python scripts/stata_outputs.py      # rewrites src/data/stataOutputs.json
npm test                             # re-checks every Stata answer against the new output
```

See [`docs/QUESTION_BANK_REPORT.md`](docs/QUESTION_BANK_REPORT.md) for the full inventory, how answers were verified, flagged questions and known limitations.
