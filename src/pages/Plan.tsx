import { QUESTIONS } from '../data/bank';
import { TOPICS, skillById, topicById } from '../data/skills';
import type { TopicId } from '../data/types';
import { setExamDate, setPlanItem, useProgress, type Progress } from '../lib/storage';
import { pct, topicStats, weakSkills, type TopicStat } from '../lib/stats';
import { href } from '../lib/router';

export interface PlanTask {
  id: string;
  label: string;
  link?: string;
  /** Automatic progress (0–1) from activity, if measurable. */
  auto?: number;
  note?: string;
}

const DEFAULT_FOCUS = ['t-stat', 'r2', 'partial-f', 'var-combination', 'functional-forms', 'rescaling', 'cond-exp', 'st-loglevel'];

export function buildPlan(p: Progress): { day: number; title: string; goal: string; tasks: PlanTask[] }[] {
  const ts = topicStats(p);
  const weakTopics = rankTopics(ts).slice(0, 3);
  const weak = weakSkills(p, 6).map((w) => w.skill);
  const focus = (weak.length ? weak : DEFAULT_FOCUS).slice(0, 6);
  const learnedIn = (t: TopicId) => {
    const qs = QUESTIONS.filter((q) => q.topic === t);
    return qs.filter((q) => p.learned.includes(q.id)).length / qs.length;
  };
  const mocks = p.mocks.length;
  const variationAtt = Object.values(p.v).reduce((s, l) => s + l.length, 0);
  return [
    {
      day: 1,
      title: 'Learn and understand',
      goal: 'Go through every topic in Learn mode: attempt each question, then read the worked solution and shortcut.',
      tasks: [
        ...TOPICS.map((t) => ({
          id: `d1-learn-${t.id}`,
          label: `Learn: ${t.name} (${QUESTIONS.filter((q) => q.topic === t.id).length} questions)`,
          link: href('/learn', { topic: t.id }),
          auto: learnedIn(t.id),
        })),
        { id: 'd1-formulas', label: 'Read the formula sheet once, topic by topic (focus on "When to use" and "Common mistakes")', link: href('/formulas') },
        { id: 'd1-check', label: 'End of day: a 20-question mixed practice session to check understanding', link: href('/practice') },
      ],
    },
    {
      day: 2,
      title: 'Practise and improve',
      goal: 'Lots of questions with immediate feedback; fix mistakes; train on new numbers.',
      tasks: [
        { id: 'd2-practice-all', label: 'Practice: all topics, 40 questions, options shuffled', link: href('/practice') },
        { id: 'd2-mistakes', label: 'Retry every question you got wrong (Mistakes page)', link: href('/mistakes') },
        ...focus.map((s) => ({ id: `d2-var-${s}`, label: `Different numbers ×5: ${skillById[s].name}`, link: href('/variations', { skill: s }), note: weak.includes(s) ? 'weak skill' : undefined })),
        { id: 'd2-stata', label: 'Stata output: practise reading t, p, R², F and log–level coefficients', link: href('/learn', { topic: 'STATA' }) },
        ...weakTopics.map((t) => ({ id: `d2-weak-${t.topic}`, label: `Extra practice on a weak topic: ${topicById[t.topic].name} (${pct(t.accuracy)} so far)`, link: href('/learn', { topic: t.topic }), note: 'adaptive' })),
        { id: 'd2-formulas', label: 'Review formula sheet "Common mistakes" for every numerical formula', link: href('/formulas') },
      ].map((t, i) => (i === 2 ? { ...t, auto: Math.min(1, variationAtt / 30) } : t)),
    },
    {
      day: 3,
      title: 'Exam simulation and final revision',
      goal: 'Timed 20-question mocks, review, and a short final revision.',
      tasks: [
        { id: 'd3-mock1', label: 'Mock exam #1 — timed, original questions', link: href('/mock'), auto: Math.min(1, mocks / 1) },
        { id: 'd3-review1', label: 'Review every mistake from mock #1 and redo them', link: href('/mistakes') },
        { id: 'd3-mock2', label: 'Mock exam #2 — "Mix: ~⅓ with new numbers"', link: href('/mock'), auto: Math.min(1, mocks / 2) },
        ...weakTopics.map((t) => ({ id: `d3-weak-${t.topic}`, label: `Revisit weak topic: ${topicById[t.topic].name}`, link: href('/learn', { topic: t.topic }), note: 'adaptive' })),
        { id: 'd3-mock3', label: 'Mock exam #3 — "Mostly new numbers"', link: href('/mock'), auto: Math.min(1, mocks / 3) },
        { id: 'd3-final', label: 'Final 20 minutes: formula sheet + exam shortcuts only (no new material)', link: href('/formulas') },
      ],
    },
  ];
}

