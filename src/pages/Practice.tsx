import { useMemo, useState } from 'react';
import { SCORABLE, questionById } from '../data/bank';
import { TOPICS } from '../data/skills';
import type { TopicId } from '../data/types';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerExplanation } from '../components/Explanation';
import { fromQuestion, type ViewQ } from '../lib/view';
import { Rng } from '../lib/random';
import { recordAttempt, toggleBookmark, useProgress, type Mode } from '../lib/storage';
import { mistakes, pct } from '../lib/stats';
import { useRoute } from '../lib/router';

type Filter = 'all' | 'unanswered' | 'incorrect' | 'bookmarked';

interface Session {
  queue: ViewQ[];
  idx: number;
  answers: Record<string, { sel: number; ok: boolean }>;
  retries: number;
  mode: Mode;
  title: string;
}

export function Practice() {
  const { params } = useRoute();
  const preset = params.get('ids');
  const [session, setSession] = useState<Session | null>(() => (preset ? startFromIds(preset.split(','), params.get('mode') === 'mistakes' ? 'mistakes' : 'practice', true) : null));

  if (!session) return <PracticeSetup onStart={setSession} />;
  return <PracticeRun session={session} setSession={setSession} />;
}

function startFromIds(ids: string[], mode: Mode, shuffleOpts: boolean, title = 'Retry mistakes'): Session {
  const rng = new Rng();
  const queue = rng.shuffle(ids.filter((id) => questionById[id]?.answer)).map((id) => fromQuestion(questionById[id], shuffleOpts, rng));
  return { queue, idx: 0, answers: {}, retries: 0, mode, title };
}

