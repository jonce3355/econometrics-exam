import { useEffect, useState } from 'react';
import { QuestionCard } from './QuestionCard';
import { AnswerExplanation } from './Explanation';
import { newVariation, type ViewQ } from '../lib/view';
import { recordVariation } from '../lib/storage';
import { isNumericSkill } from '../data/generators';
import { skillById } from '../data/skills';

/** Generate → answer → reveal loop for one skill. */
export function VariationBox({ skill, compact = false }: { skill: string; compact?: boolean }) {
  const [q, setQ] = useState<ViewQ | null>(() => newVariation(skill));
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState({ n: 0, ok: 0 });

  useEffect(() => {
    setQ(newVariation(skill));
    setSel(null);
    setDone(false);
    setCount({ n: 0, ok: 0 });
  }, [skill]);

  if (!q) return <p className="muted">No variation generator for this skill.</p>;
  const numeric = isNumericSkill(skill, skillById[skill]?.generator);

  const submit = () => {
    if (sel === null) return;
    const ok = sel === q.correctIndex;
    recordVariation(skill, ok);
    setCount((c) => ({ n: c.n + 1, ok: c.ok + (ok ? 1 : 0) }));
    setDone(true);
  };
  const next = () => {
    setQ(newVariation(skill));
    setSel(null);
    setDone(false);
  };

  return (
    <div className="variation">
      <div className="variation-head">
        <span className="badge badge-var">{numeric ? 'New numbers — answer recalculated' : 'Equivalent concept drill'}</span>
        {count.n > 0 && (
          <span className="muted small">
            This session: {count.ok}/{count.n} correct
          </span>
        )}
      </div>
      <QuestionCard q={q} selected={sel} onSelect={done ? undefined : setSel} revealed={done} hideMeta />
      <div className="actions">
        {!done ? (
          <button className="btn primary" disabled={sel === null} onClick={submit}>
            Submit answer
          </button>
        ) : (
          <button className="btn primary" onClick={next}>
            Generate another variation →
          </button>
        )}
      </div>
      {done && <AnswerExplanation q={q} selected={sel} full={!compact} />}
    </div>
  );
}
