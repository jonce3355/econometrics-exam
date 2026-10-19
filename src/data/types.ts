export type OptionKey = 'a' | 'b' | 'c' | 'd';

export type TopicId = 'MAT' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'STATA';

export interface Topic {
  id: TopicId;
  name: string;
  short: string;
  /** Section heading exactly as it appears in the teacher's question bank. */
  sourceHeading: string;
}

export interface Table {
  headers: string[];
  rows: string[][];
}

/**
 * Status of the answer key for a question.
 * - verified: answer derived by mathematical reasoning / re-running the regression.
 * - pending-data: the data file needed to verify it (FoS.DTA) has not been supplied.
 */
export type AnswerStatus = 'verified' | 'pending-data';

export interface Question {
  /** Stable ID, e.g. "W3-Q22". Never renumber. */
  id: string;
  topic: TopicId;
  /** Question number inside its section of the source PDF. */
  number: number;
  skill: string;
  /** Rich text: supports $inline$, $$display$$ math, **bold** and `code`. */
  stem: string;
  table?: Table;
  /** Stata commands shown in the source bank. */
  code?: string;
  /** Key into stataOutputs.json for the regenerated output. */
  stata?: string;
  /** Text shown after the code/output block. */
  after?: string;
  options: Record<OptionKey, string>;
  /** Correct option, or null when it cannot be verified yet. */
  answer: OptionKey | null;
  status: AnswerStatus;
  /** Step 1 - what is being asked, in plain words. */
  understand: string;
  /** Step 4 - worked solution. */
  steps: string[];
  /** Why the correct answer is correct. */
  why: string;
  /** Why the other options are wrong. */
  wrong?: Partial<Record<OptionKey, string>>;
  /** Common trap for this question. */
  trap?: string;
  /** Which values the teacher can change while keeping the method. */
  vary?: string;
  /** Reviewer notes: ambiguities, duplicates, data issues. */
  flags?: string[];
  duplicateOf?: string;
}

export interface Skill {
  id: string;
  topic: TopicId;
  name: string;
  /** Step 2 - which concept is tested and how to recognise it. */
  concept: string;
  /** Step 3 - formula (rich text, may be empty for purely conceptual skills). */
  formula?: string;
  /** Symbol definitions + when to use. */
  formulaNotes?: string;
  /** Step 6 - exam shortcut. */
  shortcut: string;
  /** ID of the variation generator (see generators.ts). */
  generator?: string;
}

export interface Formula {
  id: string;
  topic: TopicId;
  title: string;
  latex: string;
  symbols: string;
  calculates: string;
  when: string;
  example: string;
  mistakes: string;
  skills: string[];
}

/** A generated practice question (variation). */
export interface GeneratedQuestion {
  skill: string;
  stem: string;
  table?: Table;
  output?: string;
  options: string[];
  answerIndex: number;
  steps: string[];
  explanation: string;
}
