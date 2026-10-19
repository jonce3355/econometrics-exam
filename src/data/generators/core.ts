import type { GeneratedQuestion, Table } from '../types';
import { Rng } from '../../lib/random';

/** Thrown when random inputs produce an ambiguous question; the caller retries. */
export class Retry extends Error {}

export type Gen = (rng: Rng) => GeneratedQuestion;

export interface BuildArgs {
  skill: string;
  stem: string;
  correct: string;
  /** Candidate distractors in priority order (common errors first). */
  distractors: string[];
  steps: string[];
  explanation: string;
  table?: Table;
  output?: string;
  /** Keep options in this fixed order (e.g. 0,1,2,4) instead of shuffling. */
  fixedOrder?: string[];
}

/** Normalise an option for duplicate detection. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export function build(rng: Rng, a: BuildArgs): GeneratedQuestion {
  const seen = new Set([norm(a.correct)]);
  const ds: string[] = [];
  for (const d of a.distractors) {
    const n = norm(d);
    if (!seen.has(n)) {
      seen.add(n);
      ds.push(d);
    }
  }
  if (ds.length < 3) throw new Retry('not enough distinct distractors');
  let options: string[];
  if (a.fixedOrder) {
    options = a.fixedOrder;
    if (!options.includes(a.correct) || new Set(options.map(norm)).size !== options.length) throw new Retry('bad fixed order');
  } else {
    options = rng.shuffle([a.correct, ...ds.slice(0, 3)]);
  }
  return {
    skill: a.skill,
    stem: a.stem,
    table: a.table,
    output: a.output,
    options,
    answerIndex: options.indexOf(a.correct),
    steps: a.steps,
    explanation: a.explanation,
  };
}

/** Format a number with fixed decimals, using a proper minus sign and no "-0". */
export function f(x: number, dp = 2): string {
  if (!Number.isFinite(x)) throw new Retry('non-finite');
  let s = x.toFixed(dp);
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
  return s.replace('-', '−');
}

/** Trim trailing zeros (for "nice" values in stems). */
export function g(x: number, dp = 4): string {
  if (!Number.isFinite(x)) throw new Retry('non-finite');
  let s = parseFloat(x.toFixed(dp)).toString();
  if (s === '-0') s = '0';
  return s.replace('-', '−');
}

/** LaTeX-safe number (uses hyphen minus inside math). */
export function m(x: number, dp = 4): string {
  return g(x, dp).replace('−', '-');
}

export function bm(rows: (number | string)[][]): string {
  return '\\begin{bmatrix}' + rows.map((r) => r.map((v) => (typeof v === 'number' ? m(v) : v)).join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
}

export const colv = (...v: (number | string)[]) => bm(v.map((x) => [x]));

export function runGen(gen: Gen, rng: Rng, tries = 200): GeneratedQuestion {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return gen(rng);
    } catch (e) {
      if (!(e instanceof Retry)) throw e;
      last = e;
    }
  }
  throw new Error('Generator failed to produce a valid question: ' + String(last));
}
