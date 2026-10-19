import { useMemo } from 'react';
import { QUESTIONS } from '../data/bank';
import { SKILLS, TOPICS, skillById } from '../data/skills';
import { isNumericSkill } from '../data/generators';
import { VariationBox } from '../components/VariationBox';
import { ConceptStep, FormulaStep } from '../components/Explanation';
import { href, navigate, useRoute } from '../lib/router';
import { useProgress } from '../lib/storage';
import { pct, skillStats, weakSkills } from '../lib/stats';

export function Variations() {
  const { params } = useRoute();
  const progress = useProgress();
  const skill = params.get('skill') && skillById[params.get('skill')!] ? params.get('skill')! : null;
  const stats = useMemo(() => Object.fromEntries(skillStats(progress).map((s) => [s.skill, s])), [progress]);
  const weak = weakSkills(progress, 6);

  if (!skill) {
    return (
      <div className="page">
        <h1>Practice with different numbers</h1>
        <p className="lead">
          The teacher may change the numbers but keep the method. Each generator below rebuilds a question type from the bank with new valid inputs, recalculates the answer, and builds the wrong options from typical calculation errors. Concept-only skills get equivalent
          concept drills instead.
        </p>
        {weak.length > 0 && (
          <div className="card accent">
            <h3>Recommended for you (lowest accuracy)</h3>
            <div className="chips">
              {weak.map((w) => (
                <a key={w.skill} className="chip on" href={href('/variations', { skill: w.skill })}>
                  {skillById[w.skill].name} · {pct(w.accuracy)}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="actions">
          <button className="btn primary" onClick={() => navigate('/variations', { skill: (weak[0] ?? { skill: SKILLS[Math.floor(Math.random() * SKILLS.length)].id }).skill })}>
            {weak.length ? 'Start with my weakest skill' : 'Surprise me'}
          </button>
        </div>
        {TOPICS.map((t) => (
          <div key={t.id} className="card">
            <h3>{t.name}</h3>
            <div className="skill-grid">
              {SKILLS.filter((s) => s.topic === t.id).map((s) => {
                const st = stats[s.id];
                const n = QUESTIONS.filter((q) => q.skill === s.id).length;
                return (
                  <a key={s.id} className="skill-tile" href={href('/variations', { skill: s.id })}>
                    <span className="skill-name">{s.name}</span>
                    <span className="muted small">
                      {isNumericSkill(s.id, s.generator) ? '🔢 new numbers' : '💡 concept drill'} · {n} bank Q{n === 1 ? '' : 's'}
                    </span>
                    {st.attempts > 0 && (
                      <span className={`small ${st.accuracy! >= 0.8 ? 'ok-text' : st.accuracy! < 0.6 ? 'bad-text' : ''}`}>
                        {st.correct}/{st.attempts} correct
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const s = skillById[skill];
  const st = stats[skill];
  const bankQs = QUESTIONS.filter((q) => q.skill === skill);
  return (
    <div className="page narrow">
      <p>
        <a href={href('/variations')}>← All skills</a>
      </p>
      <h1>{s.name}</h1>
      <p className="muted">
        Based on bank questions:{' '}
        {bankQs.map((q, i) => (
          <span key={q.id}>
            {i > 0 && ', '}
            <a href={href('/learn', { q: q.id })}>{q.id}</a>
          </span>
        ))}
        {st.attempts > 0 && ` · Your record on this skill: ${st.correct}/${st.attempts} (${pct(st.accuracy)})`}
      </p>
      {st.recentWrong >= 3 && (
        <div className="callout warn">
          You missed {st.recentWrong} of your last 5 attempts on this skill. Revisit the lesson first: <a href={href('/learn', { q: bankQs[0]?.id })}>open {bankQs[0]?.id} in Learn mode</a>.
        </div>
      )}
      <details className="card">
        <summary>Show the method (concept + formula) before trying</summary>
        <ConceptStep skill={skill} />
        <FormulaStep skill={skill} />
      </details>
      <VariationBox skill={skill} />
    </div>
  );
}
