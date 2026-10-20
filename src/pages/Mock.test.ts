import { describe, expect, it } from 'vitest';
import { buildExam, buildFullExam } from './Mock';
import { QUESTIONS } from '../data/bank';
import { Rng } from '../lib/random';

describe('mock exam builders', () => {
  it('full-bank exam contains every question exactly once, in random order', () => {
    const items = buildFullExam(new Rng(7), 0);
    expect(items.length).toBe(QUESTIONS.length);
    expect(new Set(items.map((q) => q.qid)).size).toBe(QUESTIONS.length);
    expect(items.map((q) => q.qid)).not.toEqual(QUESTIONS.map((q) => q.id));
    for (const q of items) expect(q.correctIndex).not.toBeNull();
  });

  it('full-bank exam with new numbers keeps 211 valid items', () => {
    const items = buildFullExam(new Rng(11), 1);
    expect(items.length).toBe(QUESTIONS.length);
    expect(items.filter((q) => q.source === 'variation').length).toBeGreaterThan(100);
    for (const q of items) {
      expect(q.options.length).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('standard exam still has exactly 20 questions', () => {
    expect(buildExam(new Rng(3), 0.35).length).toBe(20);
  });
});
