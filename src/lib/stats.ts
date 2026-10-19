import { QUESTIONS, SCORABLE, questionById } from '../data/bank';
import { SKILLS, TOPICS, skillById } from '../data/skills';
import type { TopicId } from '../data/types';
import type { Attempt, Progress } from './storage';

export type Mastery = 'not-started' | 'weak' | 'in-progress' | 'mastered';

export interface TopicStat {
  topic: TopicId;
  attempts: number;
  correct: number;
  accuracy: number | null;
  coverage: number; // share of scorable originals attempted
  covered: number;
  total: number;
  mastery: Mastery;
}

export interface SkillStat {
  skill: string;
  attempts: number;
  correct: number;
  wrong: number;
  recentWrong: number; // wrong answers among the last 5 attempts
  accuracy: number | null;
}

const allAttempts = (p: Progress, pred: (skill: string) => boolean): Attempt[] => {
  const out: Attempt[] = [];
  for (const [qid, list] of Object.entries(p.q)) {
    const q = questionById[qid];
    if (q && pred(q.skill)) out.push(...list);
  }
  for (const [skill, list] of Object.entries(p.v)) if (pred(skill)) out.push(...list);
  return out;
};

export function overall(p: Progress) {
  const practiced = SCORABLE.filter((q) => (p.q[q.id]?.length ?? 0) > 0);
  const correctNow = practiced.filter((q) => p.q[q.id].at(-1)!.correct);
  const atts = allAttempts(p, () => true);
  const correct = atts.filter((a) => a.correct).length;
  return {
    total: QUESTIONS.length,
    scorable: SCORABLE.length,
    practiced: practiced.length,
    correctNow: correctNow.length,
    attempts: atts.length,
    correctAttempts: correct,
    accuracy: atts.length ? correct / atts.length : null,
    variationAttempts: Object.values(p.v).reduce((s, l) => s + l.length, 0),
  };
}

export function topicStats(p: Progress): TopicStat[] {
  return TOPICS.map((t) => {
    const atts = allAttempts(p, (s) => skillById[s]?.topic === t.id);
    const correct = atts.filter((a) => a.correct).length;
    const pool = SCORABLE.filter((q) => q.topic === t.id);
    const covered = pool.filter((q) => (p.q[q.id]?.length ?? 0) > 0).length;
    const accuracy = atts.length ? correct / atts.length : null;
    const coverage = pool.length ? covered / pool.length : 0;
    let mastery: Mastery = 'in-progress';
    if (atts.length === 0) mastery = 'not-started';
    else if (atts.length >= 4 && accuracy! < 0.6) mastery = 'weak';
    else if (atts.length >= 8 && accuracy! >= 0.8 && coverage >= 0.5) mastery = 'mastered';
    return { topic: t.id, attempts: atts.length, correct, accuracy, coverage, covered, total: pool.length, mastery };
  });
}

export function skillStats(p: Progress): SkillStat[] {
  return SKILLS.map((s) => {
    const atts = allAttempts(p, (x) => x === s.id).sort((a, b) => a.t - b.t);
    const correct = atts.filter((a) => a.correct).length;
    return {
      skill: s.id,
      attempts: atts.length,
      correct,
      wrong: atts.length - correct,
      recentWrong: atts.slice(-5).filter((a) => !a.correct).length,
      accuracy: atts.length ? correct / atts.length : null,
    };
  });
}

/** Skills to prioritise: low accuracy with enough evidence, worst first. */
export function weakSkills(p: Progress, limit = 8): SkillStat[] {
  return skillStats(p)
    .filter((s) => s.attempts >= 2 && (s.accuracy ?? 1) < 0.7)
    .sort((a, b) => b.recentWrong - a.recentWrong || (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, limit);
}

export interface MistakeEntry {
  qid: string;
  wrong: number;
  lastWrong: number;
  active: boolean; // last attempt was wrong
}

export function mistakes(p: Progress): MistakeEntry[] {
  const out: MistakeEntry[] = [];
  for (const [qid, list] of Object.entries(p.q)) {
    if (!questionById[qid]) continue;
    const wrongs = list.filter((a) => !a.correct);
    if (!wrongs.length) continue;
    out.push({ qid, wrong: wrongs.length, lastWrong: wrongs.at(-1)!.t, active: !list.at(-1)!.correct });
  }
  return out.sort((a, b) => Number(b.active) - Number(a.active) || b.wrong - a.wrong || b.lastWrong - a.lastWrong);
}

export const pct = (x: number | null, dp = 0) => (x === null ? '—' : `${(x * 100).toFixed(dp)}%`);
