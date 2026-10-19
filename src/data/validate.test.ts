import { describe, expect, it } from 'vitest';
import { QUESTIONS, STATA_OUTPUTS, questionById } from './bank';
import { SKILLS, skillById, TOPICS } from './skills';
import { FORMULAS } from './formulas';
import { GENERATORS, generate } from './generators';
import { Rng } from '../lib/random';
import { runGen } from './generators/core';
import { fPValue, tPValue } from '../lib/distributions';

describe('question bank inventory', () => {
  it('contains every question from the source PDF', () => {
    const counts = Object.fromEntries(TOPICS.map((t) => [t.id, QUESTIONS.filter((q) => q.topic === t.id).length]));
    expect(counts).toEqual({ MAT: 20, W1: 26, W2: 24, W3: 39, W4: 32, W5: 38, STATA: 32 });
    expect(QUESTIONS.length).toBe(211);
  });

  it('has unique, stable IDs and consecutive numbering', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const t of TOPICS) {
      const nums = QUESTIONS.filter((q) => q.topic === t.id).map((q) => q.number);
      expect(nums).toEqual(nums.map((_, i) => i + 1));
    }
  });

  it('every question has a known skill, 4 distinct options and a valid answer', () => {
    for (const q of QUESTIONS) {
      expect(skillById[q.skill], q.id).toBeDefined();
      const opts = Object.values(q.options);
      expect(new Set(opts).size, q.id).toBe(4);
      if (q.answer === null) expect(q.status, q.id).toBe('pending-data');
      else expect(['a', 'b', 'c', 'd']).toContain(q.answer);
      expect(q.steps.length, q.id).toBeGreaterThan(0);
      if (q.duplicateOf) expect(questionById[q.duplicateOf], q.id).toBeDefined();
      if (q.stata) expect(STATA_OUTPUTS[q.stata], q.id).toBeDefined();
    }
  });

  it('formulas reference real skills', () => {
    for (const f of FORMULAS) for (const s of f.skills) expect(skillById[s], f.id + ' ' + s).toBeDefined();
  });
});

