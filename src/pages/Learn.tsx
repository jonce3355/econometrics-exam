import { useEffect, useMemo, useState } from 'react';
import { QUESTIONS, questionById } from '../data/bank';
import { TOPICS, skillById, topicById } from '../data/skills';
import type { TopicId } from '../data/types';
import { QuestionCard, QuestionMeta } from '../components/QuestionCard';
import { ConceptStep, Flags, FormulaStep, SolutionSteps, Step, Verdict } from '../components/Explanation';
import { RichText } from '../components/RichText';
import { VariationBox } from '../components/VariationBox';
import { fromQuestion, letter } from '../lib/view';
import { markLearned, recordAttempt, toggleBookmark, useProgress } from '../lib/storage';
import { href, navigate, useRoute } from '../lib/router';

export function Learn() {
  const { params } = useRoute();
  const progress = useProgress();
  const qid = params.get('q') && questionById[params.get('q')!] ? params.get('q')! : null;
  const topic = (params.get('topic') as TopicId) || (qid ? questionById[qid].topic : 'MAT');
  const list = useMemo(() => QUESTIONS.filter((q) => q.topic === topic), [topic]);
  const current = qid ? questionById[qid] : list[0];

  useEffect(() => {
    if (!qid && current) navigate('/learn', { q: current.id });
  }, [qid, current]);

  if (!current) return null;
  const idx = list.findIndex((q) => q.id === current.id);
  const prev = list[idx - 1];
  const next = list[idx + 1];

  return (
    <div className="learn-layout">
      <aside className="learn-side">
        <label className="field">
          <span>Topic</span>
          <select value={topic} onChange={(e) => navigate('/learn', { q: QUESTIONS.find((q) => q.topic === e.target.value)!.id })}>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <ul className="qlist">
          {list.map((q) => {
            const atts = progress.q[q.id];
            const st = !atts?.length ? '' : atts.at(-1)!.correct ? 'ok' : 'bad';
            return (
              <li key={q.id}>
                <a href={href('/learn', { q: q.id })} className={q.id === current.id ? 'active' : ''}>
                  <span className={`dot ${st} ${progress.learned.includes(q.id) && !st ? 'seen' : ''}`} />
                  Q{q.number}
                  <span className="qlist-skill">{skillById[q.skill].name}</span>
                  {q.answer === null && <span className="pill warn">data</span>}
                  {q.flags && q.answer !== null && <span className="pill">note</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </aside>
      <div className="learn-main">
        <LearnQuestion key={current.id} qid={current.id} />
        <div className="pager">
          {prev ? (
            <a className="btn" href={href('/learn', { q: prev.id })}>
              ← Q{prev.number}
            </a>
          ) : (
            <span />
          )}
          <span className="muted small">
            {topicById[topic].name} · {idx + 1} of {list.length}
          </span>
          {next ? (
            <a className="btn primary" href={href('/learn', { q: next.id })}>
              Q{next.number} →
            </a>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}

function LearnQuestion({ qid }: { qid: string }) {
  const q = questionById[qid];
  const view = useMemo(() => fromQuestion(q), [q]);
  const progress = useProgress();
  const skill = skillById[q.skill];
  const [sel, setSel] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const revealed = submitted || gaveUp;
  const bookmarked = progress.bookmarks.includes(q.id);

  useEffect(() => markLearned(q.id), [q.id]);

  const submit = () => {
    if (sel === null) return;
    setSubmitted(true);
    if (view.correctIndex !== null) recordAttempt(q.id, sel === view.correctIndex, 'learn');
  };

  return (
    <article className="lesson">
      <header className="lesson-head">
        <QuestionMeta q={view} />
        <button className={`btn ghost small ${bookmarked ? 'on' : ''}`} onClick={() => toggleBookmark(q.id)}>
          {bookmarked ? '★ Review later' : '☆ Review later'}
        </button>
      </header>
      {q.duplicateOf && (
        <p className="muted small">
          Same logic as <a href={href('/learn', { q: q.duplicateOf })}>{q.duplicateOf}</a> (repeated in the teacher's bank).
        </p>
      )}

      <QuestionCard q={view} selected={sel} onSelect={revealed ? undefined : setSel} revealed={revealed && view.correctIndex !== null} hideMeta />

      {!revealed && (
        <div className="actions">
          <button className="btn primary" disabled={sel === null} onClick={submit}>
            Submit my answer
          </button>
          <button className="btn ghost" onClick={() => setGaveUp(true)}>
            I don't know — show me how
          </button>
        </div>
      )}

      <div className="steps">
        <Step n={1} title="Understand the question">
          <RichText text={q.understand} block />
        </Step>
        <ConceptStep skill={q.skill} />
        <FormulaStep skill={q.skill} />

        {!revealed ? (
          <div className="locked">🔒 Steps 4–7 (worked solution, answer, shortcut, variation) unlock after you submit an answer.</div>
        ) : (
          <>
            <Step n={4} title="Solve step by step">
              <SolutionSteps steps={q.steps} />
            </Step>
            <Step n={5} title="The answer" tone="ok">
              {submitted && <Verdict ok={sel === view.correctIndex} selected={sel} correct={view.correctIndex} />}
              {view.correctIndex !== null ? (
                <p>
                  Correct answer: <strong>{letter(view.correctIndex)}</strong> — <RichText text={view.options[view.correctIndex]} />
                </p>
              ) : null}
              {q.flags && <Flags flags={q.flags} />}
              <RichText text={q.why} block />
              {q.wrong && (
                <ul className="wrong-list">
                  {(['a', 'b', 'c', 'd'] as const).map((k) =>
                    q.wrong![k] && k !== q.answer ? (
                      <li key={k}>
                        <strong>{k.toUpperCase()}.</strong> <RichText text={q.wrong![k]!} />
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
              {q.trap && (
                <p>
                  <strong>Trap:</strong> <RichText text={q.trap} />
                </p>
              )}
            </Step>
            <Step n={6} title="Exam shortcut" tone="tip">
              <RichText text={skill.shortcut} block />
              {q.vary && (
                <p>
                  <strong>What the teacher can change:</strong> <RichText text={q.vary} />
                </p>
              )}
            </Step>
            <Step n={7} title="Now try a variation">
              <VariationBox skill={q.skill} compact />
            </Step>
          </>
        )}
      </div>
    </article>
  );
}
