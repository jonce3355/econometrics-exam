// Generators that create synthetic Stata output and ask the same kinds of
// questions as the Stata-based section of the bank.
import { fPValue, tCritical, tPValue } from '../../lib/distributions';
import type { Rng } from '../../lib/random';
import { Retry, build, f, type Gen } from './core';

interface Coef {
  name: string;
  b: number;
  se: number;
}

interface Reg {
  depvar: string;
  n: number;
  coefs: Coef[]; // excluding _cons
  cons: Coef;
  r2: number;
}

const pad = (s: string, w: number) => (s.length >= w ? s : ' '.repeat(w - s.length) + s);

/** Stata-like number: ".123" style for |x| < 1. */
function sn(x: number, sig = 7): string {
  if (x === 0) return '0';
  const a = Math.abs(x);
  let s = a >= 1000 ? x.toFixed(2) : x.toPrecision(sig);
  if (s.includes('e')) s = x.toFixed(6);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace(/^(-?)0\./, '$1.');
}

function stats(r: Reg) {
  const k = r.coefs.length;
  const df = r.n - k - 1;
  const rows = [...r.coefs, { ...r.cons, name: '_cons' }].map((c) => {
    const t = c.b / c.se;
    const p = tPValue(t, df);
    const tc = tCritical(0.05, df);
    return { ...c, t, p, lo: c.b - tc * c.se, hi: c.b + tc * c.se };
  });
  const F = r.r2 / k / ((1 - r.r2) / df);
  return { rows, df, k, F, Fp: fPValue(F, k, df), adj: 1 - ((1 - r.r2) * (r.n - 1)) / df };
}

export function regOutput(r: Reg, rng: Rng): string {
  const s = stats(r);
  const tss = rng.float(500, 20000, 2);
  const rss = tss * (1 - r.r2);
  const ess = tss - rss;
  const lines = [
    `      Source |       SS           df       MS      Number of obs   = ${pad(String(r.n), 9)}`,
    `-------------+----------------------------------   F(${s.k}, ${s.df})${' '.repeat(Math.max(1, 9 - String(s.k).length - String(s.df).length))}= ${pad(s.F.toFixed(2), 9)}`,
    `       Model | ${pad(ess.toFixed(2), 11)} ${pad(String(s.k), 9)} ${pad(sn(ess / s.k), 11)}   Prob > F        = ${pad(s.Fp.toFixed(4), 9)}`,
    `    Residual | ${pad(rss.toFixed(2), 11)} ${pad(String(s.df), 9)} ${pad(sn(rss / s.df), 11)}   R-squared       = ${pad(r.r2.toFixed(4), 9)}`,
    `-------------+----------------------------------   Adj R-squared   = ${pad(s.adj.toFixed(4), 9)}`,
    `       Total | ${pad(tss.toFixed(2), 11)} ${pad(String(r.n - 1), 9)} ${pad(sn(tss / (r.n - 1)), 11)}   Root MSE        = ${pad(Math.sqrt(rss / s.df).toPrecision(4), 9)}`,
    '',
    '-'.repeat(78),
    `${pad(r.depvar, 12)} | Coefficient  Std. err.      t    P>|t|     [95% conf. interval]`,
    '-------------+----------------------------------------------------------------',
    ...s.rows.map((c) => `${pad(c.name, 12)} | ${pad(sn(c.b), 10)} ${pad(sn(c.se), 10)} ${pad(c.t.toFixed(2), 8)}   ${c.p.toFixed(3)}    ${pad(sn(c.lo), 10)}  ${pad(sn(c.hi), 10)}`),
    '-'.repeat(78),
  ];
  return lines.join('\n');
}

function testOutput(names: string[], F: number, d1: number, d2: number): string {
  return ['', `. test ${names.join(' ')}`, '', ...names.map((n, i) => ` ( ${i + 1})  ${n} = 0`), '', `       F(${d1}, ${d2}) = ${pad(F.toFixed(2), 8)}`, `            Prob > F = ${pad(fPValue(F, d1, d2).toFixed(4), 8)}`].join('\n');
}