/** Recompute numerical answers and check the keyed option matches. */
describe('numerical answer key', () => {
  const near = (id: string, value: number, dp: number) => {
    const q = questionById[id];
    const text = q.options[q.answer!].replace('−', '-').replace(/[$,]/g, '');
    const num = text.match(/-?\d+(\.\d+)?/);
    expect(num, id).not.toBeNull();
    expect(parseFloat(num![0]), id).toBeCloseTo(value, dp);
  };
  it('matches recomputed values', () => {
    near('MAT-Q11', 2 * 4 + 3 * 1, 6);
    near('W1-Q03', 20 * 0.2 + 40 * 0.5 + 60 * 0.3, 6);
    near('W1-Q04', 5 + 2 * 8, 6);
    near('W1-Q05', 5 + 2 * 4 - 3 * 6, 6);
    near('W1-Q08', 0.1 + 0.2 + 0.2, 6);
    near('W1-Q10', 0.25 / (0.1 + 0.25 + 0.15), 6);
    near('W1-Q11', 50 * 0.4 + 70 * 0.4 + 90 * 0.2, 6);
    near('W1-Q13', 60 * 0.7 + 80 * 0.3, 6);
    near('W1-Q14', (79 + 89 + 90) / 3, 2);
    near('W1-Q23', (79 + 89 + 90) / 3, 2);
    near('W1-Q26', (112 + 117 + 120) / 3, 2);
    near('W3-Q08', 9 * 9, 6);
    near('W3-Q09', 16, 6);
    near('W3-Q10', 4 * 4, 6);
    near('W3-Q11', 4 * 4 + 9 - 2 * 2 * 1, 6);
    near('W3-Q12', 4 * 4 + 9, 6);
    near('W3-Q22', 150 / 75, 6);
    near('W3-Q23', 4 * 0.16, 6);
    near('W3-Q24', Math.sqrt(4 * 0.16), 6);
    near('W3-Q27', 0.72 / 0.12, 6);
    near('W3-Q34', 0.78 / 0.08, 6);
    near('W3-Q39', 0.84 / 0.12, 6);
    near('W4-Q12', 1 + 0.8 * 2, 6);
    near('W4-Q19', 1 - 300 / 500, 6);
    near('W4-Q23', 1 - 300 / 95 / (500 / 99), 3);
    near('W4-Q25', 0.4 / 4 / (0.6 / 95), 2);
    near('W4-Q29', 0.07 / 2 / (0.58 / 115), 2);
    near('W4-Q31', 1 - 424 / 868, 2);
    near('W4-Q32', 1 - 350 / 1000, 6);
    near('W5-Q09', -30688 + 18824, 6);
    near('W5-Q19', 0.595 * 40, 6);
    near('W5-Q20', 0.595 * 10, 6);
    near('W5-Q22', 8, 6);
    near('W5-Q24', 0.05, 6);
  });

  it('Stata answers agree with the regenerated output', () => {
    const v = (k: string) => (STATA_OUTPUTS[k] as unknown as { values: Record<string, any> }).values;
    near('STATA-Q01', v('S1').wage_m, 2);
    near('STATA-Q02', v('S2').t, 2);
    near('STATA-Q03', v('S3').coefs.educ.t, 2);
    near('STATA-Q04', 100 * v('S4').coefs.educ.b, 2);
    near('STATA-Q05', 100 * v('S5').coefs.married.b, 2);
    expect(v('S6').coefs.fem_educ.p).toBeGreaterThan(0.05);
    expect(v('S7').testP).toBeLessThan(0.05);
    near('STATA-Q08', v('S8').testF, 2);
    expect(v('S9').fwl.coefs.r_educ.b).toBeCloseTo(v('S9').full.coefs.educ.b, 6);
    expect(v('S10').coefs.zeduc.b).toBeCloseTo(0.48, 2);
    expect(v('S11').coefs['1.nearinc#1.y81'].b).toBeCloseTo(-11864, 0);
    expect(v('S11').coefs['1.nearinc#1.y81'].p).toBeGreaterThan(0.05);
    expect(v('S13').coefs.educ.b).toBeCloseTo(0.54, 2);
    expect(v('S14').m1.coefs.educ.b).toBeLessThan(v('S14').m2.coefs.educ.b);
    expect(v('S15').coefs.exper.p).toBeGreaterThan(0.05);
    expect(v('S15').coefs.educ.p).toBeLessThan(0.05);
    expect(v('S15').coefs.tenure.p).toBeLessThan(0.05);
    near('STATA-Q16', v('S16').r2, 4);
    expect(v('S17').testF).toBeCloseTo(12.56, 2);
    expect(v('S18').coefs['1.female#1.married'].b).toBeCloseTo(-2.86, 2);
    near('STATA-Q19', v('S19').coefs._cons.b + v('S19').coefs['1.married'].b, 2);
    expect(v('S20').coefs.cigs.b).toBeCloseTo(-0.51, 2);
    near('STATA-Q21', v('S21').coefs.cigs.t, 2);
    expect(v('S22').m2.coefs.cigs.b).toBeCloseTo(-0.46, 2);
    near('STATA-Q23', v('S23').r2, 4);
    expect(100 * v('S24').coefs.cigs.b).toBeCloseTo(-0.4, 2);
    expect(v('S25').coefs.male.b).toBeCloseTo(3.11, 2);
    expect(v('S26').coefs['1.male#c.cigs'].p).toBeGreaterThan(0.05);
    expect(v('S27').coefs.zcigs.b).toBeCloseTo(-0.136, 3);
  });
});

describe('variation generators', () => {
  it('every skill has a generator (numeric or conceptual)', () => {
    for (const s of SKILLS) expect(GENERATORS[s.generator ?? s.id], s.id).toBeDefined();
  });

  for (const id of Object.keys(GENERATORS)) {
    it(`${id} always yields one valid, unambiguous answer`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const q = runGen(GENERATORS[id], new Rng(seed * 7919));
        expect(q.options.length).toBe(4);
        expect(new Set(q.options.map((o) => o.replace(/\s+/g, ' ').trim())).size).toBe(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(4);
        const blob = [q.stem, ...q.options, ...q.steps, q.explanation, q.output ?? ''].join(' ');
        expect(blob).not.toMatch(/NaN|undefined|Infinity|\[object/);
      }
    });
  }

  it('generate() returns null for unknown skills', () => {
    expect(generate('no-such-skill')).toBeNull();
  });
});

describe('distributions', () => {
  it('t and F p-values match known values', () => {
    expect(tPValue(1.96, 100000)).toBeCloseTo(0.05, 3);
    expect(tPValue(2.0, 10)).toBeCloseTo(0.0734, 3);
    expect(fPValue(3.0, 2, 100)).toBeCloseTo(0.0543, 3);
    expect(fPValue(31.96, 2, 521)).toBeLessThan(0.0001);
  });
});
