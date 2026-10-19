import { useSyncExternalStore } from 'react';
import type { TopicId } from '../data/types';

export type Mode = 'learn' | 'practice' | 'mock' | 'mistakes' | 'variation';

export interface Attempt {
  t: number;
  correct: boolean;
  mode: Mode;
}

export interface MockItemResult {
  qid?: string;
  skill: string;
  topic: TopicId;
  correct: boolean;
  answered: boolean;
}

export interface MockResult {
  id: string;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  timeLimitSec: number | null;
  score: number;
  total: number;
  items: MockItemResult[];
}

export interface Progress {
  version: 1;
  /** Attempts on original bank questions, keyed by question id. */
  q: Record<string, Attempt[]>;
  /** Attempts on generated variations, keyed by skill id. */
  v: Record<string, Attempt[]>;
  bookmarks: string[];
  /** Question ids opened in Learn mode. */
  learned: string[];
  mocks: MockResult[];
  /** Study plan checklist. */
  plan: Record<string, boolean>;
  theme: 'system' | 'light' | 'dark';
  examDate: string | null;
}

const KEY = 'econometrics-trainer-progress-v1';
const MAX_ATTEMPTS = 30;

export const emptyProgress = (): Progress => ({
  version: 1,
  q: {},
  v: {},
  bookmarks: [],
  learned: [],
  mocks: [],
  plan: {},
  theme: 'system',
  examDate: null,
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return sanitize(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function sanitize(p: unknown): Progress {
  const base = emptyProgress();
  if (!p || typeof p !== 'object') return base;
  const o = p as Partial<Progress>;
  return {
    ...base,
    ...o,
    version: 1,
    q: o.q && typeof o.q === 'object' ? o.q : {},
    v: o.v && typeof o.v === 'object' ? o.v : {},
    bookmarks: Array.isArray(o.bookmarks) ? o.bookmarks : [],
    learned: Array.isArray(o.learned) ? o.learned : [],
    mocks: Array.isArray(o.mocks) ? o.mocks : [],
    plan: o.plan && typeof o.plan === 'object' ? o.plan : {},
  };
}

let state: Progress = typeof localStorage === 'undefined' ? emptyProgress() : load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable: keep in memory */
  }
}

export function update(fn: (p: Progress) => Progress) {
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}

export function getProgress(): Progress {
  return state;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

const push = (list: Attempt[] | undefined, a: Attempt) => [...(list ?? []), a].slice(-MAX_ATTEMPTS);

export function recordAttempt(qid: string, correct: boolean, mode: Mode) {
  update((p) => ({ ...p, q: { ...p.q, [qid]: push(p.q[qid], { t: Date.now(), correct, mode }) } }));
}

export function recordVariation(skill: string, correct: boolean, mode: Mode = 'variation') {
  update((p) => ({ ...p, v: { ...p.v, [skill]: push(p.v[skill], { t: Date.now(), correct, mode }) } }));
}

export function toggleBookmark(qid: string) {
  update((p) => ({ ...p, bookmarks: p.bookmarks.includes(qid) ? p.bookmarks.filter((b) => b !== qid) : [...p.bookmarks, qid] }));
}

export function markLearned(qid: string) {
  if (state.learned.includes(qid)) return;
  update((p) => ({ ...p, learned: [...p.learned, qid] }));
}

export function saveMock(r: MockResult) {
  update((p) => ({ ...p, mocks: [...p.mocks, r].slice(-50) }));
}

export function setPlanItem(id: string, done: boolean) {
  update((p) => ({ ...p, plan: { ...p.plan, [id]: done } }));
}

export function setTheme(theme: Progress['theme']) {
  update((p) => ({ ...p, theme }));
}

export function setExamDate(examDate: string | null) {
  update((p) => ({ ...p, examDate }));
}

export function resetProgress() {
  update(() => ({ ...emptyProgress(), theme: state.theme }));
  try {
    localStorage.removeItem(MOCK_KEY);
  } catch {
    /* ignore */
  }
}

export function exportProgress(): string {
  return JSON.stringify({ app: 'econometrics-exam-trainer', exportedAt: new Date().toISOString(), progress: state }, null, 1);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json);
  const p = parsed && parsed.progress ? parsed.progress : parsed;
  if (!p || typeof p !== 'object' || !('q' in p)) throw new Error('This file does not look like an Econometrics Trainer progress export.');
  update(() => sanitize(p));
}

// ---- in-progress mock exam (survives refresh) ----
export const MOCK_KEY = 'econometrics-trainer-mock-in-progress-v1';

export function saveMockDraft(draft: unknown) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadMockDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearMockDraft() {
  try {
    localStorage.removeItem(MOCK_KEY);
  } catch {
    /* ignore */
  }
}