/** Random coefficient with a target |t| range. */
function coef(_rng: Rng, name: string, b: number, tAbs: number): Coef {
  const se = Math.abs(b) / tAbs;
  return { name, b, se: Number(se.toPrecision(4)) };
}

const CONTEXTS = [
  { file: 'WAGE1.DTA', y: 'wage', yUnit: 'dollars per hour', vars: [['educ', 'year of education'], ['exper', 'year of experience'], ['tenure', 'year with the current employer']] },
  { file: 'BWGHT.DTA', y: 'bwght', yUnit: 'ounces', vars: [['cigs', 'cigarette smoked per day'], ['faminc', 'thousand dollars of family income'], ['parity', 'additional birth order']] },
  { file: 'FoS.DTA', y: 'marks_FoS', yUnit: 'marks', vars: [['ent_math', 'entrance maths mark'], ['ent_ielts', 'IELTS band point'], ['attend', 'percentage point of attendance']] },
  { file: 'HPRICE.DTA', y: 'price', yUnit: 'thousand dollars', vars: [['sqrft', 'square foot'], ['bdrms', 'bedroom'], ['lotsize', 'square foot of lot']] },
];

function randomReg(rng: Rng, nv = 3, sigMix = true) {
  const ctx = rng.pick(CONTEXTS);
  const n = rng.pick([300, 526, 935, 1388, 450]);
  const vars = ctx.vars.slice(0, nv);
  const coefs = vars.map(([name]) => {
    const b = rng.float(-1.5, 2.5, 4) || 0.37;
    const tAbs = sigMix && rng.chance(0.35) ? rng.float(0.2, 1.7, 2) : rng.float(2.3, 12, 2);
    return coef(rng, name, b, tAbs);
  });
  const reg: Reg = { depvar: ctx.y, n, coefs, cons: coef(rng, '_cons', rng.float(-5, 120, 3), rng.float(1, 30, 2)), r2: rng.float(0.02, 0.5, 4) };
  return { ctx, reg, vars };
}

