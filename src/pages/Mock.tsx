import { useEffect, useMemo, useState } from 'react';
import { QUESTIONS, SCORABLE } from '../data/bank';
import { TOPICS, skillById, topicById } from '../data/skills';
import type { TopicId } from '../data/types';
import { isNumericSkill } from '../data/generators';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerExplanation } from '../components/Explanation';
import { fromQuestion, letter, newVariation, type ViewQ } from '../lib/view';
import { Rng } from '../lib/random';
import { clearMockDraft, loadMockDraft, recordAttempt, recordVariation, saveMock, saveMockDraft, useProgress, type MockResult } from '../lib/storage';
import { pct, weakSkills } from '../lib/stats';
import { href } from '../lib/router';
import { Stat } from './Practice';

const EXAM_SIZE = 20;

interface Draft {
  id: string;
  startedAt: number;
  timeLimitSec: number | null;
  items: ViewQ[];
  answers: (number | null)[];
  flags: boolean[];
  current: number;
}

interface Finished {
  draft: Draft;
  finishedAt: number;
}

/** Build a 20-question exam with balanced topic coverage (2–3 per topic). */
export function buildExam(rng: Rng, variationShare: number): ViewQ[] {
  const topics = TOPICS.map((t) => t.id);
  const counts: Record<string, number> = Object.fromEntries(topics.map((t) => [t, Math.floor(EXAM_SIZE / topics.length)]));
  let left = EXAM_SIZE - topics.length * Math.floor(EXAM_SIZE / topics.length);
  for (const t of rng.shuffle(topics)) if (left-- > 0) counts[t]++;
  const items: ViewQ[] = [];
  for (const t of topics) {
    const pool = SCORABLE.filter((q) => q.topic === t);
    const chosen: typeof pool = [];
    const usedGroups = new Set<string>();
    for (const q of rng.shuffle(pool)) {
      const group = q.duplicateOf && q.duplicateOf < q.id ? q.duplicateOf : q.id;
      if (usedGroups.has(group)) continue;
      usedGroups.add(group);
      chosen.push(q);
      if (chosen.length === counts[t]) break;
    }
    for (const q of chosen) {
      const canVary = isNumericSkill(q.skill, skillById[q.skill].generator);
      const v = canVary && rng.chance(variationShare) ? newVariation(q.skill, rng.int(1, 1e9)) : null;
      items.push(v ?? fromQuestion(q, true, rng));
    }
  }
  return rng.shuffle(items);
}

/** Every question in the bank (211), in random order, options shuffled, optionally with new numbers. */
export function buildFullExam(rng: Rng, variationShare: number): ViewQ[] {
  const items = SCORABLE.map((q) => {
    const canVary = isNumericSkill(q.skill, skillById[q.skill].generator);
    const v = canVary && rng.chance(variationShare) ? newVariation(q.skill, rng.int(1, 1e9)) : null;
    return v ?? fromQuestion(q, true, rng);
  });
  return rng.shuffle(items);
}

/** Real-exam pace: 90 minutes for 20 questions = 4.5 minutes per question. */
const PACE_SEC_PER_Q = 270;

export function Mock() {
  const [draft, setDraft] = useState<Draft | null>(() => loadMockDraft<Draft>());
  const [finished, setFinished] = useState<Finished | null>(null);

  useEffect(() => {
    if (draft) saveMockDraft(draft);
  }, [draft]);

  const finish = (d: Draft) => {
    const finishedAt = Date.now();
    const results = d.items.map((q, i) => {
      const ok = d.answers[i] !== null && d.answers[i] === q.correctIndex;
      if (q.source === 'original') recordAttempt(q.qid!, ok, 'mock');
      else recordVariation(q.skill, ok, 'mock');
      return { qid: q.qid, skill: q.skill, topic: q.topic, correct: ok, answered: d.answers[i] !== null };
    });
    const r: MockResult = {
      id: d.id,
      startedAt: d.startedAt,
      finishedAt,
      durationSec: Math.round((finishedAt - d.startedAt) / 1000),
      timeLimitSec: d.timeLimitSec,
      score: results.filter((x) => x.correct).length,
      total: d.items.length,
      items: results,
    };
    saveMock(r);
    clearMockDraft();
    setDraft(null);
    setFinished({ draft: d, finishedAt });
  };

  if (finished) return <MockResults f={finished} onNew={() => setFinished(null)} />;
  if (draft) return <MockRun draft={draft} setDraft={setDraft} onFinish={finish} />;
  return <MockSetup onStart={setDraft} />;
}