/** Weakest topics first: not started, then lowest accuracy. */
export function rankTopics(ts: TopicStat[]): TopicStat[] {
  return [...ts].sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1) || a.coverage - b.coverage);
}

/** Suggested minutes per topic for a practice day, weighted towards weak topics. */
export function allocation(ts: TopicStat[], totalMin: number) {
  const w = ts.map((t) => {
    const need = t.accuracy === null ? 0.7 : 1 - t.accuracy;
    return 0.3 + need + (1 - t.coverage) * 0.3;
  });
  const sum = w.reduce((a, b) => a + b, 0);
  return ts.map((t, i) => ({ topic: t.topic, min: Math.round(((totalMin * w[i]) / sum) / 5) * 5 }));
}

export function currentDay(examDate: string | null): number | null {
  if (!examDate) return null;
  const exam = new Date(examDate + 'T09:00:00');
  const days = Math.ceil((exam.getTime() - Date.now()) / 86400000);
  if (days <= 0) return 3;
  return Math.min(3, Math.max(1, 4 - days));
}

export function Plan() {
  const p = useProgress();
  const plan = buildPlan(p);
  const ts = topicStats(p);
  const alloc = allocation(ts, 240);
  const today = currentDay(p.examDate);
  return (
    <div className="page">
      <h1>3-day study plan</h1>
      <p className="lead">A flexible plan — you don't have to follow it in strict order. Items marked “adaptive” change as your results come in, and weak topics get more time.</p>
      <div className="toolbar">
        <label className="field inline">
          <span>Exam date</span>
          <input type="date" value={p.examDate ?? ''} onChange={(e) => setExamDate(e.target.value || null)} />
        </label>
        {today && <span className="badge">Today is Day {today}</span>}
      </div>
      <div className="plan-grid">
        {plan.map((d) => {
          const done = d.tasks.filter((t) => p.plan[t.id] || (t.auto ?? 0) >= 1).length;
          return (
            <div key={d.day} className={`card plan-day ${today === d.day ? 'today' : ''}`}>
              <h2>
                Day {d.day} — {d.title}
              </h2>
              <p className="muted">{d.goal}</p>
              <div className="progress">
                <div style={{ width: `${(100 * done) / d.tasks.length}%` }} />
              </div>
              <p className="small muted">
                {done}/{d.tasks.length} done
              </p>
              <ul className="tasks">
                {d.tasks.map((t) => {
                  const auto = (t.auto ?? 0) >= 1;
                  const checked = Boolean(p.plan[t.id]) || auto;
                  return (
                    <li key={t.id} className={checked ? 'done' : ''}>
                      <input type="checkbox" checked={checked} disabled={auto} onChange={(e) => setPlanItem(t.id, e.target.checked)} aria-label={t.label} />
                      <span>
                        {t.link ? <a href={t.link}>{t.label}</a> : t.label}
                        {t.note && <span className="pill">{t.note}</span>}
                        {t.auto !== undefined && t.auto < 1 && <span className="muted small"> · {Math.round(t.auto * 100)}%</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {d.day === 2 && (
                <details>
                  <summary>Suggested time split for 4 hours of practice</summary>
                  <table className="data-table">
                    <tbody>
                      {alloc.map((a) => (
                        <tr key={a.topic}>
                          <td>{topicById[a.topic].name}</td>
                          <td>{a.min} min</td>
                          <td className="muted small">{pct(ts.find((t) => t.topic === a.topic)!.accuracy)} accuracy</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
