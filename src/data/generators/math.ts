// Generators for the Matrix Algebra and Week 1 topics.
import { Retry, bm, build, colv, f, g, m, type Gen } from './core';

const D = (x: number) => (x < 0 ? `(${g(x)})` : g(x));

export const matrixGens: Record<string, Gen> = {
  'mat-objects': (rng) => {
    const kind = rng.pick(['column', 'row', 'identity'] as const);
    if (kind === 'identity') {
      const n = rng.pick([2, 3, 4]);
      const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
      const ones = I.map((r) => r.map(() => 1));
      const zero = I.map((r) => r.map(() => 0));
      const anti = I.map((r, i) => r.map((_, j) => (i + j === n - 1 ? 1 : 0)));
      const twoI = I.map((r) => r.map((v) => 2 * v));
      return build(rng, {
        skill: 'mat-objects',
        stem: `Which of the following is the $${n}\\times${n}$ identity matrix?`,
        correct: `$${bm(I)}$`,
        distractors: [`$${bm(ones)}$`, `$${bm(zero)}$`, `$${bm(anti)}$`, `$${bm(twoI)}$`].slice(rng.int(0, 1)),
        steps: ['The identity has 1s on the main diagonal (top-left to bottom-right) and 0s everywhere else.'],
        explanation: `Only one option has exactly that pattern. A matrix of ones, the zero matrix, the anti-diagonal and $2I$ are all different matrices.`,
      });
    }
    const n = rng.int(3, 4);
    const v = Array.from({ length: n }, () => rng.int(1, 9));
    const sq = [[rng.int(1, 9), rng.int(1, 9)], [rng.int(1, 9), rng.int(1, 9)]];
    const colS = `$${colv(...v)}$`;
    const rowS = `$${bm([v])}$`;
    const correct = kind === 'column' ? colS : rowS;
    return build(rng, {
      skill: 'mat-objects',
      stem: `Which of the following is a **${kind} vector**?`,
      correct,
      distractors: [kind === 'column' ? rowS : colS, `$${rng.int(2, 9)}$`, `$${bm(sq)}$`],
      steps: ['Write the dimension (rows × columns) of each option.', kind === 'column' ? `A column vector is $${n}\\times1$: one column.` : `A row vector is $1\\times${n}$: one row.`],
      explanation: `The ${kind} vector is the option with exactly one ${kind === 'column' ? 'column' : 'row'}. A single number is a scalar, and the 2×2 object is a matrix.`,
    });
  },

  'mat-dims': (rng) => {
    const kind = rng.pick(['matrix', 'product', 'product', 'transpose', 'sum'] as const);
    const d = (r: number, c: number) => `$${r}\\times${c}$`;
    if (kind === 'matrix') {
      const r = rng.int(2, 4);
      let c = rng.int(2, 5);
      if (c === r) c++;
      const A = Array.from({ length: r }, () => Array.from({ length: c }, () => rng.int(0, 9)));
      return build(rng, {
        skill: 'mat-dims',
        stem: `What is the dimension of $$A=${bm(A)}?$$`,
        correct: d(r, c),
        distractors: [d(c, r), d(r, r), d(c, c)],
        steps: [`Count rows: ${r}. Count columns: ${c}.`, `Dimension = rows × columns = ${r}×${c}.`],
        explanation: 'Dimension is always rows first, then columns.',
      });
    }
    if (kind === 'transpose') {
      const r = rng.int(2, 9);
      let c = rng.int(2, 9);
      if (c === r) c++;
      return build(rng, {
        skill: 'mat-dims',
        stem: `If $A$ has dimension $${r}\\times${c}$, what is the dimension of $A'$?`,
        correct: d(c, r),
        distractors: [d(r, c), d(c, c), d(r, r)],
        steps: [`Transposing swaps rows and columns: ${r}×${c} → ${c}×${r}.`],
        explanation: `$A'$ is ${c}×${r}. (${c}×${c} would be $A'A$; ${r}×${r} would be $AA'$.)`,
      });
    }
    if (kind === 'sum') {
      const r = rng.int(2, 4);
      let c = rng.int(2, 5);
      if (c === r) c++;
      return build(rng, {
        skill: 'mat-dims',
        stem: `Suppose $A$ is $${r}\\times${c}$ and $B$ is $${c}\\times${r}$. Which statement is correct?`,
        correct: `$A+B$ is not defined because the dimensions differ.`,
        distractors: [`$A+B$ is defined.`, `$A-B$ is defined.`, `$A+B$ has dimension $${r}\\times${r}$.`],
        steps: ['Addition/subtraction need identical dimensions.', `${r}×${c} ≠ ${c}×${r}.`],
        explanation: 'Element-by-element addition needs every position to exist in both matrices.',
      });
    }
    const r = rng.int(2, 6);
    const s = rng.int(2, 6);
    const t = rng.int(2, 6);
    const mismatch = rng.chance(0.25);
    const s2 = mismatch ? s + rng.int(1, 2) : s;
    if (mismatch) {
      return build(rng, {
        skill: 'mat-dims',
        stem: `If $A$ is $${r}\\times${s}$ and $B$ is $${s2}\\times${t}$, what is the dimension of $AB$?`,
        correct: 'The product is not defined.',
        distractors: [d(r, t), d(s, s2), d(t, r)],
        steps: [`Inner dimensions: ${s} (columns of A) vs ${s2} (rows of B).`, `${s} ≠ ${s2} → AB is not defined.`],
        explanation: 'Multiplication requires columns of A = rows of B.',
      });
    }
    return build(rng, {
      skill: 'mat-dims',
      stem: `If $A$ is $${r}\\times${s}$ and $B$ is $${s}\\times${t}$, what is the dimension of $AB$?`,
      correct: d(r, t),
      distractors: [d(t, r), d(s, s), 'The product is not defined.', d(r, s)],
      steps: [`(${r}×${s})(${s}×${t}): inner dims ${s} = ${s} → defined.`, `Outer dims → ${r}×${t}.`],
      explanation: 'The product takes rows of A and columns of B.',
    });
  },

  'mat-scalar': (rng) => {
    const A = [[rng.intNZ(-5, 6), rng.intNZ(-5, 6)], [rng.intNZ(-5, 6), rng.intNZ(-5, 6)]];
    const k = rng.pick([2, 3, 4, -2, -3, 5]);
    const kA = A.map((r) => r.map((v) => k * v));
    const addK = A.map((r) => r.map((v) => v + k));
    const diag = A.map((r, i) => r.map((v, j) => (i === j ? k * v : v)));
    const row1 = A.map((r, i) => r.map((v) => (i === 0 ? k * v : v)));
    return build(rng, {
      skill: 'mat-scalar',
      stem: `Let $$A=${bm(A)}.$$ What is $${k}A$?`,
      correct: `$${bm(kA)}$`,
      distractors: [`$${bm(addK)}$`, `$${bm(diag)}$`, `$${bm(row1)}$`],
      steps: [`Multiply every entry by ${k}:`, `$${k}A=${bm(A.map((r) => r.map((v) => `${k}\\cdot${v < 0 ? `(${v})` : v}`)))}=${bm(kA)}$`],
      explanation: 'Scalar multiplication multiplies each element. Watch the signs.',
    });
  },

  'mat-multiply': (rng) => {
    const M = [[rng.int(-2, 5), rng.int(-2, 5)], [rng.int(-2, 5), rng.int(-2, 5)]];
    const v = [rng.intNZ(-3, 5), rng.intNZ(-3, 5)];
    const r = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
    const diag = [M[0][0] * v[0], M[1][1] * v[1]];
    const transp = [M[0][0] * v[0] + M[1][0] * v[1], M[0][1] * v[0] + M[1][1] * v[1]];
    return build(rng, {
      skill: 'mat-multiply',
      stem: `Calculate $$${bm(M)}${colv(...v)}.$$`,
      correct: `$${colv(...r)}$`,
      distractors: [`$${colv(...diag)}$`, `$${colv(...transp)}$`, `$${colv(r[1], r[0])}$`, `$${colv(r[0], r[1] + 1)}$`],
      steps: [
        `Top: row 1 · vector = ${M[0][0]}·${D(v[0])} + ${M[0][1]}·${D(v[1])} = ${r[0]}.`,
        `Bottom: row 2 · vector = ${M[1][0]}·${D(v[0])} + ${M[1][1]}·${D(v[1])} = ${r[1]}.`,
      ],
      explanation: `Each entry is a row of the matrix times the vector, giving (${g(r[0])}, ${g(r[1])})′.`,
    });
  },

  'mat-transpose': (rng) => {
    const vals = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 6);
    const A = [vals.slice(0, 3), vals.slice(3, 6)];
    const At = [[A[0][0], A[1][0]], [A[0][1], A[1][1]], [A[0][2], A[1][2]]];
    const reshape = [vals.slice(0, 2), vals.slice(2, 4), vals.slice(4, 6)];
    const swap = [A[1], A[0]];
    const rev = [[A[1][0], A[0][0]], [A[1][1], A[0][1]], [A[1][2], A[0][2]]];
    return build(rng, {
      skill: 'mat-transpose',
      stem: `Let $$A=${bm(A)}.$$ Which is $A'$?`,
      correct: `$${bm(At)}$`,
      distractors: [`$${bm(reshape)}$`, `$${bm(swap)}$`, `$${bm(rev)}$`],
      steps: [`Row 1 (${A[0].join(', ')}) becomes column 1.`, `Row 2 (${A[1].join(', ')}) becomes column 2.`, 'Result is 3×2.'],
      explanation: 'Transposing turns rows into columns; simply re-reading the numbers into a 3×2 shape is NOT a transpose.',
    });
  },

  'mat-inner': (rng) => {
    if (rng.chance(0.5)) {
      const n = rng.pick([2, 3]);
      const x = Array.from({ length: n }, () => rng.intNZ(-3, 6));
      const y = Array.from({ length: n }, () => rng.intNZ(-3, 6));
      const ip = x.reduce((s, xi, i) => s + xi * y[i], 0);
      const sumAll = [...x, ...y].reduce((a, b) => a + b, 0);
      const first = x[0] * y[0];
      const cross = x[0] * y[1] + x[1] * y[0] + (n === 3 ? x[2] * y[2] : 0);
      return build(rng, {
        skill: 'mat-inner',
        stem: `Let $$x=${colv(...x)},\\qquad y=${colv(...y)}.$$ What is the inner product $x'y$?`,
        correct: g(ip),
        distractors: [g(cross), g(first), g(sumAll), g(ip + rng.pick([-2, 2, 3]))],
        steps: [x.map((xi, i) => `${D(xi)}·${D(y[i])}`).join(' + ') + ` = ${g(ip)}`],
        explanation: 'Multiply matching entries and add.',
      });
    }
    const a = rng.intNZ(-3, 4);
    const b = rng.intNZ(-3, 4);
    const orth = rng.chance(0.5);
    const k = rng.pick([1, 2, -1]);
    let y = orth ? [-b * k, a * k] : [rng.intNZ(-3, 4), rng.intNZ(-3, 4)];
    const ip = a * y[0] + b * y[1];
    if (!orth && ip === 0) y = [y[0] + 1, y[1]];
    const ip2 = a * y[0] + b * y[1];
    if (!orth && ip2 === 0) throw new Retry();
    const stem = `Consider $$x=${colv(a, b)},\\qquad y=${colv(...y)}.$$ Which statement is correct?`;
    const st = {
      orth0: `The vectors are orthogonal because $x'y=0$.`,
      orth1: `The vectors are orthogonal because $x'y=1$.`,
      coll0: `The vectors are collinear because $x'y=0$.`,
      notOrth: `The vectors are not orthogonal because $x'y=${g(ip2).replace('−', '-')}\\neq0$.`,
      orthV: `The vectors are orthogonal because $x'y=${g(ip2).replace('−', '-')}$.`,
      notOrthWrong: `The vectors are not orthogonal because $x'y=${rng.pick([2, 3, -4, 5])}\\neq0$.`,
    };
    return build(rng, {
      skill: 'mat-inner',
      stem,
      correct: orth ? st.orth0 : st.notOrth,
      distractors: orth ? [st.notOrthWrong, st.coll0, st.orth1] : [st.orth0, st.orthV, st.coll0],
      steps: [`$x'y=${D(a)}\\cdot${D(y[0])}+${D(b)}\\cdot${D(y[1])}=${g(ip2).replace('−', '-')}$`, orth ? 'Zero → orthogonal.' : 'Non-zero → not orthogonal.'],
      explanation: 'Orthogonal ⇔ inner product equals zero. Orthogonal is not the same as collinear.',
    });
  },

  'mat-lincomb': (rng) => {
    const x1 = [rng.int(-3, 5), rng.int(-3, 5)];
    const x2 = [rng.int(-3, 5), rng.int(-3, 5)];
    const a = rng.pick([2, 3, -2]);
    const b = rng.pick([-1, 1, 2, -2, -3]);
    const r = [a * x1[0] + b * x2[0], a * x1[1] + b * x2[1]];
    const flip = [a * x1[0] - b * x2[0], a * x1[1] - b * x2[1]];
    const neg = [-r[0], -r[1]];
    const bad = [r[0], a * x1[1] - b * x2[1]];
    const term = (c: number, name: string) => (c === 1 ? `+${name}` : c === -1 ? `-${name}` : c > 0 ? `+${c}${name}` : `${c}${name}`);
    const expr = `${a}x_1${term(b, 'x_2')}`;
    return build(rng, {
      skill: 'mat-lincomb',
      stem: `Let $$x_1=${colv(...x1)},\\qquad x_2=${colv(...x2)}.$$ What is $${expr}$?`,
      correct: `$${colv(...r)}$`,
      distractors: [`$${colv(...flip)}$`, `$${colv(...neg)}$`, `$${colv(...bad)}$`, `$${colv(r[1], r[0])}$`],
      steps: [`Top: ${a}·${D(x1[0])} + (${b})·${D(x2[0])} = ${r[0]}`, `Bottom: ${a}·${D(x1[1])} + (${b})·${D(x2[1])} = ${r[1]}`],
      explanation: 'Scale each vector, then add entry by entry. Keep track of the sign of each coefficient.',
    });
  },

  'mat-span': (rng) => {
    const x1 = [rng.intNZ(-3, 4), rng.intNZ(-3, 4)];
    const collinear = rng.chance(0.5);
    const c = rng.pick([2, 3, -2, -1]);
    const x2 = collinear ? [c * x1[0], c * x1[1]] : [rng.intNZ(-3, 4), rng.intNZ(-3, 4)];
    const det = x1[0] * x2[1] - x1[1] * x2[0];
    const ip = x1[0] * x2[0] + x1[1] * x2[1];
    if (!collinear && (det === 0 || ip === 0)) throw new Retry();
    const stem = `Let $$x_1=${colv(...x1)},\\qquad x_2=${colv(...x2)}.$$ Which statement is correct?`;
    if (collinear) {
      return build(rng, {
        skill: 'mat-span', stem,
        correct: `The vectors span only a line because $x_2=${c}x_1$.`,
        distractors: ['The vectors span all of $\\mathbb R^2$.', 'The vectors are orthogonal.', 'The vectors provide two independent directions.'],
        steps: [`$${c}x_1=${colv(...x2)}=x_2$ → collinear (dependent).`, `$x_1'x_2=${g(ip).replace('−', '-')}\\neq0$ → not orthogonal.`],
        explanation: 'One vector is a multiple of the other, so all combinations lie on one line.',
      });
    }
    return build(rng, {
      skill: 'mat-span', stem,
      correct: 'The vectors span all of $\\mathbb R^2$.',
      distractors: ['The vectors span only a line because one is a multiple of the other.', 'The vectors are orthogonal.', 'The vectors are linearly dependent.'],
      steps: [`Neither is a multiple of the other: $\\det=${D(x1[0])}\\cdot${D(x2[1])}-${D(x1[1])}\\cdot${D(x2[0])}=${g(det).replace('−', '-')}\\neq0$.`, `$x_1'x_2=${g(ip).replace('−', '-')}\\neq0$ → not orthogonal (but still independent).`],
      explanation: 'Two linearly independent vectors in ℝ² span the whole plane. Independent does not require orthogonal.',
    });
  },

  'mat-rank': (rng) => {
    const a = rng.intNZ(-3, 4);
    const b = rng.intNZ(-3, 4);
    const full = rng.chance(0.5);
    let A: number[][];
    if (full) {
      A = [[a, rng.int(-3, 5)], [b, rng.int(-3, 5)]];
      if (A[0][0] * A[1][1] - A[0][1] * A[1][0] === 0) throw new Retry();
    } else {
      const k = rng.pick([2, 3, -1, -2]);
      A = [[a, k * a], [b, k * b]];
    }
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const correct = full ? '2' : '1';
    return build(rng, {
      skill: 'mat-rank',
      stem: `Consider $$A=${bm(A)}.$$ What is the rank of $A$?`,
      correct,
      distractors: ['0', full ? '1' : '2', '4'],
      fixedOrder: ['0', '1', '2', '4'],
      steps: [`$\\det A=${D(A[0][0])}\\cdot${D(A[1][1])}-${D(A[0][1])}\\cdot${D(A[1][0])}=${g(det).replace('−', '-')}$.`, full ? 'Non-zero → columns independent → rank 2.' : 'Zero (and A ≠ 0) → one independent column → rank 1.'],
      explanation: full ? 'Full rank: the 2×2 matrix is invertible.' : 'Column 2 is a multiple of column 1, so only one independent direction.',
    });
  },
};

