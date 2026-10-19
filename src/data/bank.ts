import type { Question, TopicId } from './types';
import { MATRIX } from './questions/matrix';
import { WEEK1 } from './questions/week1';
import { WEEK2 } from './questions/week2';
import { WEEK3 } from './questions/week3';
import { WEEK4 } from './questions/week4';
import { WEEK5 } from './questions/week5';
import { STATA } from './questions/stata';
import stataOutputs from './stataOutputs.json';

export interface StataOutput {
  commands: string;
  output: string;
  missing: boolean;
}

export const STATA_OUTPUTS = stataOutputs as unknown as Record<string, StataOutput>;

/** The complete teacher question bank, in source order. */
export const QUESTIONS: Question[] = [...MATRIX, ...WEEK1, ...WEEK2, ...WEEK3, ...WEEK4, ...WEEK5, ...STATA];

export const questionById: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

/** Questions with a verified answer key (usable for scoring). */
export const SCORABLE = QUESTIONS.filter((q) => q.answer !== null);

export function questionsByTopic(topic: TopicId): Question[] {
  return QUESTIONS.filter((q) => q.topic === topic);
}
