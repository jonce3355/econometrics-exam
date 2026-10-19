import type { GeneratedQuestion } from '../types';
import { Rng } from '../../lib/random';
import { runGen, type Gen } from './core';
import { matrixGens, week1Gens } from './math';
import { econGens } from './econ';
import { stataGens } from './stata';
import { conceptualGens } from './conceptual';

/** Numerical generators (recompute the answer with new numbers). */
export const NUMERIC_GENERATORS: Record<string, Gen> = { ...matrixGens, ...week1Gens, ...econGens, ...stataGens };

/** All generators, keyed by skill id. Conceptual drills fill skills that cannot be varied numerically. */
export const GENERATORS: Record<string, Gen> = { ...conceptualGens, ...NUMERIC_GENERATORS };

export function generatorFor(skill: string, generatorId?: string): Gen | undefined {
  return GENERATORS[generatorId ?? skill] ?? GENERATORS[skill];
}

export function generate(skill: string, seed?: number, generatorId?: string): GeneratedQuestion | null {
  const gen = generatorFor(skill, generatorId);
  if (!gen) return null;
  return runGen(gen, new Rng(seed));
}

export function isNumericSkill(skill: string, generatorId?: string): boolean {
  return Boolean(NUMERIC_GENERATORS[generatorId ?? skill]);
}
