# Question bank report

## Source files

| File | Format | Used for |
|---|---|---|
| `_midterm_bank_of_question.pdf` | 21-page PDF, two-column LaTeX | All 211 questions (transcribed page by page from the rendered pages so matrices, tables and code boxes are exact) |
| `formula_sheet.pdf` | 3-page PDF | Formula sheet section; formulas linked to every skill |
| `BWGHT.DTA`, `KIELMC.DTA`, `AEJfigs.DTA` | Stata data files | Re-running Stata questions S11, S12, S20–S27 |
| `WAGE1.DTA` | Stata data | Stata questions S1–S10, S13–S19 (526 obs; identical to the standard Wooldridge WAGE1) |
| `FoS.DTA` | Stata data | Stata questions S28–S32 |

## Inventory (211 questions; no answer key in the PDF)

| Section (PDF heading) | ID prefix | Questions |
|---|---|---|
| Intro Matrix Algebra | `MAT-Q01…Q20` | 20 |
| Week 1: Expected Value and Conditional Expectations | `W1-Q01…Q26` | 26 |
| Week 2: OLS in Matrix Form | `W2-Q01…Q24` | 24 |
| Week 3: Standard Errors of OLS Coefficients | `W3-Q01…Q39` | 39 |
| Week 4: Controls and Model Fit | `W4-Q01…Q32` | 32 |
| Week 5: Dummy Variables, Interactions, Scaling, and Functional Forms | `W5-Q01…Q38` | 38 |
| Stata-Based Questions | `STATA-Q01…Q32` | 32 |
| **Total** | | **211** |

No question was dropped. Repeated questions are kept and marked `duplicateOf`. The mock exam never puts two copies in the same attempt.

## How answers were determined

The PDF contains no answer key. Every answer was derived from the definitions and formulas on the teacher's formula sheet.

- **Numerical questions:** the keyed option is recomputed in `src/data/validate.test.ts`, e.g. σ̂² = 150/75, adjusted R² = 1 − (300/95)/(500/99), partial F = (0.07/2)/(0.58/115), and DiD = −30,688 − (−18,824).
- **Stata questions:** each regression was re-run in Python (statsmodels OLS, which matches Stata's `regress`) on the supplied data. The test suite checks each keyed option against the regenerated values: t = 11.97, F = 31.96, F = 12.56, the 6.59 joint test (p = 0.0002), the interaction p = 0.946, and so on.
- **Conceptual questions:** each option is explained in the app (why it's right, or why it's wrong).

## Flagged questions (shown with a "Review note" in the app)

| ID | Issue | Handling |
|---|---|---|
| STATA-Q18 | Option c ("female wage difference is $2.86 larger among married workers") can also be read as true, because the female gap becomes 2.86 *more negative* | Keyed **a**, which is the precise statement of the interaction. Note shown to the learner. |
| STATA-Q12 | AEJfigs has 50 rows, 2 with missing `all` | Regression uses N = 48, as Stata would. Answer (b) is unaffected. |
| W3-Q24 | Refers to "the previous question" | The data from W3-Q23 is restated in a note. |
| W1-Q14 / W1-Q23, W1-Q21 / W1-Q24, W2-Q22 / W2-Q24 | Same question repeated, with different option order/layout | Both kept and cross-linked. |

No answer-key errors could be detected, because the source has no key.

## Variation generators

- There are **54 numerical generators** (all matrix, expectation, variance, σ̂², SE, t, p-value, R², adjusted R², overall/partial F, total effect, DiD, interactions, RDD, rescaling, log forms, standardisation, plus 13 Stata-output generators that build realistic regression/`test`/`ttest`/`summarize` tables with p-values from exact t and F distributions).
- Each generator recalculates its answer from the new inputs. Wrong options come from typical mistakes, and a question is regenerated if any two options would coincide. The tests run every generator 300 times and check for exactly 4 distinct options, one valid answer and no NaN/undefined.
- **18 concept-only skills** (e.g. FWL, DAG roles, unbiasedness, transpose rules) use *equivalent concept drills*. Each drill pairs one true statement with three false statements from that concept, and each false one comes with its reason.
- Generated questions are always labelled "Generated variation" and are kept separate from the originals.

## Known limitations

- Mock exams sample with balanced topic coverage (2–3 per topic) as the teacher describes. They can't reproduce the real paper, so a mock score is not a prediction.
- Simulated Stata output (in variations) is realistic but synthetic. Original Stata questions show output re-created from the real data.
- Progress is stored per browser (localStorage). Use Settings → Export/Import to move it.
- The mock timer defaults to the real exam's 90 minutes and can be shortened for speed practice.
