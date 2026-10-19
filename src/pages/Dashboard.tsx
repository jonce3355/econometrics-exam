import { QUESTIONS } from '../data/bank';
import { skillById, topicById } from '../data/skills';
import { useProgress } from '../lib/storage';
import { overall, pct, topicStats, weakSkills, type Mastery } from '../lib/stats';
import { href } from '../lib/router';
import { buildPlan, currentDay } from './Plan';
import { Stat } from './Practice';

const MASTERY_LABEL: Record<Mastery, string> = { 'not-started': 'Not started', weak: 'Needs work', 'in-progress': 'In progress', mastered: 'Mastered' };

export function Dashboard() {
  const p = useProgress();
  const o = overall(p);
  const ts = topicStats(p);
  const weak = weakSkills(p, 4);
  const nextLearn = QUESTIONS.find((q) => !p.learned.includes(q.id)) ?? QUESTIONS[0];
  const day = currentDay(p.examDate) ?? 1;
  const plan = buildPlan(p);
  const today = plan[day - 1];
  const openTasks = today.tasks.filter((t) => !p.plan[t.id] && (t.auto ?? 0) < 1).slice(0, 4);
  const lastMock = p.mocks.at(-1);
  const daysLeft = p.examDate ? Math.ceil((new Date(p.examDate + 'T09:00:00').getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h1>Econometrics mid-term trainer</h1>
          <p className="lead">
            20 multiple-choice questions, 2–3 per topic, numbers may change but the method stays the same. Learn the method, then prove it on new numbers.
            {daysLeft !== null && daysLeft >= 0 && (
              <>
                {' '}
                <strong>{daysLeft === 0 ? 'Exam day!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to the exam.`}</strong>
              </>
            )}
          </p>
        </div>
        <div className="hero-actions">
          <a className="btn primary big" href={href('/learn', { q: nextLearn.id })}>
            Continue learning → {nextLearn.id}
          </a>
          <a className="btn big" href={href('/practice')}>
            Practice mode
          </a>
          <a className="btn big" href={href('/mock')}>
            Mock exam (20 Q)
          </a>
        </div>
      </div>

      <div className="stat-row">
        <Stat label="Questions in bank" value={o.total} sub={`${o.scorable} with verified answers`} />
        <Stat label="Practised" value={`${o.practiced}`} sub={`of ${o.scorable} (${pct(o.practiced / o.scorable)})`} />
        <Stat label="Currently correct" value={o.correctNow} sub="last attempt right" />
        <Stat label="Overall accuracy" value={pct(o.accuracy)} sub={`${o.attempts} attempts incl. ${o.variationAttempts} variations`} />
        <Stat label="Lessons opened" value={`${p.learned.length}`} sub={`of ${o.total}`} />
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Topics</h3>
          <table className="data-table topics">
            <tbody>
              {ts.map((t) => (
                <tr key={t.topic}>
                  <td>
                    <a href={href('/learn', { topic: t.topic })}>{topicById[t.topic].name}</a>
                  </td>
                  <td style={{ width: '30%' }}>
                    <div className="bar" title={`Coverage ${pct(t.coverage)}`}>
                      <div className={t.accuracy === null ? '' : t.accuracy >= 0.8 ? 'good' : t.accuracy >= 0.6 ? 'mid' : 'poor'} style={{ width: `${t.coverage * 100}%` }} />
                    </div>
                    <span className="muted small">
                      {t.covered}/{t.total} tried
                    </span>
                  </td>
                  <td className="small">{pct(t.accuracy)}</td>
                  <td>
                    <span className={`pill m-${t.mastery}`}>{MASTERY_LABEL[t.mastery]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Mastered = 8+ attempts, ≥ 80% accuracy and ≥ half the topic's questions tried. Needs work = under 60% accuracy.</p>
        </div>

        <div className="card">
          <h3>
            Today — Day {day}: {today.title}
          </h3>
          {openTasks.length ? (
            <ul className="plain">
              {openTasks.map((t) => (
                <li key={t.id}>
                  ☐ {t.link ? <a href={t.link}>{t.label}</a> : t.label}
                </li>
              ))}
            </ul>
          ) : (
            <p>All of today's tasks are done. Look at the next day or take a mock exam.</p>
          )}
          <p>
            <a href={href('/plan')}>Full 3-day plan →</a>
          </p>
          {weak.length > 0 && (
            <>
              <h3>Weak spots</h3>
              <ul className="plain">
                {weak.map((w) => (
                  <li key={w.skill}>
                    <a href={href('/variations', { skill: w.skill })}>{skillById[w.skill].name}</a> <span className="muted small">— {pct(w.accuracy)} of {w.attempts}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {lastMock && (
            <p>
              Last mock: <strong>{lastMock.score}/{lastMock.total}</strong> ({pct(lastMock.score / lastMock.total)}) · {p.mocks.length} taken
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>The 3-day plan at a glance</h3>
        <div className="plan-mini">
          {plan.map((d) => (
            <a key={d.day} href={href('/plan')} className={`plan-mini-day ${d.day === day ? 'today' : ''}`}>
              <strong>Day {d.day}</strong>
              <span>{d.title}</span>
              <span className="muted small">{d.goal}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
