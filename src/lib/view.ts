import { STATA_OUTPUTS } from '../data/bank';
import type { GeneratedQuestion, OptionKey, Question, Table, TopicId } from '../data/types';
import { skillById } from '../data/skills';
import { generate } from '../data/generators';
import { Rng } from './random';

export const LETTERS = ['a', 'b', 'c', 'd'] as const;

/** A question ready to display: original (possibly with shuffled options) or a generated variation. */
export interface ViewQ {
  key: string;
  source: 'original' | 'variation';
  qid?: string;
  topic: TopicId;
  skill: string;
  stem: string;
  table?: Table;
  code?: string;
  output?: string;
  outputMissing?: boolean;
  after?: string;
  options: string[];
  /** Original option key for each displayed position (originals only). */
  optionKeys?: OptionKey[];
  correctIndex: number | null;
  gen?: GeneratedQuestion;
}

export function fromQuestion(q: Question, shuffle = false, rng?: Rng): ViewQ {
  const keys: OptionKey[] = shuffle ? (rng ?? new Rng()).shuffle([...LETTERS]) : [...LETTERS];
  const out = q.stata ? STATA_OUTPUTS[q.stata] : undefined;
  return {
    key: q.id + ':' + keys.join(''),
    source: 'original',
    qid: q.id,
    topic: q.topic,
    skill: q.skill,
    stem: q.stem,
    table: q.table,
    code: q.code,
    output: out && !out.missing ? out.output : undefined,
    outputMissing: out?.missing,
    after: q.after,
    options: keys.map((k) => q.options[k]),
    optionKeys: keys,
    correctIndex: q.answer ? keys.indexOf(q.answer) : null,
  };
}

export function fromGenerated(g: GeneratedQuestion, key?: string): ViewQ {
  const skill = skillById[g.skill];
  return {
    key: key ?? `gen:${g.skill}:${Math.random().toString(36).slice(2)}`,
    source: 'variation',
    topic: skill.topic,
    skill: g.skill,
    stem: g.stem,
    table: g.table,
    output: g.output,
    options: g.options,
    correctIndex: g.answerIndex,
    gen: g,
  };
}

export function newVariation(skill: string, seed?: number): ViewQ | null {
  const s = skillById[skill];
  const g = generate(skill, seed, s?.generator);
  return g ? fromGenerated(g, `gen:${skill}:${seed ?? Math.random()}`) : null;
}

export const letter = (i: number) => LETTERS[i].toUpperCase();