function PracticeSetup({ onStart }: { onStart: (s: Session) => void }) {
  const progress = useProgress();
  const [topics, setTopics] = useState<TopicId[]>(TOPICS.map((t) => t.id));
  const [filter, setFilter] = useState<Filter>('all');
  const [shuffleOpts, setShuffleOpts] = useState(true);
  const [size, setSize] = useState(20);

  const pool = useMemo(() => {
    const wrong = new Set(mistakes(progress).filter((m) => m.active).map((m) => m.qid));
    return SCORABLE.filter((q) => topics.includes(q.topic)).filter((q) => {
      if (filter === 'unanswered') return !progress.q[q.id]?.length;
      if (filter === 'incorrect') return wrong.has(q.id);
      if (filter === 'bookmarked') return progress.bookmarks.includes(q.id);
      return true;
    });
  }, [topics, filter, progress]);

  const start = () => {
    const rng = new Rng();
    const picked = rng.shuffle(pool).slice(0, size === 0 ? pool.length : size);
    onStart({ queue: picked.map((q) => fromQuestion(q, shuffleOpts, rng)), idx: 0, answers: {}, retries: 0, mode: 'practice', title: 'Practice session' });
  };

  const toggle = (t: TopicId) => setTopics((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  return (
    <div className="page narrow">
      <h1>Practice mode</h1>
      <p className="lead">Immediate feedback after every answer. Question order is randomised; option order can be shuffled too (the answer key follows the shuffle).</p>
      <div className="card">
        <h3>Topics</h3>
        <div className="chips">
          {TOPICS.map((t) => (
            <label key={t.id} className={`chip ${topics.includes(t.id) ? 'on' : ''}`}>
              <input type="checkbox" checked={topics.includes(t.id)} onChange={() => toggle(t.id)} />
              {t.name}
            </label>
          ))}
        </div>
        <div className="row-actions">
          <button className="btn small ghost" onClick={() => setTopics(TOPICS.map((t) => t.id))}>
            All
          </button>
          <button className="btn small ghost" onClick={() => setTopics([])}>
            None
          </button>
        </div>
        <h3>Which questions?</h3>
        <div className="seg">
          {(
            [
              ['all', 'All'],
              ['unanswered', 'Not yet answered'],
              ['incorrect', 'Answered incorrectly'],
              ['bookmarked', 'Review later ★'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        <h3>Session length</h3>
        <div className="seg">
          {[10, 20, 40, 0].map((n) => (
            <button key={n} className={size === n ? 'on' : ''} onClick={() => setSize(n)}>
              {n === 0 ? 'All matching' : `${n} questions`}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={shuffleOpts} onChange={(e) => setShuffleOpts(e.target.checked)} /> Shuffle answer options
        </label>
        <div className="actions">
          <button className="btn primary" disabled={!pool.length} onClick={start}>
            Start ({Math.min(pool.length, size || pool.length)} of {pool.length} matching)
          </button>
        </div>
        {!pool.length && <p className="muted">No questions match these filters.</p>}
      </div>
    </div>
  );
}

function PracticeRun({ session, setSession }: { session: Session; setSession: (s: Session | null) => void }) {
  const progress = useProgress();
  const q = session.queue[session.idx];
  const [sel, setSel] = useState<number | null>(null);
  const ans = q ? session.answers[q.key] : undefined;
  const answeredCount = Object.keys(session.answers).length;
  const correctCount = Object.values(session.answers).filter((a) => a.ok).length;

  if (!q) {
    const wrongIds = session.queue.filter((x) => session.answers[x.key] && !session.answers[x.key].ok).map((x) => x.qid!);
    return (
      <div className="page narrow">
        <h1>Session complete</h1>
        <div className="stat-row">
          <Stat label="Score" value={`${correctCount} / ${answeredCount}`} />
          <Stat label="Accuracy" value={pct(answeredCount ? correctCount / answeredCount : null)} />
        </div>
        {wrongIds.length > 0 && (
          <div className="card">
            <h3>Questions to review</h3>
            <ul>
              {[...new Set(wrongIds)].map((id) => (
                <li key={id}>
                  <a href={`#/learn?q=${id}`}>{id}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="actions">
          {wrongIds.length > 0 && (
            <button className="btn primary" onClick={() => setSession(startFromIds([...new Set(wrongIds)], session.mode, true, 'Retry incorrect'))}>
              Retry incorrect questions
            </button>
          )}
          <button className="btn" onClick={() => setSession(null)}>
            New session
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (sel === null) return;
    const ok = sel === q.correctIndex;
    recordAttempt(q.qid!, ok, session.mode);
    setSession({ ...session, answers: { ...session.answers, [q.key]: { sel, ok } } });
  };
  const next = () => {
    setSel(null);
    setSession({ ...session, idx: session.idx + 1 });
  };
  const retryLater = () => {
    const again = fromQuestion(questionById[q.qid!], true);
    setSel(null);
    setSession({ ...session, queue: [...session.queue, { ...again, key: again.key + ':r' + (session.retries + 1) }], idx: session.idx + 1, retries: session.retries + 1 });
  };

  const bookmarked = progress.bookmarks.includes(q.qid!);
  return (
    <div className="page narrow">
      <div className="run-head">
        <div>
          <strong>{session.title}</strong>
          <span className="muted small">
            {' '}
            · Question {session.idx + 1} of {session.queue.length} · Score {correctCount}/{answeredCount} ({pct(answeredCount ? correctCount / answeredCount : null)})
          </span>
        </div>
        <button className="btn small ghost" onClick={() => setSession({ ...session, idx: session.queue.length })}>
          End session
        </button>
      </div>
      <div className="progress">
        <div style={{ width: `${(100 * session.idx) / session.queue.length}%` }} />
      </div>
      <QuestionCard q={q} selected={ans ? ans.sel : sel} onSelect={ans ? undefined : setSel} revealed={Boolean(ans)} />
      <div className="actions">
        {!ans ? (
          <button className="btn primary" disabled={sel === null} onClick={submit}>
            Submit
          </button>
        ) : (
          <>
            <button className="btn primary" onClick={next}>
              Next →
            </button>
            {!ans.ok && (
              <button className="btn" onClick={retryLater}>
                Retry this question later in the session
              </button>
            )}
          </>
        )}
        <button className={`btn ghost ${bookmarked ? 'on' : ''}`} onClick={() => toggleBookmark(q.qid!)}>
          {bookmarked ? '★ Review later' : '☆ Review later'}
        </button>
      </div>
      {ans && <AnswerExplanation q={q} selected={ans.sel} />}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