export const stataGens: Record<string, Gen> = {
  'st-summary': (rng) => {
    const g1 = { wage: rng.float(3, 8, 3), sdw: rng.float(1.5, 4.5, 3), educ: rng.float(11, 14, 3), sde: rng.float(2, 3.2, 3), n: rng.int(200, 300) };
    const g0 = { wage: rng.float(5, 10, 3), sdw: rng.float(1.5, 4.5, 3), educ: rng.float(11, 14, 3), sde: rng.float(2, 3.2, 3), n: rng.int(200, 300) };
    const block = (cond: string, gr: typeof g1) => [`. sum wage educ if ${cond}`, '', '    Variable |        Obs        Mean    Std. dev.       Min        Max', '-------------+---------------------------------------------------------', `        wage | ${pad(String(gr.n), 10)} ${pad(sn(gr.wage), 11)} ${pad(sn(gr.sdw), 11)} ${pad('.53', 10)} ${pad('24.98', 10)}`, `        educ | ${pad(String(gr.n), 10)} ${pad(sn(gr.educ), 11)} ${pad(sn(gr.sde), 11)} ${pad('0', 10)} ${pad('18', 10)}`].join('\n');
    const askMen = rng.chance(0.5);
    const askWage = rng.chance(0.7);
    const gr = askMen ? g0 : g1;
    const other = askMen ? g1 : g0;
    const val = askWage ? gr.wage : gr.educ;
    const fmt = (v: number) => (askWage ? `\\$${v.toFixed(2)}` : `${v.toFixed(2)} years`);
    return build(rng, {
      skill: 'st-summary',
      stem: `In WAGE1, \`female\`=1 denotes women and \`female\`=0 denotes men. Based on the Stata output, what is the average ${askWage ? 'hourly wage' : 'years of education'} for ${askMen ? 'men' : 'women'}?`,
      output: block('female==1', g1) + '\n\n' + block('female==0', g0),
      correct: fmt(val),
      distractors: [fmt(askWage ? other.wage : other.educ), fmt(askWage ? gr.sdw : gr.sde), fmt(askWage ? other.sdw : other.sde), fmt(askWage ? gr.educ : gr.wage)],
      steps: [`${askMen ? 'Men' : 'Women'} are female==${askMen ? 0 : 1}: use the ${askMen ? 'second' : 'first'} block.`, `Read the Mean column for ${askWage ? 'wage' : 'educ'}: ${sn(val)}.`],
      explanation: 'Check which group the "if" condition selects, then read the Mean (not Std. dev.).',
    });
  },

  'st-ttest': (rng) => {
    const m0 = rng.float(5, 9, 4);
    const m1 = rng.float(3, 7, 4);
    const n0 = rng.int(200, 300);
    const n1 = rng.int(200, 300);
    const sd0 = rng.float(2.5, 4.5, 4);
    const sd1 = rng.float(2, 3.5, 4);
    const sp = Math.sqrt(((n0 - 1) * sd0 ** 2 + (n1 - 1) * sd1 ** 2) / (n0 + n1 - 2));
    const se = sp * Math.sqrt(1 / n0 + 1 / n1);
    const diff = m0 - m1;
    const t = diff / se;
    if (Math.abs(t) < 1) throw new Retry();
    const row = (gname: string, n: number, mu: number, sd: number) => `${pad(gname, 8)} | ${pad(String(n), 7)} ${pad(sn(mu), 10)} ${pad(sn(sd / Math.sqrt(n)), 10)} ${pad(sn(sd), 10)}`;
    const out = ['Two-sample t test with equal variances', '-'.repeat(78), '   Group |     Obs        Mean    Std. err.   Std. dev.', '---------+---------------------------------------------', row('0', n0, m0, sd0), row('1', n1, m1, sd1), '---------+---------------------------------------------', `    diff |          ${pad(sn(diff), 10)} ${pad(sn(se), 10)}`, '-'.repeat(78), `    diff = mean(0) - mean(1)                                      t = ${pad(t.toFixed(4), 8)}`, `H0: diff = 0                                     Degrees of freedom = ${pad(String(n0 + n1 - 2), 8)}`, '', `                              Pr(|T| > |t|) = ${tPValue(t, n0 + n1 - 2).toFixed(4)}`].join('\n');
    return build(rng, {
      skill: 'st-ttest',
      stem: 'In WAGE1, `ttest wage, by(female)` gives the output below. What is the absolute value of the t statistic for the difference in mean wage between men and women?',
      output: out,
      correct: f(Math.abs(t), 2),
      distractors: [f(Math.abs(diff), 2), f(se, 2), f(Math.abs(t) / 2, 2), f(sd0, 2)],
      steps: [`Read "t =" : ${t.toFixed(4)} → |t| = ${f(Math.abs(t), 2)}.`, `Check: diff / SE = ${sn(diff)} / ${sn(se)} = ${f(t, 2)}.`],
      explanation: 'The difference in means and its standard error are inputs; the t statistic is their ratio.',
    });
  },

  'st-tstat': (rng) => {
    const { reg } = randomReg(rng, 3, false);
    const i = rng.int(0, 2);
    const c = reg.coefs[i];
    const t = c.b / c.se;
    const other = reg.coefs[(i + 1) % 3];
    return build(rng, {
      skill: 'st-tstat',
      stem: `Based on the Stata output, what is the t statistic for the coefficient on \`${c.name}\`?`,
      output: regOutput(reg, rng),
      correct: f(t, 2),
      distractors: [f(c.b, 4), f(c.se, 4), f(other.b / other.se, 2), f(-t, 2)],
      steps: [`Row ${c.name}: t = ${sn(c.b)} / ${sn(c.se)} = ${f(t, 2)}.`],
      explanation: 'The t column is coefficient ÷ standard error.',
    });
  },

  'st-loglevel': (rng) => {
    const dummy = rng.chance(0.4);
    const b = dummy ? rng.float(-0.35, 0.3, 4) : rng.float(-0.01, 0.12, 4);
    if (Math.abs(b) < 0.002) throw new Retry();
    const name = dummy ? rng.pick(['married', 'union', 'female', 'south']) : rng.pick(['educ', 'exper', 'cigs', 'tenure']);
    const reg: Reg = {
      depvar: 'lwage', n: 526,
      coefs: [coef(rng, name, b, rng.float(1.2, 12, 2)), coef(rng, 'exper', 0.0104, 4.6), coef(rng, 'expersq', -0.0002, 3.9)].filter((c, i, a) => a.findIndex((d) => d.name === c.name) === i),
      cons: coef(rng, '_cons', 0.39, 3.8), r2: rng.float(0.2, 0.45, 4),
    };
    const pct = 100 * b;
    const dir = pct >= 0 ? 'increase' : 'decrease';
    const what = dummy ? `difference in wage between ${name}=1 and ${name}=0 individuals` : `change in wage for one additional unit of \`${name}\``;
    const out = regOutput(reg, rng);
    const t = b / reg.coefs[0].se;
    return build(rng, {
      skill: 'st-loglevel',
      stem: `The dependent variable is \`lwage\` = ln(wage). Using the usual log–level approximation, what is the predicted percentage ${what}, holding the other regressors constant?`,
      output: out,
      correct: `${f(pct, 2)}% (${dir})`,
      distractors: [`${f(b, 4)}% (${dir})`, `${f(Math.abs(t), 2)}% (${dir})`, `${f(pct * 10, 2)}% (${dir})`, `${f(-pct, 2)}% (${pct >= 0 ? 'decrease' : 'increase'})`],
      steps: [`Coefficient on ${name} = ${sn(b)}.`, `100 × ${sn(b)} = ${f(pct, 2)}%.`],
      explanation: 'Log–level: multiply the coefficient by 100 (exact would be 100(e^b − 1)).',
    });
  },

  'st-interaction-signif': (rng) => {
    const sig = rng.chance(0.5);
    const b = rng.float(-0.05, 0.05, 4);
    if (Math.abs(b) < 0.003) throw new Retry();
    const tAbs = sig ? rng.float(2.4, 5, 2) : rng.float(0.05, 1.5, 2);
    const reg: Reg = {
      depvar: 'lwage', n: 526,
      coefs: [coef(rng, 'educ', 0.089, 9.8), coef(rng, 'female', 0.11, 0.57), coef(rng, 'fem_educ', b, tAbs)],
      cons: coef(rng, '_cons', 0.16, 1.2), r2: 0.42,
    };
    const more = b < 0 ? 'lower' : 'higher';
    return build(rng, {
      skill: 'st-interaction-signif',
      stem: '`fem_educ = female*educ`. Based on the coefficient and p-value for `fem_educ`, which statement about the returns to education is correct (5% level)?',
      output: regOutput(reg, rng),
      correct: sig ? `They are significantly ${more} for women than for men.` : 'They are not statistically significantly different for men and women.',
      distractors: sig ? ['They are not statistically significantly different for men and women.', `They are significantly ${b < 0 ? 'higher' : 'lower'} for women than for men.`, 'They are equal to zero for men.'] : [`They are significantly ${more} for women than for men.`, 'They are equal to zero for men.', 'They are necessarily higher for women than for men.'],
      steps: [`fem_educ: coefficient ${sn(b)}, |t| ≈ ${tAbs.toFixed(2)}, p ${sig ? '< 0.05' : '> 0.05'}.`, 'The interaction measures how the educ slope differs for women.'],
      explanation: sig ? 'A significant interaction means the slopes differ; its sign gives the direction.' : 'p > 0.05: no significant evidence that the slopes differ.',
    });
  },

  'st-joint-f': (rng) => {
    const { reg } = randomReg(rng, 3);
    const names = reg.coefs.slice(1).map((c) => c.name);
    const q = names.length;
    const sig = rng.chance(0.5);
    const F = sig ? rng.float(4, 45, 2) : rng.float(0.1, 2.2, 2);
    const df = reg.n - reg.coefs.length - 1;
    const p = fPValue(F, q, df);
    if (p > 0.04 && p < 0.06) throw new Retry();
    const out = regOutput(reg, rng) + '\n' + testOutput(names, F, q, df);
    if (rng.chance(0.5)) {
      return build(rng, {
        skill: 'st-joint-f',
        stem: `Based on the Stata output, what is the partial F statistic for testing that ${names.map((n) => `\`${n}\``).join(' and ')} are jointly zero?`,
        output: out,
        correct: f(F, 2),
        distractors: [reg.r2.toFixed(4), String(q), String(df), f(p, 4)],
        steps: [`Read F(${q}, ${df}) = ${F.toFixed(2)} from the test output.`],
        explanation: 'Do not confuse F with R², the numerator df (q) or the denominator df.',
      });
    }
    return build(rng, {
      skill: 'st-joint-f',
      stem: 'Based on the joint F test, which conclusion is correct at the 5% significance level?',
      output: out,
      correct: p < 0.05 ? `Reject that ${names.join(' and ')} are jointly zero; the F statistic is about ${f(F, 2)}.` : `Fail to reject that ${names.join(' and ')} are jointly zero.`,
      distractors: [p < 0.05 ? `Fail to reject that ${names.join(' and ')} are jointly zero.` : `Reject that ${names.join(' and ')} are jointly zero; the F statistic is about ${f(F, 2)}.`, `Only ${names[0]} is tested by this command.`, 'The test shows that the overall R² is zero.'],
      steps: [`F(${q}, ${df}) = ${F.toFixed(2)}, Prob > F = ${p.toFixed(4)}.`, p < 0.05 ? 'p < 0.05 → reject.' : 'p > 0.05 → do not reject.'],
      explanation: 'The joint test is decided by Prob > F (or F vs its critical value).',
    });
  },

  'st-standardized': (rng) => {
    const b1 = rng.float(-0.5, 0.5, 4);
    const b2 = rng.float(-0.5, 0.5, 4);
    if (Math.abs(Math.abs(b1) - Math.abs(b2)) < 0.03) throw new Retry();
    const ctx = rng.pick([{ y: 'zbwght', a: 'zcigs', b: 'zfaminc' }, { y: 'zwage', a: 'zeduc', b: 'zexper' }, { y: 'zmarks', a: 'zmath', b: 'zielts' }]);
    const reg: Reg = { depvar: ctx.y, n: 1388, coefs: [coef(rng, ctx.a, b1, rng.float(2, 9, 2)), coef(rng, ctx.b, b2, rng.float(2, 9, 2))], cons: { name: '_cons', b: 1e-9, se: 0.0265 }, r2: rng.float(0.02, 0.3, 4) };
    const bigger = Math.abs(b1) > Math.abs(b2) ? { n: ctx.a, b: b1 } : { n: ctx.b, b: b2 };
    const smaller = bigger.n === ctx.a ? { n: ctx.b, b: b2 } : { n: ctx.a, b: b1 };
    const strip = (s: string) => s.slice(1);
    if (rng.chance(0.5)) {
      return build(rng, {
        skill: 'st-standardized',
        stem: 'All variables are standardized with `egen … = std()`. Which variable has the larger standardized association with the outcome in absolute value?',
        output: regOutput(reg, rng),
        correct: `\`${strip(bigger.n)}\`, because its coefficient is about ${f(bigger.b, 3)}.`,
        distractors: [`\`${strip(smaller.n)}\`, because its coefficient is about ${f(smaller.b, 3)}.`, 'They have exactly the same standardized coefficient.', 'This cannot be determined from a standardized regression.'],
        steps: [`|${f(b1, 3)}| vs |${f(b2, 3)}| → ${strip(bigger.n)} is larger.`],
        explanation: 'Standardised coefficients are in SD units, so their absolute values are directly comparable.',
      });
    }
    const dir = b1 >= 0 ? 'increase' : 'decrease';
    return build(rng, {
      skill: 'st-standardized',
      stem: `All variables are standardized. Based on the coefficient on \`${ctx.a}\`, which interpretation is correct?`,
      output: regOutput(reg, rng),
      correct: `A one-standard-deviation increase in ${strip(ctx.a)} is associated with about a ${f(Math.abs(b1), 2)} standard-deviation ${dir} in ${strip(ctx.y)}, holding ${strip(ctx.b)} constant.`,
      distractors: [`A one-unit increase in ${strip(ctx.a)} is associated with about a ${f(Math.abs(b1), 2)}-unit ${dir} in ${strip(ctx.y)}.`, `A 1% increase in ${strip(ctx.a)} is associated with about a ${f(Math.abs(b1), 2)}% ${dir} in ${strip(ctx.y)}.`, `${strip(ctx.a)} explains about ${f(Math.abs(b1) * 100, 0)}% of the variation in ${strip(ctx.y)}.`],
      steps: ['Standardised regression → SD per SD, holding the other regressor constant.'],
      explanation: 'Not original units, not percentages, not R².',
    });
  },

  'st-did': (rng) => {
    const did = rng.float(-15000, 8000, 2);
    if (Math.abs(did) < 1500) throw new Retry();
    const sig = rng.chance(0.5);
    const reg: Reg = {
      depvar: 'rprice', n: 321,
      coefs: [coef(rng, '1.nearinc', rng.float(-25000, -8000, 2), rng.float(3, 5, 2)), coef(rng, '1.y81', rng.float(10000, 25000, 2), rng.float(3, 6, 2)), coef(rng, '1.nearinc#1.y81', did, sig ? rng.float(2.3, 4, 2) : rng.float(0.4, 1.7, 2))],
      cons: coef(rng, '_cons', rng.float(70000, 90000, 2), 30), r2: rng.float(0.1, 0.25, 4),
    };
    const amt = Math.round(Math.abs(did)).toLocaleString('en-US');
    const dir = did < 0 ? 'decline' : 'increase';
    return build(rng, {
      skill: 'st-did',
      stem: '`nearinc`=1 for houses near the incinerator, `y81`=1 for 1981 (after it was built). Based on the interaction coefficient and its p-value, which statement is correct?',
      output: regOutput(reg, rng),
      correct: `Nearby houses experienced an additional price ${dir} of about \\$${amt} in 1981 relative to far-away houses, and the estimate is ${sig ? '' : 'not '}significant at 5%.`,
      distractors: [`Nearby houses experienced an additional price ${dir} of about \\$${amt} in 1981 relative to far-away houses, and the estimate is ${sig ? 'not ' : ''}significant at 5%.`, `Nearby houses were always exactly \\$${amt} ${did < 0 ? 'cheaper' : 'more expensive'}.`, `The interaction coefficient is the 1978 mean price of far-away houses.`],
      steps: [`Interaction = DiD = ${sn(did)}.`, `p ${sig ? '< 0.05 → significant' : '> 0.05 → not significant'}.`],
      explanation: 'The interaction is the extra change for the treated group after treatment. _cons is the 1978 mean for far-away houses.',
    });
  },

  'st-coef-interp': (rng) => {
    const { ctx, reg, vars } = randomReg(rng, 1, false);
    const c = reg.coefs[0];
    const unit = vars[0][1];
    const dir = c.b >= 0 ? 'increase' : 'decrease';
    const amt = f(Math.abs(c.b), 2);
    return build(rng, {
      skill: 'st-coef-interp',
      stem: `Using ${ctx.file}, \`reg ${ctx.y} ${c.name}\` gives the output below (${ctx.y} is measured in ${ctx.yUnit}). How should the coefficient on \`${c.name}\` be interpreted?`,
      output: regOutput(reg, rng),
      correct: `One additional ${unit} is associated with about a ${amt} ${ctx.yUnit} ${dir} in ${ctx.y}.`,
      distractors: [`One additional ${unit} is associated with about a ${f(Math.abs(c.b) * 10, 2)} ${ctx.yUnit} ${dir} in ${ctx.y}.`, `A 1% increase in ${c.name} is associated with about a ${amt}% ${dir} in ${ctx.y}.`, `${c.name} explains about ${f(Math.abs(c.b) * 100, 0)}% of the variation in ${ctx.y}.`, `One additional ${unit} is associated with about a ${amt} ${ctx.yUnit} ${c.b >= 0 ? 'decrease' : 'increase'} in ${ctx.y}.`],
      steps: [`Level–level: coefficient ${sn(c.b)} in ${ctx.yUnit} per ${unit}.`],
      explanation: 'Read the coefficient in the units of Y; it is not a percentage and not R².',
    });
  },

  'st-control-change': (rng) => {
    const ctx = rng.pick([{ y: 'wage', x: 'educ', z: 'exper' }, { y: 'bwght', x: 'cigs', z: 'faminc' }, { y: 'marks_FoS', x: 'ent_math', z: 'ent_ielts' }]);
    const b1 = rng.float(-1, 1.2, 4);
    const b2 = b1 * rng.float(0.5, 1.4, 3);
    if (Math.abs(b1) < 0.05 || Math.abs(Math.abs(b2) - Math.abs(b1)) < 0.02) throw new Retry();
    const r1: Reg = { depvar: ctx.y, n: 526, coefs: [coef(rng, ctx.x, b1, rng.float(3, 10, 2))], cons: coef(rng, '_cons', rng.float(-3, 110, 3), 5), r2: rng.float(0.02, 0.2, 4) };
    const r2: Reg = { depvar: ctx.y, n: 526, coefs: [coef(rng, ctx.x, b2, rng.float(3, 10, 2)), coef(rng, ctx.z, rng.float(-0.5, 0.5, 4) || 0.07, rng.float(2, 7, 2))], cons: coef(rng, '_cons', rng.float(-3, 110, 3), 5), r2: r1.r2 + rng.float(0.01, 0.08, 4) };
    const rises = Math.abs(b2) > Math.abs(b1);
    const a = f(b1, 2);
    const b = f(b2, 2);
    return build(rng, {
      skill: 'st-control-change',
      stem: `What happens to the estimated coefficient on \`${ctx.x}\` after \`${ctx.z}\` is added as a control?`,
      output: `. reg ${ctx.y} ${ctx.x}\n\n${regOutput(r1, rng)}\n\n. reg ${ctx.y} ${ctx.x} ${ctx.z}\n\n${regOutput(r2, rng)}`,
      correct: `Its magnitude ${rises ? 'rises' : 'falls'} from about ${a} to about ${b}.`,
      distractors: [`Its magnitude ${rises ? 'falls' : 'rises'} from about ${b} to about ${a}.`, 'It becomes approximately zero.', 'It changes sign.'],
      steps: [`First regression: ${sn(b1)}. Second regression: ${sn(b2)}.`, `|${a}| → |${b}|: the magnitude ${rises ? 'rises' : 'falls'}.`],
      explanation: 'A coefficient moves when the added control is correlated with both the regressor and the outcome.',
    });
  },

  'st-signif': (rng) => {
    const { reg } = randomReg(rng, 3, false);
    const i = rng.int(0, 2);
    const none = rng.chance(0.2);
    reg.coefs = reg.coefs.map((c, j) => (j === i && !none ? { ...c, se: Number((Math.abs(c.b) / rng.float(0.3, 1.8, 2)).toPrecision(4)) } : c));
    const df = reg.n - 4;
    const ps = reg.coefs.map((c) => tPValue(c.b / c.se, df));
    if (ps.some((p) => p > 0.03 && p < 0.07)) throw new Retry();
    const insig = reg.coefs.filter((_, j) => ps[j] > 0.05).map((c) => c.name);
    if (insig.length > 1) throw new Retry();
    const allSig = 'All three are statistically significant at the 5% level.';
    return build(rng, {
      skill: 'st-signif',
      stem: 'Which explanatory variable is **not** statistically significant at the 5% level?',
      output: regOutput(reg, rng),
      correct: insig.length ? `\`${insig[0]}\`` : allSig,
      distractors: [...reg.coefs.map((c) => `\`${c.name}\``), allSig],
      fixedOrder: [...reg.coefs.map((c) => `\`${c.name}\``), allSig],
      steps: reg.coefs.map((c, j) => `${c.name}: p = ${ps[j].toFixed(3)} ${ps[j] > 0.05 ? '> 0.05 → not significant' : '< 0.05 → significant'}`),
      explanation: 'Scan the P>|t| column for values above 0.05.',
    });
  },

  'st-r2': (rng) => {
    const { reg } = randomReg(rng, 3);
    const s = stats(reg);
    return build(rng, {
      skill: 'st-r2',
      stem: 'What is the approximate value of $R^2$ in this regression?',
      output: regOutput(reg, rng),
      correct: reg.r2.toFixed(4),
      distractors: [s.adj.toFixed(4), (reg.r2 / 10).toFixed(4), Math.min(0.99, reg.r2 * 10).toFixed(4), s.Fp.toFixed(4)],
      steps: [`Header: R-squared = ${reg.r2.toFixed(4)}.`],
      explanation: 'R-squared is in the top-right block; Adj R-squared is the line below it.',
    });
  },

  'st-twodummy': (rng) => {
    const b0 = rng.float(4, 7, 4);
    const bF = rng.float(-1.5, 0.5, 4);
    const bM = rng.float(1, 3.5, 4);
    const bFM = rng.float(-3.5, -0.5, 4);
    const reg: Reg = { depvar: 'wage', n: 526, coefs: [coef(rng, '1.female', bF, 1.2), coef(rng, '1.married', bM, 6), coef(rng, '1.female#1.married', bFM, 4.5)], cons: coef(rng, '_cons', b0, 14), r2: 0.18 };
    const groups = [
      { name: 'a single man', v: b0, how: '_cons' },
      { name: 'a married man', v: b0 + bM, how: '_cons + 1.married' },
      { name: 'a single woman', v: b0 + bF, how: '_cons + 1.female' },
      { name: 'a married woman', v: b0 + bF + bM + bFM, how: '_cons + 1.female + 1.married + 1.female#1.married' },
    ];
    const gi = rng.int(0, 3);
    const gr = groups[gi];
    return build(rng, {
      skill: 'st-twodummy',
      stem: `\`reg wage i.female##i.married\` gives the output below. What is the predicted hourly wage for ${gr.name}?`,
      output: regOutput(reg, rng),
      correct: `About \\$${gr.v.toFixed(2)}`,
      distractors: [...groups.filter((_, j) => j !== gi).map((x) => `About \\$${x.v.toFixed(2)}`), `About \\$${Math.abs(bM).toFixed(2)}`],
      steps: [`${gr.name}: ${gr.how} = ${gr.v.toFixed(2)}.`],
      explanation: 'Plug in female and married (0/1); include the interaction only when both equal 1.',
    });
  },
};

