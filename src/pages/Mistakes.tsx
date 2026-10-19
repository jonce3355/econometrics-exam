import { useMemo, useState } from 'react';
import { questionById } from '../data/bank';
import { TOPICS, skillById } from '../data/skills';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerExplanation } from '../components/Explanation';
import { fromQuestion } from '../lib/view';
import { useProgress } from '../lib/storage';
import { mistakes, pct, skillStats, topicStats } from '../lib/stats';
import { href, navigate } from '../lib/router';

export function Mistakes() {
  const progress = useProgress();
  const list = useMemo(() => mistakes(progress), [progress]);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const shown = list.filter((m) => showAll || m.active);
  const topics = topicStats(progress);
  const skills = skillStats(progress).filter((s) => s.wrong > 0).sort((a, b) => b.recentWrong - a.recentWrong || b.wrong - a.wrong);
  const revisit = skills.filter((s) => s.recentWrong >= 3);
  const maxWrong = Math.max(1, ...topics.map((t) => t.attempts - t.correct));

  return (
    <div className="page">
      <h1>Mistakes & weak topics</h1>
      {list.length === 0 ? (
        <div className="card">
          <p>No mistakes recorded yet. Every wrong answer from Learn, Practice, Mock exams and variations will appear here automatically.</p>
        </div>
      ) : (
        <>
          {revisit.length > 0 && (
            <div className="callout bad">
              <strong>Revisit these lessons before more variations</strong> — you missed 3+ of your last 5 attempts:
              <ul>
                {revisit.map((s) => {
                  const first = Object.values(questionById).find((q) => q.skill === s.skill);
                  return (
                    <li key={s.skill}>
                      {skillById[s.skill].name} — <a href={href('/learn', { q: first?.id })}>lesson</a> · <a href={href('/variations', { skill: s.skill })}>variations</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="grid2">
            <div className="card">
              <h3>Where the mistakes are (all attempts)</h3>
              <table className="data-table">
                <tbody>
                  {topics.map((t) => {
                    const wrong = t.attempts - t.correct;
                    return (
                      <tr key={t.topic}>
                        <td>{TOPICS.find((x) => x.id === t.topic)!.short}</td>
                        <td style={{ width: '45%' }}>
                          <div className="bar">
                            <div className="poor" style={{ width: `${(100 * wrong) / maxWrong}%` }} />
                          </div>
                        </td>
                        <td className="small">
                          {wrong} wrong · {pct(t.accuracy)} acc.
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Skills with the most errors</h3>
              <ul className="plain">
                {skills.slice(0, 8).map((s) => (
                  <li key={s.skill}>
                    <a href={href('/variations', { skill: s.skill })}>{skillById[s.skill].name}</a> <span className="muted small">— {s.wrong} wrong of {s.attempts} ({pct(s.accuracy)})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="row-between">
              <h3>
                {showAll ? 'All questions ever missed' : 'Questions still wrong (last attempt incorrect)'} ({shown.length})
              </h3>
              <label className="check">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Include ones I've since fixed
              </label>
            </div>
            <div className="actions">
              <button className="btn primary" disabled={!shown.length} onClick={() => navigate('/practice', { ids: shown.map((m) => m.qid).join(','), mode: 'mistakes' })}>
                Retry these {shown.length} (answers hidden)
              </button>
            </div>
            <ul className="review-list">
              {shown.map((m) => {
                const q = questionById[m.qid];
                return (
                  <li key={m.qid} className={m.active ? 'bad' : 'ok'}>
                    <button className="review-head" onClick={() => setOpen(open === m.qid ? null : m.qid)}>
                      <span className={`dot ${m.active ? 'bad' : 'ok'}`} />
                      {m.qid} · {skillById[q.skill].name}
                      <span className="muted small">
                        {' '}
                        — wrong {m.wrong}×{m.wrong >= 2 ? ' (repeated)' : ''}
                      </span>
                    </button>
                    {open === m.qid && <MistakeDetail qid={m.qid} />}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function MistakeDetail({ qid }: { qid: string }) {
  const q = questionById[qid];
  const view = useMemo(() => fromQuestion(q), [q]);
  const [show, setShow] = useState(false);
  return (
    <div className="review-body">
      <QuestionCard q={view} selected={null} revealed={show} hideMeta />
      <div className="actions">
        {!show && (
          <button className="btn" onClick={() => setShow(true)}>
            Show answer & explanation
          </button>
        )}
        <a className="btn" href={href('/practice', { ids: qid, mode: 'mistakes' })}>
          Retry without the answer
        </a>
        <a className="btn" href={href('/variations', { skill: q.skill })}>
          New-number variation
        </a>
        <a className="btn ghost" href={href('/learn', { q: qid })}>
          Full lesson
        </a>
      </div>
      {show && <AnswerExplanation q={view} selected={null} />}
    </div>
  );
}