function MockSetup({ onStart }: { onStart: (d: Draft) => void }) {
  const progress = useProgress();
  const [minutes, setMinutes] = useState<number>(90);
  const [share, setShare] = useState(0.35);
  const [full, setFull] = useState(false);
  const [fullPaced, setFullPaced] = useState(false);
  const fullCount = SCORABLE.length;
  const start = () => {
    const rng = new Rng();
    const items = full ? buildFullExam(rng, share) : buildExam(rng, share);
    const timeLimitSec = full ? (fullPaced ? items.length * PACE_SEC_PER_Q : null) : minutes ? minutes * 60 : null;
    onStart({ id: `mock-${Date.now()}`, startedAt: Date.now(), timeLimitSec, items, answers: items.map(() => null), flags: items.map(() => false), current: 0 });
  };
  const past = [...progress.mocks].reverse();
  return (
    <div className="page narrow">
      <h1>Mock exam</h1>
      <p className="lead">
        Exactly {EXAM_SIZE} multiple-choice questions, 2–3 from each of the {TOPICS.length} topics (the teacher's stated format). No feedback until you submit. A mock score is practice evidence, not a prediction of your real mark.
      </p>
      <div className="card">
        <h3>Exam length</h3>
        <div className="seg">
          <button className={!full ? 'on' : ''} onClick={() => setFull(false)}>
            Standard: {EXAM_SIZE} questions
          </button>
          <button className={full ? 'on' : ''} onClick={() => setFull(true)}>
            Full bank: all {fullCount} questions
          </button>
        </div>
        {full && (
          <p className="muted small">
            Every question from the teacher's bank ({QUESTIONS.length} in total) in random order, with shuffled options. Your answers are saved as you go, so you can close the tab and continue later.
          </p>
        )}
        <h3>Time limit</h3>
        {full ? (
          <>
            <div className="seg">
              <button className={!fullPaced ? 'on' : ''} onClick={() => setFullPaced(false)}>
                Untimed
              </button>
              <button className={fullPaced ? 'on' : ''} onClick={() => setFullPaced(true)}>
                Exam pace: 4.5 min per question ({fmtTime(fullCount * PACE_SEC_PER_Q)})
              </button>
            </div>
            <p className="muted small">The timer keeps running if you close the tab, so an untimed run is usually better for the full bank.</p>
          </>
        ) : (
          <>
            <div className="seg">
              {[0, 30, 45, 60, 90].map((m) => (
                <button key={m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>
                  {m ? `${m} min` : 'Untimed'}
                </button>
              ))}
            </div>
            <p className="muted small">The real exam is 90 minutes for 20 questions (4.5 min each). Once you are comfortable, practise at 60 or 45 minutes to build a time buffer.</p>
          </>
        )}
        <h3>Question source</h3>
        <div className="seg">
          {(
            [
              [0, 'Original questions only'],
              [0.35, 'Mix: ~⅓ with new numbers'],
              [0.7, 'Mostly new numbers'],
              [1, 'New numbers wherever possible'],
            ] as const
          ).map(([v, l]) => (
            <button key={l} className={share === v ? 'on' : ''} onClick={() => setShare(v)}>
              {l}
            </button>
          ))}
        </div>
        <p className="muted small">New-number versions are generated from the same solving method as the original and their answers are recalculated, imitating how the teacher may change values.</p>
        <div className="actions">
          <button className="btn primary big" onClick={start}>
            {full ? `Start full-bank exam (${fullCount} questions)` : 'Start mock exam'}
          </button>
        </div>
      </div>
      {past.length > 0 && (
        <div className="card">
          <h3>Previous attempts</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {past.slice(0, 10).map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.finishedAt).toLocaleString()}</td>
                  <td>
                    {m.score}/{m.total} ({pct(m.score / m.total)})
                  </td>
                  <td>{fmtTime(m.durationSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MockRun({ draft, setDraft, onFinish }: { draft: Draft; setDraft: (d: Draft) => void; onFinish: (d: Draft) => void }) {
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.floor((now - draft.startedAt) / 1000);
  const remaining = draft.timeLimitSec === null ? null : draft.timeLimitSec - elapsed;
  useEffect(() => {
    if (remaining !== null && remaining <= 0) onFinish(draft);
  }, [remaining, draft, onFinish]);

  const i = draft.current;
  const q = draft.items[i];
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const answered = draft.answers.filter((a) => a !== null).length;
  const flagged = draft.flags.filter(Boolean).length;

  return (
    <div className="exam">
      <div className="exam-bar">
        <strong>{draft.items.length > EXAM_SIZE ? 'Full-bank exam' : 'Mock exam'}</strong>
        <span>
          Answered {answered}/{draft.items.length}
        </span>
        <span className={`timer ${remaining !== null && remaining < 300 ? 'low' : ''}`}>{remaining === null ? `⏱ ${fmtTime(elapsed)}` : `⏳ ${fmtTime(Math.max(0, remaining))}`}</span>
        <button className="btn primary" onClick={() => setConfirm(true)}>
          Submit exam
        </button>
      </div>
      <div className="exam-layout">
        <nav className={`exam-nav ${draft.items.length > EXAM_SIZE ? 'long' : ''}`} aria-label="Questions">
          {draft.items.map((_, j) => (
            <button key={j} className={`navq ${j === i ? 'cur' : ''} ${draft.answers[j] !== null ? 'ans' : ''} ${draft.flags[j] ? 'flag' : ''}`} onClick={() => set({ current: j })}>
              {j + 1}
            </button>
          ))}
          <div className="legend small muted">
            <span className="navq ans mini" /> answered <span className="navq flag mini" /> flagged
          </div>
        </nav>
        <div className="exam-main">
          <QuestionCard q={q} number={i + 1} hideMeta selected={draft.answers[i]} onSelect={(s) => set({ answers: draft.answers.map((a, j) => (j === i ? s : a)) })} />
          <div className="actions">
            <button className="btn" disabled={i === 0} onClick={() => set({ current: i - 1 })}>
              ← Previous
            </button>
            <button className={`btn ghost ${draft.flags[i] ? 'on' : ''}`} onClick={() => set({ flags: draft.flags.map((f, j) => (j === i ? !f : f)) })}>
              {draft.flags[i] ? '⚑ Flagged for review' : '⚐ Flag for review'}
            </button>
            {draft.answers[i] !== null && (
              <button className="btn ghost" onClick={() => set({ answers: draft.answers.map((a, j) => (j === i ? null : a)) })}>
                Clear answer
              </button>
            )}
            <button className="btn primary" disabled={i === draft.items.length - 1} onClick={() => set({ current: i + 1 })}>
              Next →
            </button>
            {draft.items.length > EXAM_SIZE && answered < draft.items.length && (
              <button
                className="btn ghost"
                onClick={() => {
                  const n = draft.answers.findIndex((a, j) => a === null && j > i);
                  set({ current: n >= 0 ? n : draft.answers.findIndex((a) => a === null) });
                }}
              >
                Next unanswered ⇥
              </button>
            )}
          </div>
        </div>
      </div>
      {confirm && (
        <div className="modal-back" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Submit the exam?</h3>
            <p>
              You have answered {answered} of {draft.items.length} questions{flagged ? ` and flagged ${flagged} for review` : ''}.
              {answered < draft.items.length && ' Unanswered questions are marked wrong.'}
            </p>
            <div className="actions">
              <button className="btn" onClick={() => setConfirm(false)}>
                Keep working
              </button>
              <button className="btn primary" onClick={() => onFinish(draft)}>
                Yes, submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MockResults({ f, onNew }: { f: Finished; onNew: () => void }) {
  const progress = useProgress();
  const { draft } = f;
  const [open, setOpen] = useState<number | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(true);
  const rows = draft.items.map((q, i) => ({ q, i, sel: draft.answers[i], ok: draft.answers[i] !== null && draft.answers[i] === q.correctIndex }));
  const score = rows.filter((r) => r.ok).length;
  const duration = Math.round((f.finishedAt - draft.startedAt) / 1000);
  const byTopic = useMemo(
    () =>
      TOPICS.map((t) => {
        const rs = rows.filter((r) => r.q.topic === t.id);
        return { t, n: rs.length, ok: rs.filter((r) => r.ok).length };
      }).filter((x) => x.n > 0),
    [rows],
  );
  const worst = [...byTopic].sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
  const weak = weakSkills(progress, 3);
  const wrongSkills = [...new Set(rows.filter((r) => !r.ok).map((r) => r.q.skill))];

  return (
    <div className="page">
      <h1>Mock exam results</h1>
      <div className="stat-row">
        <Stat label="Score" value={`${score} / ${draft.items.length}`} />
        <Stat label="Percentage" value={pct(score / draft.items.length)} />
        <Stat label="Correct / incorrect" value={`${score} / ${draft.items.length - score}`} />
        <Stat label="Time spent" value={fmtTime(duration)} sub={draft.timeLimitSec ? `limit ${fmtTime(draft.timeLimitSec)}` : 'untimed'} />
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Performance by topic</h3>
          <table className="data-table">
            <tbody>
              {byTopic.map(({ t, n, ok }) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    {ok}/{n}
                  </td>
                  <td style={{ width: '40%' }}>
                    <div className="bar">
                      <div className={ok / n >= 0.67 ? 'good' : ok / n >= 0.34 ? 'mid' : 'poor'} style={{ width: `${(100 * ok) / n}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>What to study next</h3>
          {score === draft.items.length ? (
            <p>Perfect score. Take another mock with "Mostly new numbers" to confirm the methods transfer.</p>
          ) : (
            <ul>
              {worst && worst.ok < worst.n && (
                <li>
                  Weakest topic in this mock: <strong>{worst.t.name}</strong> ({worst.ok}/{worst.n}).{' '}
                  <a href={href('/practice')}>Practise it</a> or review its lessons in <a href={href('/learn', { topic: worst.t.id })}>Learn mode</a>.
                </li>
              )}
              {wrongSkills.slice(0, 4).map((s) => (
                <li key={s}>
                  Missed: <strong>{skillById[s].name}</strong> — <a href={href('/variations', { skill: s })}>practise with different numbers</a>
                </li>
              ))}
              {weak.length > 0 && <li>Overall weak skills (all sessions): {weak.map((w) => skillById[w.skill].name).join(', ')}.</li>}
            </ul>
          )}
          <p className="muted small">Mock results show which methods need work. They do not predict your exam mark with certainty.</p>
        </div>
      </div>
      <div className="card">
        <div className="row-between">
          <h3>Review every question</h3>
          <label className="check">
            <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} /> Show mistakes only
          </label>
        </div>
        <ul className="review-list">
          {rows
            .filter((r) => !onlyWrong || !r.ok)
            .map((r) => (
              <li key={r.i} className={r.ok ? 'ok' : 'bad'}>
                <button className="review-head" onClick={() => setOpen(open === r.i ? null : r.i)}>
                  <span className={`dot ${r.ok ? 'ok' : 'bad'}`} />
                  Q{r.i + 1} · {topicById[r.q.topic].short} · {skillById[r.q.skill].name}
                  <span className="muted small">
                    {' '}
                    — you: {r.sel === null ? '—' : letter(r.sel)}, correct: {letter(r.q.correctIndex!)}
                    {r.q.source === 'variation' ? ' · new-number version' : ` · ${r.q.qid}`}
                  </span>
                </button>
                {open === r.i && (
                  <div className="review-body">
                    <QuestionCard q={r.q} selected={r.sel} revealed hideMeta />
                    <AnswerExplanation q={r.q} selected={r.sel} />
                  </div>
                )}
              </li>
            ))}
        </ul>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={onNew}>
          Take another mock exam
        </button>
        <a className="btn" href={href('/mistakes')}>
          Go to Mistakes
        </a>
      </div>
    </div>
  );
}

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export type { TopicId };
