import { useMemo, useState } from 'react';
import { FORMULAS } from '../data/formulas';
import { QUESTIONS } from '../data/bank';
import { TOPICS } from '../data/skills';
import { RichText } from '../components/RichText';
import { href } from '../lib/router';

export function Formulas() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string>('all');
  const related = useMemo(() => Object.fromEntries(FORMULAS.map((f) => [f.id, QUESTIONS.filter((q) => f.skills.includes(q.skill)).map((q) => q.id)])), []);
  const ql = query.trim().toLowerCase();
  const list = FORMULAS.filter((f) => (topic === 'all' || f.topic === topic) && (!ql || [f.title, f.symbols, f.calculates, f.when, f.example, f.mistakes, f.latex].join(' ').toLowerCase().includes(ql)));

  return (
    <div className="page">
      <h1>Formula sheet</h1>
      <p className="lead">
        Every formula from your teacher's formula sheet, organised by topic. The sheet deliberately uses different letters from the exam (e.g. $Z,\theta,q,\nu,\tau^2,m,p,h$ instead of $X,\beta,y,\varepsilon,\sigma^2,n,k,q$) — the bank notation is shown where it helps.
      </p>
      <div className="toolbar">
        <input className="search" placeholder="Search formulas (e.g. variance, F, log, rescale)…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">All topics</option>
          {TOPICS.filter((t) => t.id !== 'STATA').map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {TOPICS.map((t) => {
        const fs = list.filter((f) => f.topic === t.id);
        if (!fs.length) return null;
        return (
          <section key={t.id}>
            <h2>{t.name}</h2>
            <div className="formula-grid">
              {fs.map((f) => (
                <div key={f.id} className="card formula">
                  <h3>{f.title}</h3>
                  <RichText text={`$$${f.latex}$$`} block />
                  <dl>
                    <dt>Symbols</dt>
                    <dd>
                      <RichText text={f.symbols} />
                    </dd>
                    <dt>Calculates</dt>
                    <dd>
                      <RichText text={f.calculates} />
                    </dd>
                    <dt>When to use</dt>
                    <dd>
                      <RichText text={f.when} />
                    </dd>
                    <dt>Worked example</dt>
                    <dd>{f.example.includes('\\') ? <RichText text={`$${f.example}$`} /> : <RichText text={f.example} />}</dd>
                    <dt>Common mistakes</dt>
                    <dd>
                      <RichText text={f.mistakes} />
                    </dd>
                    <dt>Related questions</dt>
                    <dd className="related">
                      {related[f.id].length === 0 && <span className="muted">—</span>}
                      {related[f.id].map((id) => (
                        <a key={id} href={href('/learn', { q: id })}>
                          {id}
                        </a>
                      ))}
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!list.length && <p className="muted">No formulas match “{query}”.</p>}
    </div>
  );
}