const DATA_TYPES = {
  cross: { name: 'cross-sectional data', ex: ['incomes of 2,000 randomly chosen households surveyed in March 2024', 'GDP per capita of 150 countries in the year 2019', 'final exam scores of 480 students in one semester', 'house prices of 300 houses sold in Tashkent during 2023', 'employment status of 5,000 adults interviewed in one week'] },
  ts: { name: 'time-series data', ex: ['the monthly inflation rate of Uzbekistan from 2000 to 2023', 'the daily closing price of one company\'s stock over five years', 'annual GDP of the United Kingdom from 1950 to 2020', 'quarterly unemployment rate of one country over 30 years'] },
  pooled: { name: 'pooled cross-sectional data', ex: ['a random sample of houses sold in 1978 combined with a different random sample of houses sold in 1981', 'two independent household surveys, one from 2010 and one from 2020 (different households), stacked together', 'separate random samples of workers interviewed in 2015 and in 2022, combined into one data set'] },
  panel: { name: 'panel (longitudinal) data', ex: ['the same 300 firms observed every year from 2015 to 2020', 'wages of the same 1,000 individuals recorded annually for ten years', 'crime rates for the same 50 cities in 2010 and 2020'] },
};

export const week1Gens: Record<string, Gen> = {
  'data-types': (rng) => {
    const key = rng.pick(Object.keys(DATA_TYPES) as (keyof typeof DATA_TYPES)[]);
    const ex = rng.pick(DATA_TYPES[key].ex);
    const names = Object.values(DATA_TYPES).map((t) => t.name);
    const correct = DATA_TYPES[key].name;
    return build(rng, {
      skill: 'data-types',
      stem: `A data set contains ${ex}. What type of data set is this?`,
      correct,
      distractors: names.filter((n) => n !== correct),
      steps: ['How many units? How many time periods? Are the same units followed over time?'],
      explanation: {
        cross: 'Many units observed at one point in time → cross-section.',
        ts: 'One unit observed repeatedly over time → time series.',
        pooled: 'Different (independent) samples from different times combined → pooled cross-section.',
        panel: 'The same units followed over time → panel / longitudinal.',
      }[key],
    });
  },

  'ev-discrete': (rng) => {
    const step = rng.pick([5, 10, 20]);
    const base = rng.int(1, 4) * step;
    const vals = [base, base + step * rng.int(1, 2), 0];
    vals[2] = vals[1] + step * rng.int(1, 2);
    const p1 = rng.int(1, 6);
    const p2 = rng.int(1, 8 - p1);
    const p3 = 10 - p1 - p2;
    const ps = [p1 / 10, p2 / 10, p3 / 10];
    const ev = vals.reduce((s, v, i) => s + v * ps[i], 0);
    const simple = (vals[0] + vals[1] + vals[2]) / 3;
    const rev = vals.reduce((s, v, i) => s + v * ps[2 - i], 0);
    return build(rng, {
      skill: 'ev-discrete',
      stem: 'Suppose a random variable $Y$ takes the values below. What is $\\mathbb E[Y]$?',
      table: { headers: ['$Y$', ...vals.map(String)], rows: [['$P(Y=y)$', ...ps.map((p) => p.toFixed(2))]] },
      correct: f(ev, 1),
      distractors: [f(simple, 1), f(rev, 1), f(ev + step / 5, 1), f(ev - step / 2, 1)],
      steps: [`$\\mathbb E[Y]=${vals.map((v, i) => `${v}(${ps[i].toFixed(2)})`).join('+')}$`, `$=${vals.map((v, i) => g(v * ps[i])).join('+')}=${g(ev)}$`],
      explanation: 'Probability-weighted average. The simple average ignores the probabilities.',
    });
  },

  'ev-linearity': (rng) => {
    if (rng.chance(0.5)) {
      const ey = rng.int(2, 15);
      const a = rng.intNZ(-6, 10);
      const b = rng.pick([2, 3, 4, -2, -3]);
      const r = a + b * ey;
      return build(rng, {
        skill: 'ev-linearity',
        stem: `If $\\mathbb E[Y]=${ey}$, what is $\\mathbb E[${a}${b > 0 ? '+' : ''}${b}Y]$?`,
        correct: g(r),
        distractors: [g(a + ey), g(b * ey), g(b * (a + ey)), g(a - b * ey)],
        steps: [`$\\mathbb E[${a}${b > 0 ? '+' : ''}${b}Y]=${a}${b > 0 ? '+' : ''}${b}\\,\\mathbb E[Y]=${a}${b > 0 ? '+' : ''}${b}(${ey})=${m(r)}$`],
        explanation: 'Constants pass through; multipliers come out of the expectation.',
      });
    }
    const ex = rng.int(1, 9);
    const ey = rng.int(1, 9);
    const a = rng.int(1, 10);
    const b = rng.pick([2, 3, 4]);
    const c = rng.pick([2, 3, 4]);
    const r = a + b * ex - c * ey;
    return build(rng, {
      skill: 'ev-linearity',
      stem: `Suppose $\\mathbb E[X]=${ex}$ and $\\mathbb E[Y]=${ey}$. What is $$\\mathbb E[${a}+${b}X-${c}Y]?$$`,
      correct: g(r),
      distractors: [g(a + b * ex + c * ey), g(b * ex - c * ey), g(a + b * ey - c * ex), g(r + 1)],
      steps: [`$${a}+${b}(${ex})-${c}(${ey})=${a}+${b * ex}-${c * ey}=${m(r)}$`],
      explanation: 'Linearity: substitute the means. Keep the minus sign on the Y term.',
    });
  },

  'joint-marginal': (rng) => {
    const t = jointTable(rng);
    const askX = rng.chance(0.7);
    if (askX) {
      const x = rng.int(0, 1);
      const p = t.p.reduce((s, r) => s + r[x], 0);
      const rowSum = t.p[0][0] + t.p[0][1];
      return build(rng, {
        skill: 'joint-marginal',
        stem: `Consider the joint probability table. What is $P(X=${x})$?`,
        table: t.table,
        correct: f(p, 2),
        distractors: [f(1 - p, 2), f(rowSum, 2), f(t.p[0][x], 2), f(p + 0.1, 2)],
        steps: [`Sum the X = ${x} column: ${t.p.map((r) => r[x].toFixed(2)).join(' + ')} = ${p.toFixed(2)}.`],
        explanation: 'Marginal probability = sum of the joint probabilities over the other variable.',
      });
    }
    const i = rng.int(0, 2);
    const p = t.p[i][0] + t.p[i][1];
    return build(rng, {
      skill: 'joint-marginal',
      stem: `Consider the joint probability table. What is $P(Y=${t.ys[i]})$?`,
      table: t.table,
      correct: f(p, 2),
      distractors: [f(t.p[0][0] + t.p[1][0] + t.p[2][0], 2), f(t.p[i][0], 2), f(1 - p, 2), f(t.p[i][1], 2)],
      steps: [`Sum the Y = ${t.ys[i]} row: ${t.p[i][0].toFixed(2)} + ${t.p[i][1].toFixed(2)} = ${p.toFixed(2)}.`],
      explanation: 'Marginal of Y: add across the row.',
    });
  },

  'cond-prob': (rng) => {
    const t = jointTable(rng);
    const x = rng.int(0, 1);
    const i = rng.int(0, 2);
    const px = t.p.reduce((s, r) => s + r[x], 0);
    const py = t.p[i][0] + t.p[i][1];
    const r = t.p[i][x] / px;
    return build(rng, {
      skill: 'cond-prob',
      stem: `Using the table below, what is $P(Y=${t.ys[i]}\\mid X=${x})$?`,
      table: t.table,
      correct: f(r, 2),
      distractors: [f(t.p[i][x], 2), f(py, 2), f(t.p[i][x] / py, 2), f(px, 2)],
      steps: [`$P(X=${x})=${t.p.map((rw) => rw[x].toFixed(2)).join('+')}=${px.toFixed(2)}$`, `$P(Y=${t.ys[i]}\\mid X=${x})=${t.p[i][x].toFixed(2)}/${px.toFixed(2)}=${r.toFixed(4)}\\approx${r.toFixed(2)}$`],
      explanation: 'Cell ÷ column total. The joint probability alone is not the conditional probability.',
    });
  },

  'cond-exp': (rng) => {
    if (rng.chance(0.5)) {
      const base = rng.pick([40, 50, 60]);
      const step = rng.pick([10, 20]);
      const ys = [base, base + step, base + 2 * step];
      const p1 = rng.int(1, 6);
      const p2 = rng.int(1, 8 - p1);
      const ps = [p1 / 10, p2 / 10, (10 - p1 - p2) / 10];
      const x = rng.int(0, 1);
      const r = ys.reduce((s, y, k) => s + y * ps[k], 0);
      return build(rng, {
        skill: 'cond-exp',
        stem: `Suppose $$${ys.map((y, k) => `P(Y=${y}\\mid X=${x})=${ps[k].toFixed(2)}`).join(',\\quad ')}.$$ What is $\\mathbb E[Y\\mid X=${x}]$?`,
        correct: f(r, 1),
        distractors: [f(ys[1], 1), f(ys.reduce((s, y, k) => s + y * ps[2 - k], 0), 1), f(r + step / 2, 1), f(r - step / 2, 1)],
        steps: [`$${ys.map((y, k) => `${y}(${ps[k].toFixed(2)})`).join('+')}=${g(r)}$`],
        explanation: 'Weight each value by its conditional probability.',
      });
    }
    const xs = [rng.pick([60, 80, 100]), 0, 0];
    xs[1] = xs[0] + 40;
    xs[2] = xs[1] + 40;
    const rows = xs.map((_, k) => {
      const c = 40 + 30 * k + rng.int(0, 10);
      return [c, c + rng.int(1, 10), c + rng.int(8, 16)];
    });
    const means = rows.map((r) => (r[0] + r[1] + r[2]) / 3);
    const k = rng.int(0, 2);
    const all = rows.flat().reduce((a, b) => a + b, 0) / 9;
    return build(rng, {
      skill: 'cond-exp',
      stem: `The following hypothetical population data are given. What is $E(Y\\mid X=${xs[k]})$?`,
      table: { headers: ['Income ($X$)', 'Consumption ($Y$)', '', ''], rows: xs.map((x, j) => [String(x), ...rows[j].map(String)]) },
      correct: f(means[k], 2),
      distractors: [...means.filter((_, j) => j !== k).map((v) => f(v, 2)), f(all, 2), f(rows[k][1], 2)],
      steps: [`Values with X = ${xs[k]}: ${rows[k].join(', ')}.`, `(${rows[k].join(' + ')}) / 3 = ${rows[k].reduce((a, b) => a + b, 0)} / 3 = ${means[k].toFixed(2)}`],
      explanation: 'Average Y only within the requested X group (not all observations).',
    });
  },

  lie: (rng) => {
    const e0 = rng.int(4, 12) * 5;
    const e1 = e0 + rng.int(2, 8) * 5;
    const p0 = rng.int(1, 9) / 10;
    const p1 = Math.round((1 - p0) * 10) / 10;
    const r = e0 * p0 + e1 * p1;
    return build(rng, {
      skill: 'lie',
      stem: `Suppose $$\\mathbb E[Y\\mid X=0]=${e0},\\qquad \\mathbb E[Y\\mid X=1]=${e1},$$ and $$P(X=0)=${p0.toFixed(2)},\\qquad P(X=1)=${p1.toFixed(2)}.$$ Using the Law of Iterated Expectations, what is $\\mathbb E[Y]$?`,
      correct: f(r, 1),
      distractors: [f((e0 + e1) / 2, 1), f(e0 * p1 + e1 * p0, 1), f(r + 2, 1), f(r - 2, 1)],
      steps: [`$\\mathbb E[Y]=${e0}(${p0.toFixed(2)})+${e1}(${p1.toFixed(2)})=${g(e0 * p0)}+${g(e1 * p1)}=${g(r)}$`],
      explanation: 'The overall mean is the probability-weighted average of the conditional means.',
    });
  },
};

function jointTable(rng: import('../../lib/random').Rng) {
  // 6 cells in multiples of 0.05 summing to 1, each at least 0.05.
  const units = Array(6).fill(1);
  for (let i = 0; i < 14; i++) units[rng.int(0, 5)]++;
  const p = [[units[0] / 20, units[1] / 20], [units[2] / 20, units[3] / 20], [units[4] / 20, units[5] / 20]];
  const base = rng.pick([10, 20]);
  const ys = [base, base * 2, base * 3];
  return {
    p,
    ys,
    table: { headers: ['', '$X=0$', '$X=1$'], rows: p.map((r, i) => [`$Y=${ys[i]}$`, r[0].toFixed(2), r[1].toFixed(2)]) },
  };
}
