import { Fragment, useMemo, useState } from 'react';
import { QUESTIONS } from '../data/bank';
import { TOPICS, skillById, topicById } from '../data/skills';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerExplanation } from '../components/Explanation';
import { RichText } from '../components/RichText';
import { fromQuestion } from '../lib/view';
import { href } from '../lib/router';

/** Explicit answer-review mode: full inventory and answer key. */
export function Bank() {
  const [topic, setTopic] = useState('all');
  const [filter, setFilter] = useState<'all' | 'flagged' | 'pending' | 'dup'>('all');
  const [reveal, setReveal] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const list = QUESTIONS.filter((q) => (topic === 'all' || q.topic === topic) && (filter === 'all' || (filter === 'flagged' && q.flags) || (filter === 'pending' && q.answer === null) || (filter === 'dup' && q.duplicateOf)));
  const counts = useMemo(
    () => ({
      total: QUESTIONS.length,
      verified: QUESTIONS.filter((q) => q.status === 'verified').length,
      pending: QUESTIONS.filter((q) => q.answer === null).length,
      flagged: QUESTIONS.filter((q) => q.flags).length,
      dups: QUESTIONS.filter((q) => q.duplicateOf).length,
    }),
    [],
  );

  return (
    <div className="page">
      <h1>Question bank & answer key</h1>
      <p className="lead">The complete inventory of the teacher's bank. This is the only place where answers are shown without attempting first.</p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-value">{counts.total}</div>
          <div className="stat-label">questions in the source PDF</div>
        </div>
        <div className="stat">
          <div className="stat-value">{counts.verified}</div>
          <div className="stat-label">answers verified</div>
        </div>
        <div className="stat">
          <div className="stat-value">{counts.pending}</div>
          <div className="stat-label">pending FoS.DTA</div>
        </div>
        <div className="stat">
          <div className="stat-value">{counts.flagged}</div>
          <div className="stat-label">with review notes</div>
        </div>
      </div>
      <div className="callout">
        <strong>How answers were verified.</strong> The PDF has no answer key, so every answer was worked out from the definitions and formulas on the teacher's formula sheet; numerical answers are recomputed in the automated tests, and every Stata question was
        re-run on the supplied data (WAGE1 from the standard Wooldridge data set, BWGHT, KIELMC, AEJfigs). FoS.DTA was not supplied yet, so 4 FoS questions are marked pending and excluded from scoring.
      </div>
      <div className="toolbar">
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">All topics</option>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({QUESTIONS.filter((q) => q.topic === t.id).length})
            </option>
          ))}
        </select>
        <div className="seg">
          {(
            [
              ['all', 'All'],
              ['flagged', 'Review notes'],
              ['pending', 'Pending data'],
              ['dup', 'Duplicates'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} /> Show answers in the table
        </label>
      </div>
      <div className="table-wrap">
        <table className="data-table bank-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Topic</th>
              <th>Skill</th>
              <th>Question</th>
              <th>Answer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((q) => (
              <Fragment key={q.id}>
                <tr className="clickable" onClick={() => setOpen(open === q.id ? null : q.id)}>
                  <td>
                    <a href={href('/learn', { q: q.id })} onClick={(e) => e.stopPropagation()}>
                      {q.id}
                    </a>
                  </td>
                  <td>{topicById[q.topic].short}</td>
                  <td className="small">{skillById[q.skill].name}</td>
                  <td className="small clip">
                    <RichText text={(q.stem + (q.after ? ' ' + q.after : '')).replace(/\$\$[\s\S]*?\$\$/g, ' […] ')} />
                  </td>
                  <td>{reveal ? (q.answer ? q.answer.toUpperCase() : '?') : '•'}</td>
                  <td className="small">
                    {q.answer === null ? <span className="pill warn">pending data</span> : <span className="pill ok">verified</span>}
                    {q.flags && <span className="pill">note</span>}
                    {q.duplicateOf && <span className="pill">dup of {q.duplicateOf}</span>}
                  </td>
                </tr>
                {open === q.id && (
                  <tr>
                    <td colSpan={6}>
                      <BankDetail qid={q.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BankDetail({ qid }: { qid: string }) {
  const q = QUESTIONS.find((x) => x.id === qid)!;
  const v = fromQuestion(q);
  return (
    <div className="review-body">
      <QuestionCard q={v} selected={null} revealed hideMeta />
      <AnswerExplanation q={v} selected={null} review />
    </div>
  );
}
