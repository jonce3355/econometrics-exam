// Generators for Weeks 2–5.
import { fCritical } from '../../lib/distributions';
import { Retry, bm, build, colv, f, g, m, type Gen } from './core';

const dim = (r: number | string, c: number | string) => `${r}\\times${c}`;

export const econGens: Record<string, Gen> = {
  // ---------------- Week 2 ----------------
  'ols-dims': (rng) => {
    const kind = rng.pick(['xb', 'xx', 'var'] as const);
    const n = rng.pick([50, 80, 100, 120, 150, 200, 250, 500]);
    if (kind === 'xb') {
      const p = rng.int(2, 6);
      const k = p + 1;
      return build(rng, {
        skill: 'ols-dims',
        stem: `A regression has $n=${n}$ observations and contains a constant and ${p} explanatory variables. What are the dimensions of $X$ and $\\beta$?`,
        correct: `$X:${dim(n, k)},\\ \\beta:${dim(k, 1)}$`,
        distractors: [`$X:${dim(n, p)},\\ \\beta:${dim(p, 1)}$`, `$X:${dim(k, n)},\\ \\beta:${dim(1, k)}$`, `$X:${dim(n, k)},\\ \\beta:${dim(n, 1)}$`],
        steps: [`k = ${p} + 1 (constant) = ${k}.`, `X is n × k = ${n}×${k}; β is k × 1 = ${k}×1.`],
        explanation: 'Each coefficient (including the intercept) has one column in X and one entry in β.',
      });
    }
    const k = rng.int(3, 8);
    if (kind === 'xx') {
      return build(rng, {
        skill: 'ols-dims',
        stem: `Suppose $X$ is $${dim(n, k)}$. What are the dimensions of $X'X$ and $X'y$?`,
        correct: `$X'X:${dim(k, k)},\\ X'y:${dim(k, 1)}$`,
        distractors: [`$X'X:${dim(n, n)},\\ X'y:${dim(n, 1)}$`, `$X'X:${dim(k, n)},\\ X'y:${dim(n, 1)}$`, `$X'X:${dim(n, k)},\\ X'y:${dim(k, 1)}$`],
        steps: [`$X'$ is ${k}×${n}.`, `$X'X=(${k}\\times${n})(${n}\\times${k})=${dim(k, k)}$; $X'y=(${k}\\times${n})(${n}\\times1)=${dim(k, 1)}$.`],
        explanation: "X′X is always k×k and X′y is k×1.",
      });
    }
    return build(rng, {
      skill: 'ols-dims',
      stem: `Suppose $X$ is $${dim(n, k)}$. What are the dimensions of $\\text{Var}(\\hat\\beta\\mid X)$?`,
      correct: `$${dim(k, k)}$`,
      distractors: [`$${dim(n, n)}$`, `$${dim(n, k)}$`, `$${dim(k, n)}$`],
      steps: [`$\\hat\\beta$ is ${k}×1, so its variance–covariance matrix $\\sigma^2(X'X)^{-1}$ is ${k}×${k}.`],
      explanation: 'One row/column per coefficient. (n×n is the size of Ω, the error variance matrix.)',
    });
  },

  'ols-objective': (rng) => {
    const a = rng.int(5, 90);
    let b = rng.int(5, 90);
    if (a === b) b += 3;
    const better = a < b ? 'A' : 'B';
    const worse = better === 'A' ? 'B' : 'A';
    return build(rng, {
      skill: 'ols-objective',
      stem: `Suppose two possible coefficient vectors produce $$e_A'e_A=${a},\\qquad e_B'e_B=${b}.$$ Which statement is correct?`,
      correct: `$\\hat\\beta_${better}$ gives the better fit because its residual sum of squares is smaller.`,
      distractors: [`$\\hat\\beta_${worse}$ gives the better fit because its residual sum of squares is larger.`, 'Both coefficient vectors give exactly the same fit.', 'Neither coefficient vector can be compared using OLS.'],
      steps: [`${Math.min(a, b)} < ${Math.max(a, b)}.`, 'OLS prefers the coefficients with the smaller sum of squared residuals.'],
      explanation: 'Least squares = choose the coefficients that make e′e as small as possible.',
    });
  },

  // ---------------- Week 3 ----------------
  'outer-product': (rng) => {
    const e1 = rng.intNZ(-4, 4);
    const e2 = rng.intNZ(-4, 4);
    const M = [[e1 * e1, e1 * e2], [e2 * e1, e2 * e2]];
    const absM = [[e1 * e1, Math.abs(e1 * e2)], [Math.abs(e1 * e2), e2 * e2]];
    return build(rng, {
      skill: 'outer-product',
      stem: `Let $$e=${colv(e1, e2)}.$$ What is the outer product $ee'$?`,
      correct: `$${bm(M)}$`,
      distractors: [`$${bm(absM)}$`, `$${bm([[e1, e2], [e1, e2]])}$`, g(e1 * e1 + e2 * e2), `$${bm([[e1 * e1, 0], [0, e2 * e2]])}$`],
      steps: [`Diagonal: $e_1^2=${e1 * e1}$, $e_2^2=${e2 * e2}$.`, `Off-diagonal: $e_1e_2=${m(e1)}\\cdot${m(e2)}=${m(e1 * e2)}$.`],
      explanation: `ee′ is a 2×2 matrix (outer product). The single number ${e1 * e1 + e2 * e2} would be the inner product e′e.`,
    });
  },

  'vcov-structure': (rng) => {
    const kind = rng.pick(['homo', 'hetero', 'auto'] as const);
    const s = rng.pick([1, 2, 3, 4, 5, 9]);
    let O: number[][];
    if (kind === 'homo') O = [[s, 0, 0], [0, s, 0], [0, 0, s]];
    else if (kind === 'hetero') {
      const d = rng.sample([1, 2, 3, 4, 5, 6, 9], 3);
      O = [[d[0], 0, 0], [0, d[1], 0], [0, 0, d[2]]];
    } else {
      const c1 = rng.int(1, Math.max(1, s - 1));
      const c2 = rng.int(1, Math.max(1, s - 1));
      O = [[s + 2, c1, 0], [c1, s + 2, c2], [0, c2, s + 2]];
    }
    const opts = {
      homo: 'The errors are homoskedastic and uncorrelated.',
      hetero: 'The errors are heteroskedastic (different variances) but uncorrelated.',
      auto: 'The errors are correlated across observations (autocorrelation) with equal variances.',
      mc: 'The matrix shows perfect multicollinearity.',
    };
    return build(rng, {
      skill: 'vcov-structure',
      stem: `Consider $$\\Omega=\\text{Var}(\\varepsilon\\mid X)=${bm(O)}.$$ Which statement is correct?`,
      correct: opts[kind],
      distractors: (['homo', 'hetero', 'auto', 'mc'] as const).filter((k) => k !== kind).map((k) => opts[k]),
      steps: ['Diagonal = variances: ' + (kind === 'hetero' ? 'they differ → heteroskedastic.' : 'all equal → homoskedastic.'), 'Off-diagonal = covariances: ' + (kind === 'auto' ? 'non-zero → correlated errors.' : 'all zero → uncorrelated.')],
      explanation: 'Read the diagonal first, then the off-diagonal. Multicollinearity is about X, not Ω.',
    });
  },

  'var-rules': (rng) => {
    const kind = rng.pick(['scale', 'shift', 'both', 'sd'] as const);
    const v = rng.pick([2, 3, 4, 5, 9, 16, 25]);
    const a = rng.pick([2, 3, 4, 5, -2, -3]);
    const c = rng.intNZ(-10, 15);
    if (kind === 'shift') {
      return build(rng, {
        skill: 'var-rules',
        stem: `If $\\text{Var}(Y)=${v}$, what is $\\text{Var}(Y${c > 0 ? '+' : ''}${c})$?`,
        correct: g(v),
        distractors: [g(v + c), g(v * Math.abs(c)), g(v - c), g(v + c * c)],
        steps: ['Adding a constant shifts every value by the same amount, so the spread is unchanged.'],
        explanation: `Var(Y + c) = Var(Y) = ${v}.`,
      });
    }
    if (kind === 'sd') {
      const sd = rng.pick([2, 3, 4, 5]);
      return build(rng, {
        skill: 'var-rules',
        stem: `If $sd(X)=${sd}$, what is $sd(${a}X${c > 0 ? '+' : ''}${c})$?`,
        correct: g(Math.abs(a) * sd),
        distractors: [g(a * a * sd), g(a * sd + c), g(Math.abs(a) * sd + c), g(a * a * sd * sd)],
        steps: [`$sd(\\lambda X+\\kappa)=|\\lambda|\\,sd(X)=${Math.abs(a)}\\times${sd}=${Math.abs(a) * sd}$.`],
        explanation: 'For the standard deviation, multiply by the absolute value of the multiplier (do not square); constants vanish.',
      });
    }
    const cc = kind === 'both' ? c : 0;
    const expr = `${a}Y${cc ? (cc > 0 ? '+' : '') + cc : ''}`;
    return build(rng, {
      skill: 'var-rules',
      stem: `If $\\text{Var}(Y)=${v}$, what is $\\text{Var}(${expr})$?`,
      correct: g(a * a * v),
      distractors: [g(a * v), g(Math.abs(a) * v), g(a * a * v + cc), g(v), g(a * a * v + 1)],
      steps: [`$\\text{Var}(${expr})=(${a})^2\\,\\text{Var}(Y)=${a * a}\\times${v}=${a * a * v}$.`],
      explanation: 'Square the multiplier; constants drop out; variance is never negative.',
    });
  },

  'var-combination': (rng) => {
    const vy = rng.pick([1, 4, 9, 16, 2, 3, 5]);
    const vz = rng.pick([1, 4, 9, 16, 2, 3, 5]);
    const cov = rng.pick([0, 1, 2, -1, -2, 3]);
    const a = rng.pick([1, 2, 3]);
    const b = rng.pick([-1, 1, -2, 2]);
    const r = a * a * vy + b * b * vz + 2 * a * b * cov;
    if (r <= 0) throw new Retry();
    const expr = `${a === 1 ? '' : a}Y${b === 1 ? '+' : b === -1 ? '-' : b > 0 ? `+${b}` : b}Z`;
    return build(rng, {
      skill: 'var-combination',
      stem: `Suppose $$\\text{Var}(Y)=${vy},\\quad \\text{Var}(Z)=${vz},\\quad \\text{Cov}(Y,Z)=${cov}.$$ What is $\\text{Var}(${expr})$?`,
      correct: g(r),
      distractors: [g(a * a * vy + b * b * vz - 2 * a * b * cov), g(a * a * vy + b * b * vz), g(a * vy + Math.abs(b) * vz + 2 * a * b * cov), g(a * a * vy - b * b * vz), g(r + 2)],
      steps: [`$a=${a},\\ b=${b}$.`, `$${a}^2(${vy})+(${b})^2(${vz})+2(${a})(${b})(${cov})=${a * a * vy}+${b * b * vz}${2 * a * b * cov < 0 ? '' : '+'}${2 * a * b * cov}=${r}$`],
      explanation: 'Square the weights and add 2ab·Cov, keeping the sign of b.',
    });
  },

  'sigma-hat': (rng) => {
    const n = rng.pick([40, 50, 60, 80, 100, 120, 200]);
    const k = rng.int(2, 7);
    const s2 = rng.pick([1.5, 2, 2.5, 3, 4, 0.8, 1.2]);
    const ssr = Math.round(s2 * (n - k) * 10) / 10;
    const r = ssr / (n - k);
    return build(rng, {
      skill: 'sigma-hat',
      stem: `A regression has $n=${n}$ observations and estimates $k=${k}$ coefficients, including the intercept. If $e'e=${g(ssr)}$, what is $\\hat\\sigma^2$?`,
      correct: f(r, 3),
      distractors: [f(ssr / n, 3), f(ssr / (n - k - 1), 3), f(ssr / k, 3), f(ssr / (n - 1), 3)],
      steps: [`$n-k=${n}-${k}=${n - k}$`, `$\\hat\\sigma^2=${g(ssr)}/${n - k}=${f(r, 3)}$`],
      explanation: 'Divide the residual sum of squares by the degrees of freedom n − k.',
    });
  },

  'coef-se': (rng) => {
    const s2 = rng.pick([1, 2, 4, 9, 0.25, 0.5, 16]);
    const d1 = rng.pick([0.25, 0.36, 0.09, 0.16, 0.5]);
    const d2 = rng.pick([0.04, 0.16, 0.25, 0.09, 0.01, 0.36]);
    const off = rng.pick([0.05, 0.02, -0.03, 0.01]);
    if (d1 === d2) throw new Retry();
    const which = rng.pick([1, 2]);
    const d = which === 1 ? d1 : d2;
    const other = which === 1 ? d2 : d1;
    const v = s2 * d;
    const askSE = rng.chance(0.5);
    const ord = which === 1 ? 'first' : 'second';
    const stem = `Suppose $$\\hat\\sigma^2=${g(s2)},\\qquad (X'X)^{-1}=${bm([[d1, off], [off, d2]])}.$$ What is the estimated ${askSE ? 'standard error' : 'variance'} of the ${ord} coefficient?`;
    const steps = [`${ord === 'first' ? 'First' : 'Second'} diagonal element = ${g(d)}.`, `$\\widehat{\\text{Var}}=${g(s2)}\\times${g(d)}=${g(v)}$`];
    if (askSE) steps.push(`$se=\\sqrt{${g(v)}}=${f(Math.sqrt(v), 4)}$`);
    return build(rng, {
      skill: 'coef-se',
      stem,
      correct: askSE ? f(Math.sqrt(v), 4) : f(v, 4),
      distractors: askSE
        ? [f(v, 4), f(Math.sqrt(d), 4), f(d, 4), f(Math.sqrt(s2 * other), 4), f(Math.sqrt(Math.abs(s2 * off)), 4)]
        : [f(d, 4), f(Math.sqrt(v), 4), f(s2 * Math.abs(off), 4), f(s2 * other, 4)],
      steps,
      explanation: 'Use the diagonal element for that coefficient, multiply by σ̂², and take the square root for the SE.',
    });
  },

  't-stat': (rng) => {
    const se = rng.pick([0.02, 0.04, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.5]);
    const t = rng.float(0.5, 12, 2) * (rng.chance(0.2) ? -1 : 1);
    const b = Math.round(t * se * 100) / 100;
    if (b === 0) throw new Retry();
    const tt = b / se;
    return build(rng, {
      skill: 't-stat',
      stem: `An estimated slope is ${g(b)} and its standard error is ${g(se)}. What is the $t$ statistic for testing $H_0:\\beta=0$?`,
      correct: f(tt, 2),
      distractors: [f(se / b, 2), f(b - se, 2), f(b * se * 100, 2), f(tt / 2, 2), f(-tt, 2)],
      steps: [`$t=\\hat\\beta/se=${g(b)}/${g(se)}=${f(tt, 2)}$`],
      explanation: 'Coefficient divided by its standard error.',
    });
  },

  'p-decision': (rng) => {
    const alpha = rng.pick([0.01, 0.05, 0.1]);
    let p = rng.pick([0.001, 0.003, 0.012, 0.018, 0.034, 0.047, 0.062, 0.088, 0.134, 0.21, 0.45]);
    if (p === alpha) p += 0.002;
    const reject = p < alpha;
    const pct = `${Math.round(alpha * 100)}%`;
    return build(rng, {
      skill: 'p-decision',
      stem: `For a two-sided test at the ${pct} significance level, the reported $p$-value for a coefficient is ${g(p)}. What is the correct decision?`,
      correct: reject ? `Reject $H_0$; the coefficient is statistically significant because $p<${g(alpha)}$.` : `Do not reject $H_0$; the coefficient is not statistically significant because $p>${g(alpha)}$.`,
      distractors: [
        reject ? `Do not reject $H_0$ because $p<${g(alpha)}$.` : `Reject $H_0$ because $p>${g(alpha)}$.`,
        'Reject $H_0$ only if the coefficient is negative.',
        'No decision can be made from the p-value.',
        reject ? 'The true coefficient is exactly equal to zero.' : 'The true coefficient is exactly equal to zero.',
      ],
      steps: [`Compare p = ${g(p)} with α = ${g(alpha)}.`, reject ? 'p < α → reject H₀.' : 'p > α → do not reject H₀.'],
      explanation: 'Reject when p is smaller than α. The sign of the estimate is irrelevant; "not significant" does not mean "equal to zero".',
    });
  },

  // ---------------- Week 4 ----------------
  dags: (rng) => {
    const ctx = rng.pick([
      { X: 'Education', Y: 'Wage', C: 'Ability', M: 'Job type', K: 'Hired' },
      { X: 'Smoking', Y: 'Birth weight', C: 'Income', M: 'Placenta health', K: 'Hospital admission' },
      { X: 'Class size', Y: 'Test score', C: 'School funding', M: 'Teacher attention', K: 'Selected school' },
      { X: 'Exercise', Y: 'Health', C: 'Age', M: 'Body weight', K: 'Gym membership' },
    ]);
    const role = rng.pick(['confounder', 'mediator', 'collider'] as const);
    const v = role === 'confounder' ? ctx.C : role === 'mediator' ? ctx.M : ctx.K;
    const diag = {
      confounder: `$\\text{${ctx.X}}\\leftarrow \\text{${v}}\\rightarrow \\text{${ctx.Y}}$`,
      mediator: `$\\text{${ctx.X}}\\rightarrow \\text{${v}}\\rightarrow \\text{${ctx.Y}}$`,
      collider: `$\\text{${ctx.X}}\\rightarrow \\text{${v}}\\leftarrow \\text{${ctx.Y}}$`,
      reverse: `$\\text{${ctx.X}}\\leftarrow \\text{${v}}\\leftarrow \\text{${ctx.Y}}$`,
    };
    if (rng.chance(0.5)) {
      return build(rng, {
        skill: 'dags',
        stem: `We study the effect of ${ctx.X.toLowerCase()} ($X$) on ${ctx.Y.toLowerCase()} ($Y$). Which diagram shows **${v}** as a **${role}**?`,
        correct: diag[role],
        distractors: (['confounder', 'mediator', 'collider', 'reverse'] as const).filter((k) => k !== role).map((k) => diag[k]),
        steps: ['Confounder: arrows out of it into both X and Y.', 'Mediator: X → M → Y.', 'Collider: arrows from both X and Y into it.'],
        explanation: `A ${role} has the pattern ${diag[role]}.`,
      });
    }
    const advice = {
      confounder: `Control for ${v}: it opens a non-causal back-door path that must be blocked.`,
      mediator: `Do not control for ${v} if you want the total effect: it lies on the causal path.`,
      collider: `Do not control for ${v}: conditioning on a collider creates a spurious association.`,
    };
    const wrong = [
      `Control for ${v}: every available variable should be included.`,
      `Control for ${v} because it guarantees a causal estimate.`,
      `Use ${v} as the dependent variable instead.`,
    ];
    return build(rng, {
      skill: 'dags',
      stem: `The causal diagram is ${diag[role]}. You want the **total causal effect** of ${ctx.X.toLowerCase()} on ${ctx.Y.toLowerCase()}. What should you do with ${v}?`,
      correct: advice[role],
      distractors: [...(['confounder', 'mediator', 'collider'] as const).filter((k) => k !== role).map((k) => advice[k]), ...wrong],
      steps: [`Identify the role: ${v} is a ${role}.`, role === 'confounder' ? 'Confounders are controlled.' : `${role[0].toUpperCase() + role.slice(1)}s are not controlled (for the total effect).`],
      explanation: advice[role],
    });
  },

  'total-effect': (rng) => {
    const a = rng.pick([0.2, 0.4, 0.5, 0.8, 1.5, 2]);
    const b = rng.pick([0.5, 1, 1.5, 2, 3]);
    const c = rng.pick([0.5, 1, 1.2, 2, -0.5]);
    const tot = c + a * b;
    return build(rng, {
      skill: 'total-effect',
      stem: `Suppose $$X\\to M \\text{ has effect } ${g(a)},\\qquad M\\to Y \\text{ has effect } ${g(b)},$$ and the direct effect $X\\to Y$ is ${g(c)}. What is the total effect of $X$ on $Y$?`,
      correct: f(tot, 2),
      distractors: [f(c, 2), f(a * b, 2), f(a + b + c, 2), f(c * a * b, 2), f(c + a + b * 0, 2)],
      steps: [`Indirect = ${g(a)} × ${g(b)} = ${g(a * b)}.`, `Total = ${g(c)} + ${g(a * b)} = ${g(tot)}.`],
      explanation: 'Multiply along the mediated path, then add the direct effect.',
    });
  },

  r2: (rng) => {
    const tss = rng.pick([200, 400, 500, 800, 868, 1000, 1200, 2500]);
    const rss = Math.round(tss * rng.float(0.15, 0.9, 2));
    if (rss === tss / 2) throw new Retry();
    const r2 = 1 - rss / tss;
    const useEss = rng.chance(0.25);
    const stem = useEss
      ? `A regression with a constant has $$TSS=${tss},\\qquad ESS=${tss - rss}.$$ What is $R^2$?`
      : `A regression has $$TSS=${tss},\\qquad RSS=${rss}$$ (RSS = residual sum of squares). What is $R^2$?`;
    return build(rng, {
      skill: 'r2',
      stem,
      correct: f(r2, 2),
      distractors: [f(rss / tss, 2), f(tss / rss, 2), f((tss - rss) / rss, 2), f(1 + rss / tss, 2)],
      steps: useEss ? [`$R^2=ESS/TSS=${tss - rss}/${tss}=${f(r2, 4)}$`] : [`$RSS/TSS=${rss}/${tss}=${f(rss / tss, 4)}$`, `$R^2=1-${f(rss / tss, 4)}=${f(r2, 4)}$`],
      explanation: 'R² = 1 − RSS/TSS = ESS/TSS, always between 0 and 1.',
    });
  },

  'adj-r2': (rng) => {
    const n = rng.pick([30, 50, 60, 100, 120, 200]);
    const k = rng.int(2, 8);
    const tss = rng.pick([400, 500, 800, 1000]);
    const rss = Math.round(tss * rng.float(0.3, 0.8, 2));
    const ratio = rss / (n - k) / (tss / (n - 1));
    const adj = 1 - ratio;
    return build(rng, {
      skill: 'adj-r2',
      stem: `A model has $n=${n}$, $k=${k}$ estimated coefficients including the constant, $RSS=${rss}$, and $TSS=${tss}$. Using $$\\bar R^2=1-\\frac{RSS/(n-k)}{TSS/(n-1)},$$ what is the adjusted $R^2$ approximately?`,
      correct: f(adj, 3),
      distractors: [f(1 - rss / tss, 3), f(ratio, 3), f(1 - rss / n / (tss / (n - 1)), 3), f(1 - rss / (n - k) / (tss / n), 3)],
      steps: [`$RSS/(n-k)=${rss}/${n - k}=${f(rss / (n - k), 4)}$`, `$TSS/(n-1)=${tss}/${n - 1}=${f(tss / (n - 1), 4)}$`, `Ratio $=${f(ratio, 4)}$, so $\\bar R^2=1-${f(ratio, 4)}=${f(adj, 4)}$`],
      explanation: 'Adjusted R² is slightly below the ordinary R² (here ' + f(1 - rss / tss, 3) + ').',
    });
  },

  'overall-f': (rng) => {
    const n = rng.pick([50, 80, 100, 120, 200, 526]);
    const k = rng.int(3, 7);
    const r2 = rng.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.45, 0.6]);
    const F = r2 / (k - 1) / ((1 - r2) / (n - k));
    if (rng.chance(0.3)) {
      return build(rng, {
        skill: 'overall-f',
        stem: `What is the null hypothesis in the **overall $F$ test** for a model with ${k - 1} slope coefficients?`,
        correct: `$H_0:${Array.from({ length: k - 1 }, (_, i) => `\\beta_${i + 1}`).join('=')}=0$`,
        distractors: [`$H_0:${Array.from({ length: k - 1 }, (_, i) => `\\beta_${i + 1}`).join('=')}=1$`, '$H_0:R^2=1$', '$H_0:\\beta_0=0$ only'],
        steps: ['All slopes jointly zero; the intercept is not tested.'],
        explanation: 'The overall F test asks whether the regressors jointly explain anything.',
      });
    }
    return build(rng, {
      skill: 'overall-f',
      stem: `Suppose $n=${n}$, $k=${k}$ including the constant, and $R^2=${g(r2)}$. Using $$F=\\frac{R^2/(k-1)}{(1-R^2)/(n-k)},$$ what is the overall $F$ statistic approximately?`,
      correct: f(F, 2),
      distractors: [f(r2 / ((1 - r2) / (n - k)), 2), f(r2 / k / ((1 - r2) / (n - k)), 2), f(r2 / (k - 1) / ((1 - r2) / (n - 1)), 2), f(r2 / (k - 1) / (r2 / (n - k)), 2)],
      steps: [`Numerator: $${g(r2)}/${k - 1}=${f(r2 / (k - 1), 4)}$`, `Denominator: $${g(1 - r2)}/${n - k}=${f((1 - r2) / (n - k), 5)}$`, `$F=${f(F, 2)}$`],
      explanation: 'Numerator df = number of slopes (k − 1); denominator df = n − k.',
    });
  },

  'partial-f': (rng) => {
    const kind = rng.pick(['compute', 'compute', 'decide', 'q'] as const);
    if (kind === 'q') {
      const idx = rng.sample([1, 2, 3, 4, 5, 6], rng.int(2, 4)).sort();
      const q = idx.length;
      return build(rng, {
        skill: 'partial-f',
        stem: `Suppose the null hypothesis is $$H_0:${idx.map((i) => `\\beta_${i}`).join('=')}=0.$$ What is the number of restrictions $q$?`,
        correct: String(q),
        distractors: [String(q - 1), String(q + 1), String(idx[idx.length - 1]), String(q + 2)],
        steps: [`Count the coefficients set to zero: ${idx.map((i) => `β${i}`).join(', ')} → q = ${q}.`],
        explanation: 'q = number of "= 0" statements, not the largest index.',
      });
    }
    const n = rng.pick([60, 100, 120, 200, 526]);
    const kur = rng.int(4, 8);
    const q = rng.int(2, Math.min(4, kur - 1));
    if (kind === 'decide') {
      const crit = fCritical(0.05, q, n - kur);
      const F = rng.chance(0.5) ? rng.float(crit + 0.5, 40, 2) : rng.float(0.1, crit - 0.3, 2);
      const reject = F > crit;
      return build(rng, {
        skill: 'partial-f',
        stem: `A partial $F$ test of ${q} restrictions gives $F=${g(F)}$, while the 5% critical value is ${f(crit, 2)}. What should we conclude?`,
        correct: reject ? 'Reject $H_0$; the tested coefficients are jointly statistically significant.' : 'Do not reject $H_0$; the tested coefficients are not jointly significant at 5%.',
        distractors: [
          reject ? 'Do not reject $H_0$ because the critical value is positive.' : 'Reject $H_0$; the tested coefficients are jointly statistically significant.',
          'Reject $H_0$ only if every tested coefficient is individually significant.',
          'The test cannot be interpreted without knowing $R^2$ exactly.',
        ],
        steps: [`Compare F = ${g(F)} with the critical value ${f(crit, 2)}.`, reject ? 'F > critical → reject.' : 'F < critical → do not reject.'],
        explanation: 'Reject the joint null when F exceeds the critical value.',
      });
    }
    const r2ur = rng.float(0.2, 0.7, 2);
    const r2r = Math.round((r2ur - rng.float(0.02, 0.12, 2)) * 100) / 100;
    if (r2r <= 0) throw new Retry();
    const F = (r2ur - r2r) / q / ((1 - r2ur) / (n - kur));
    return build(rng, {
      skill: 'partial-f',
      stem: `An unrestricted model has $R^2_{ur}=${g(r2ur)}$, a restricted model has $R^2_r=${g(r2r)}$, $n=${n}$, $k_{ur}=${kur}$, and $q=${q}$. Using $$F=\\frac{(R^2_{ur}-R^2_r)/q}{(1-R^2_{ur})/(n-k_{ur})},$$ what is the partial $F$ statistic approximately?`,
      correct: f(F, 2),
      distractors: [f(F * q, 2), f((r2ur - r2r) / q / ((1 - r2r) / (n - kur)), 2), f((r2ur - r2r) / q / ((1 - r2ur) / n), 2), f(F / q, 2)],
      steps: [`Numerator: $(${g(r2ur)}-${g(r2r)})/${q}=${f((r2ur - r2r) / q, 4)}$`, `Denominator: $(1-${g(r2ur)})/(${n}-${kur})=${f((1 - r2ur) / (n - kur), 5)}$`, `$F=${f(F, 2)}$`],
      explanation: 'Divide the R² gain by q, and use the unrestricted R² in the denominator.',
    });
  },

  // ---------------- Week 5 ----------------
  dummies: (rng) => {
    if (rng.chance(0.5)) {
      const G = rng.int(2, 7);
      const intercept = rng.chance(0.75);
      return build(rng, {
        skill: 'dummies',
        stem: `A categorical variable has ${G} mutually exclusive categories. If the regression ${intercept ? 'includes' : 'does NOT include'} an intercept, how many category dummies can be included without perfect multicollinearity?`,
        correct: String(intercept ? G - 1 : G),
        distractors: [String(intercept ? G : G - 1), String(G + 1), String(intercept ? G - 2 : G - 2 > 0 ? G - 2 : G + 2), String(1)],
        steps: [intercept ? `With an intercept: G − 1 = ${G - 1} (the omitted category is the benchmark).` : `Without an intercept all ${G} dummies can be included; each coefficient is a category mean.`],
        explanation: 'The dummies always sum to 1, which duplicates the intercept column if all G are included with a constant.',
      });
    }
    const binary = rng.pick(['Whether a household owns a car', 'Whether it rained on a particular day', 'Whether a firm exported any output during the year', 'Whether a student passed the exam', 'Whether a worker is a union member']);
    const nonbin = rng.sample(['Annual rainfall in mm', 'Number of employees', 'Share of output sold abroad', 'Household income', 'Hours studied per week', 'Percentage humidity', 'Value of the firm\'s exports'], 3);
    return build(rng, {
      skill: 'dummies',
      stem: 'Which variable is naturally represented by a binary (dummy) variable?',
      correct: binary,
      distractors: nonbin,
      steps: ['"Whether …" describes a yes/no characteristic → 0/1.'],
      explanation: 'Amounts, counts and shares take many values, so they are not binary.',
    });
  },

  benchmark: (rng) => {
    const ctx = rng.pick([
      { y: 'savings', d: 'edu', one: 'educated people', zero: 'uneducated people', c: 'inc', hi: 'Individuals with high income', lo: 'Individuals with low income' },
      { y: 'sales', d: 'urban', one: 'firms located in a city', zero: 'firms not located in a city', c: 'advert', hi: 'Firms with high advertising expenditure', lo: 'Firms with low advertising expenditure' },
      { y: 'wage', d: 'female', one: 'women', zero: 'men', c: 'educ', hi: 'Workers with many years of education', lo: 'Workers with few years of education' },
      { y: 'price', d: 'pool', one: 'houses with a pool', zero: 'houses without a pool', c: 'sqft', hi: 'Large houses', lo: 'Small houses' },
      { y: 'score', d: 'tutor', one: 'students who had a tutor', zero: 'students without a tutor', c: 'hours', hi: 'Students who study many hours', lo: 'Students who study few hours' },
    ]);
    const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
    return build(rng, {
      skill: 'benchmark',
      stem: `Consider $$${ctx.y}=\\beta_0+\\delta_1${ctx.d}+\\beta_2${ctx.c}+u,$$ where $${ctx.d}=1$ for ${ctx.one} and $${ctx.d}=0$ otherwise. What is the benchmark group?`,
      correct: cap(ctx.zero),
      distractors: [cap(ctx.one), ctx.hi, ctx.lo],
      steps: [`The benchmark is the group with ${ctx.d} = 0: ${ctx.zero}.`, `δ₁ = difference between ${ctx.one} and ${ctx.zero}, holding ${ctx.c} fixed.`],
      explanation: `${ctx.c} is continuous, so it does not define a benchmark group.`,
    });
  },

  'dummy-interaction': (rng) => {
    const b = [rng.int(5, 30), rng.intNZ(-6, 6), rng.intNZ(-6, 6), rng.intNZ(-5, 5)];
    const d1 = rng.int(0, 1);
    const d2 = rng.int(0, 1);
    const cell = (x: number, y: number) => b[0] + b[1] * x + b[2] * y + b[3] * x * y;
    const val = cell(d1, d2);
    const others = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(([x, y]) => !(x === d1 && y === d2)).map(([x, y]) => g(cell(x, y)));
    return build(rng, {
      skill: 'dummy-interaction',
      stem: `The estimated model is $$\\hat Y=${b[0]}${sgn(b[1])}D_1${sgn(b[2])}D_2${sgn(b[3])}(D_1D_2).$$ What is the predicted value of $Y$ when $D_1=${d1}$ and $D_2=${d2}$?`,
      correct: g(val),
      distractors: [...others, g(b[0] + b[1] * d1 + b[2] * d2)],
      steps: [`Substitute: $${b[0]}+(${b[1]})(${d1})+(${b[2]})(${d2})+(${b[3]})(${d1}\\cdot${d2})=${m(val)}$`],
      explanation: `The interaction D₁D₂ equals ${d1 * d2} here${d1 * d2 ? ', so β₃ is added' : ', so β₃ drops out'}.`,
    });
  },

  did: (rng) => {
    if (rng.chance(0.5)) {
      const before = -rng.int(5, 30) * 1000 + rng.int(0, 999);
      const after = before + rng.intNZ(-20, 20) * 1000 + rng.int(-500, 500);
      const did = after - before;
      return build(rng, {
        skill: 'did',
        stem: `Before a policy, the treatment–control difference in average house prices is ${fmtK(before)}. After the policy, it is ${fmtK(after)}. What is the Difference-in-Differences estimate?`,
        correct: fmtK(did),
        distractors: [fmtK(-did), fmtK(after + before), fmtK(-(after + before)), fmtK(after)],
        steps: [`DiD = gap after − gap before = ${fmtK(after)} − (${fmtK(before)}) = ${fmtK(did)}`],
        explanation: 'Subtract the pre-policy gap from the post-policy gap; be careful with negative numbers.',
      });
    }
    const tb = rng.int(40, 90);
    const ta = tb + rng.int(-10, 25);
    const cb = rng.int(40, 90);
    const ca = cb + rng.int(-10, 15);
    const did = ta - tb - (ca - cb);
    if (did === 0) throw new Retry();
    return build(rng, {
      skill: 'did',
      stem: 'Average outcomes for the treatment and control groups are shown below. What is the Difference-in-Differences estimate of the treatment effect?',
      table: { headers: ['', 'Before', 'After'], rows: [['Treatment', String(tb), String(ta)], ['Control', String(cb), String(ca)]] },
      correct: g(did),
      distractors: [g(ta - tb), g(ta - ca), g(-did), g(ta - tb + (ca - cb))],
      steps: [`Change treated: ${ta} − ${tb} = ${ta - tb}.`, `Change control: ${ca} − ${cb} = ${ca - cb}.`, `DiD = ${ta - tb} − (${ca - cb}) = ${did}.`],
      explanation: 'DiD removes the common trend (the control group\'s change) from the treated group\'s change.',
    });
  },

  'dummy-cont-interaction': (rng) => {
    const b0 = rng.int(1, 20);
    const b1 = rng.float(0.2, 3, 2);
    const b2 = rng.float(-5, 5, 1);
    const b3 = rng.float(-1.5, 1.5, 2);
    if (b3 === 0 || b2 === 0) throw new Retry();
    const askSlope = rng.chance(0.65);
    const grp = rng.int(0, 1);
    const stem = `The estimated model is $$\\hat Y=${b0}+${m(b1)}X${sgn(b2)}D${sgn(b3)}(X\\cdot D).$$ What is the ${askSlope ? 'slope with respect to $X$' : 'intercept'} for the group $D=${grp}$?`;
    const slope = grp ? b1 + b3 : b1;
    const icpt = grp ? b0 + b2 : b0;
    return build(rng, {
      skill: 'dummy-cont-interaction',
      stem,
      correct: g(askSlope ? slope : icpt),
      distractors: askSlope ? [g(grp ? b1 : b1 + b3), g(b3), g(b1 + b2), g(b2 + b3)] : [g(grp ? b0 : b0 + b2), g(b2), g(b0 + b3), g(b0 + b1)],
      steps: grp
        ? [`For D = 1: $\\hat Y=(${b0}${sgn(b2)})+(${m(b1)}${sgn(b3)})X=${m(b0 + b2)}+${m(b1 + b3)}X$`]
        : [`For D = 0 the D terms vanish: $\\hat Y=${b0}+${m(b1)}X$`],
      explanation: 'For D = 1 collect everything multiplying X (β₁ + β₃) for the slope, and the constants (β₀ + β₂) for the intercept.',
    });
  },

  rdd: (rng) => {
    const b0 = rng.float(50, 100, 2);
    const b1 = rng.float(-2, 2, 2);
    const b2 = rng.float(2, 12, 2);
    const ask = rng.pick(['jump', 'above'] as const);
    const c = rng.pick([18, 21, 65, 50]);
    const stem = `A sharp RDD with cutoff ${c} is estimated with $R=W-${c}$ (so $R=0$ at the cutoff) and $D=1$ if $W\\ge ${c}$: $$\\hat V=${m(b0)}${sgn(b1)}R${sgn(b2)}D.$$ ${ask === 'jump' ? 'What is the estimated discontinuity (jump) in the outcome at the cutoff?' : 'What is the predicted outcome just above the cutoff (R = 0, D = 1)?'}`;
    const correct = ask === 'jump' ? b2 : b0 + b2;
    return build(rng, {
      skill: 'rdd',
      stem,
      correct: f(correct, 2),
      distractors: ask === 'jump' ? [f(b1, 2), f(b0 + b2, 2), f(b0, 2)] : [f(b0, 2), f(b2, 2), f(b0 + b1 + b2, 2)],
      steps: [`At R = 0: below the cutoff $\\hat V=${m(b0)}$; above $\\hat V=${m(b0)}+${m(b2)}=${m(b0 + b2)}$.`, `Jump = ${g(b2)}.`],
      explanation: 'The coefficient on the treatment dummy is the discontinuity at the (centred) cutoff.',
    });
  },

  rescaling: (rng) => {
    const kind = rng.pick(['y', 'x', 'unit', 'se'] as const);
    const b = rng.float(0.1, 2.5, 3);
    if (kind === 'y') {
      const { lam, what } = rng.pick([
        { lam: 40, what: 'weekly wage equals 40 times hourly wage' },
        { lam: 52, what: 'annual earnings equal 52 times weekly earnings' },
        { lam: 100, what: 'the outcome is converted from dollars to cents' },
        { lam: 1000, what: 'the outcome is converted from thousands of dollars to dollars' },
        { lam: 12, what: 'annual income equals 12 times monthly income' },
      ]);
      return build(rng, {
        skill: 'rescaling',
        stem: `Suppose the estimated slope on $X$ is ${g(b)}. If the dependent variable is rescaled because ${what}, what is the new slope?`,
        correct: g(b * lam),
        distractors: [g(b / lam), g(b), g(b * lam * 10), g(b * Math.sqrt(lam))],
        steps: [`Y* = ${lam}Y → every coefficient × ${lam}: ${g(b)} × ${lam} = ${g(b * lam)}.`],
        explanation: 'Rescaling Y multiplies all coefficients (and SEs) by the same factor; t statistics are unchanged.',
      });
    }
    if (kind === 'x') {
      const lam = rng.pick([10, 100, 1000]);
      return build(rng, {
        skill: 'rescaling',
        stem: `Suppose the estimated slope on $X$ is ${g(b)}. The regressor is rescaled as $X^*=${lam}X$. What is the slope on $X^*$?`,
        correct: g(b / lam),
        distractors: [g(b * lam), g(b), g(b / (lam * 10)), g(b * lam * lam)],
        steps: [`$\\beta X=\\beta(X^*/${lam})=(\\beta/${lam})X^*$ → ${g(b)}/${lam} = ${g(b / lam)}.`],
        explanation: 'Multiplying a regressor by λ divides its coefficient by λ.',
      });
    }
    if (kind === 'unit') {
      const u = rng.pick([
        { from: 'years', to: 'decades', k: 10 },
        { from: 'dollars', to: 'thousands of dollars', k: 1000 },
        { from: 'months', to: 'years', k: 12 },
        { from: 'grams', to: 'kilograms', k: 1000 },
      ]);
      return build(rng, {
        skill: 'rescaling',
        stem: `In a regression, the slope on $X$ is ${g(b)} when $X$ is measured in ${u.from}. If $X$ is instead measured in ${u.to} (1 ${u.to.replace(/^thousands of /, 'thousand ').replace(/s$/, '')} = ${u.k} ${u.from}), what is the new slope?`,
        correct: g(b * u.k),
        distractors: [g(b / u.k), g(b), g(b * u.k * 10), g(b * u.k / 100)],
        steps: [`One new unit = ${u.k} old units, so a one-unit increase in the new measure is ${u.k} old-unit increases.`, `${g(b)} × ${u.k} = ${g(b * u.k)}.`],
        explanation: 'Bigger units for X → bigger coefficient (X* = X/k means λ = 1/k, so the slope is multiplied by k).',
      });
    }
    const lam = rng.pick([10, 40, 100]);
    const se = rng.float(0.01, 0.3, 3);
    return build(rng, {
      skill: 'rescaling',
      stem: `A slope is ${g(b)} with standard error ${g(se)}. The dependent variable is multiplied by ${lam}. Which statement is correct?`,
      correct: `The slope becomes ${g(b * lam)}, the SE becomes ${g(se * lam)}, and the t statistic is unchanged.`,
      distractors: [`The slope becomes ${g(b * lam)} but the SE stays ${g(se)}.`, `Both become ${lam} times smaller.`, `The t statistic becomes ${lam} times larger.`],
      steps: [`Both scale by ${lam}; t = (${lam}·${g(b)})/(${lam}·${g(se)}) = ${f(b / se, 2)} unchanged.`],
      explanation: 'Rescaling Y multiplies coefficients and SEs by the same factor, so t, p and R² are unchanged.',
    });
  },

  'functional-forms': (rng) => {
    const kind = rng.pick(['loglevel', 'exact', 'levellog', 'loglog', 'levellevel'] as const);
    const b = rng.pick({
      loglevel: [0.08, 0.05, 0.12, 0.0828, -0.04, 0.3, -0.00403],
      exact: [0.05, 0.1, 0.2, 0.3, 0.5, -0.1, -0.2],
      levellog: [5, 2, 15, 0.6, 40, -3],
      loglog: [0.63, 0.527, 0.3, 1.2, -0.4, 0.85],
      levellevel: [0.54, 2, 5, 0.08, -0.51, 1.5],
    }[kind]);
    const X = 'X';
    const Y = 'Y';
    const spec = {
      loglevel: `\\ln(Y)=\\beta_0+${m(b)}X+u`,
      exact: `\\ln(Y)=\\beta_0+${m(b)}X+u`,
      levellog: `Y=\\beta_0+${m(b)}\\ln(X)+u`,
      loglog: `\\ln(Y)=\\beta_0+${m(b)}\\ln(X)+u`,
      levellevel: `Y=\\beta_0+${m(b)}X+u`,
    }[kind];
    const dir = (v: number) => (v >= 0 ? 'increase' : 'decrease');
    const pct = (v: number, dp = 2) => `${g(Math.abs(v), dp)}%`;
    const one = `a one-unit increase in $${X}$`;
    const onep = `a 1% increase in $${X}$`;
    const opt = {
      ll100: `${cap(one)} is associated with approximately a ${pct(100 * b)} ${dir(b)} in $${Y}$.`,
      llraw: `${cap(one)} is associated with approximately a ${pct(b, 3)} ${dir(b)} in $${Y}$.`,
      exact: `${cap(one)} is associated with a ${pct(100 * (Math.exp(b) - 1), 2)} ${dir(b)} in $${Y}$.`,
      lvlog: `${cap(onep)} is associated with approximately a ${g(Math.abs(b / 100), 5)}-unit ${dir(b)} in $${Y}$.`,
      lvlogBig: `${cap(onep)} is associated with approximately a ${g(Math.abs(b), 4)}-unit ${dir(b)} in $${Y}$.`,
      elas: `${cap(onep)} is associated with approximately a ${pct(b, 3)} ${dir(b)} in $${Y}$.`,
      elas100: `${cap(onep)} is associated with approximately a ${pct(100 * b)} ${dir(b)} in $${Y}$.`,
      level: `${cap(one)} is associated with a ${g(Math.abs(b), 4)}-unit ${dir(b)} in $${Y}$.`,
    };
    const map = {
      loglevel: { c: opt.ll100, d: [opt.llraw, opt.level, opt.elas100, opt.elas] },
      exact: { c: opt.exact, d: [opt.ll100, opt.llraw, opt.level] },
      levellog: { c: opt.lvlog, d: [opt.lvlogBig, opt.elas, opt.level, opt.ll100] },
      loglog: { c: opt.elas, d: [opt.level, opt.elas100, opt.lvlog, opt.ll100] },
      levellevel: { c: opt.level, d: [opt.ll100, opt.elas, opt.lvlog] },
    }[kind];
    const steps = {
      loglevel: [`Log–level: %ΔY ≈ 100·β·ΔX = 100 × ${g(b)} = ${g(100 * b)}%.`],
      exact: [`Exact: %ΔY = 100(e^{β} − 1) = 100(e^{${g(b)}} − 1) = ${f(100 * (Math.exp(b) - 1), 2)}%.`, `(The approximation would give ${g(100 * b)}%.)`],
      levellog: [`Level–log: ΔY ≈ (β/100)·%ΔX = ${g(b)}/100 = ${g(b / 100, 5)} units per 1%.`],
      loglog: [`Log–log: β is an elasticity → ${g(b)}% change in Y per 1% change in X.`],
      levellevel: ['Level–level: ΔY = β·ΔX.'],
    }[kind];
    return build(rng, {
      skill: 'functional-forms',
      stem: `Consider $$${spec}.$$ ${kind === 'exact' ? 'Using the EXACT formula, which' : 'Which'} interpretation of the coefficient is correct?`,
      correct: map.c,
      distractors: map.d,
      steps,
      explanation: 'Where is the log? Log on Y → percentage change in Y. Log on X → think of a 1% change in X.',
    });
  },

  standardization: (rng) => {
    const b = rng.float(0.2, 3, 2) * (rng.chance(0.25) ? -1 : 1);
    const sx = rng.float(1, 6, 1);
    const sy = rng.float(2, 15, 1);
    const phi = (b * sx) / sy;
    if (rng.chance(0.4)) {
      const c = rng.float(0.1, 0.9, 2);
      return build(rng, {
        skill: 'standardization',
        stem: `Both $Y$ and $X$ are standardized and the estimated slope on $z_X$ is ${g(c)}. A one-standard-deviation increase in $X$ is associated with`,
        correct: `a ${g(c)}-standard-deviation increase in $Y$.`,
        distractors: [`a ${g(c)}-unit increase in the original units of $Y$.`, `a ${g(c * 100)}% increase in $Y$.`, 'a one-standard-deviation increase in $Y$.'],
        steps: ['Both variables are in SD units → "SD per SD".'],
        explanation: 'Standardised coefficients are measured in standard deviations of Y per standard deviation of X.',
      });
    }
    return build(rng, {
      skill: 'standardization',
      stem: `In the original units, the OLS slope of $Y$ on $X$ is ${g(b)}. The sample standard deviations are $s_X=${g(sx)}$ and $s_Y=${g(sy)}$. What is the standardized (beta) coefficient?`,
      correct: f(phi, 3),
      distractors: [f((b * sy) / sx, 3), f(b, 3), f(b / sx, 3), f(b * sx, 3)],
      steps: [`$\\varphi=\\hat a\\,\\dfrac{s_X}{s_Y}=${m(b)}\\times\\dfrac{${g(sx)}}{${g(sy)}}=${f(phi, 3)}$`],
      explanation: 'Multiply by the SD of X and divide by the SD of Y.',
    });
  },
};

function sgn(v: number): string {
  return v < 0 ? `-${m(Math.abs(v))}` : `+${m(v)}`;
}

function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

function fmtK(v: number): string {
  const s = Math.abs(v).toLocaleString('en-US');
  return (v < 0 ? '−' : '') + s;
}
