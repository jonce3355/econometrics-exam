import type { ReactNode } from 'react';
import { RichText } from './RichText';
import { questionById } from '../data/bank';
import { skillById } from '../data/skills';
import { letter, type ViewQ } from '../lib/view';
import { href } from '../lib/router';

export function Step({ n, title, children, tone }: { n?: number | string; title: string; children: ReactNode; tone?: 'ok' | 'bad' | 'tip' }) {
  return (
    <section className={`step ${tone ? 'step-' + tone : ''}`}>
      <h4>
        {n !== undefined && <span className="step-n">{n}</span>}
        {title}
      </h4>
      <div className="step-body">{children}</div>
    </section>
  );
}

export function ConceptStep({ skill, n = 2 }: { skill: string; n?: number }) {
  const s = skillById[skill];
  return (
    <Step n={n} title={`Identify the concept — ${s.name}`}>
      <RichText text={s.concept} block />
    </Step>
  );
}

export function FormulaStep({ skill, n = 3 }: { skill: string; n?: number }) {
  const s = skillById[skill];
  return (
    <Step n={n} title="The formula / rule">
      {s.formula ? <RichText text={s.formula} block /> : <p className="muted">No calculation — this is a concept question. Use the rule in step 2.</p>}
      {s.formulaNotes && <RichText text={s.formulaNotes} block />}
    </Step>
  );
}

export function SolutionSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="solution">
      {steps.map((s, i) => (
        <li key={i}>
          <RichText text={s} />
        </li>
      ))}
    </ol>
  );
}

/** Answer + explanation shown after submitting (Practice, Mock review, Mistakes). */
export function AnswerExplanation({ q, selected, full = true, review = false }: { q: ViewQ; selected: number | null; full?: boolean; review?: boolean }) {
  const skill = skillById[q.skill];
  const correct = q.correctIndex;
  const ok = selected !== null && selected === correct;
  if (q.source === 'variation' && q.gen) {
    return (
      <div className="explain">
        <Verdict ok={ok} selected={selected} correct={correct} review={review} />
        <Step title="Solution">
          <SolutionSteps steps={q.gen.steps} />
          <RichText text={q.gen.explanation} block />
        </Step>
        {full && (
          <Step title="Exam shortcut" tone="tip">
            <RichText text={skill.shortcut} block />
          </Step>
        )}
      </div>
    );
  }
  const orig = questionById[q.qid!];
  return (
    <div className="explain">
      <Verdict ok={ok} selected={selected} correct={correct} review={review} />
      {orig.flags && <Flags flags={orig.flags} />}
      <Step title="Step-by-step solution">
        <SolutionSteps steps={orig.steps} />
      </Step>
      <Step title="Why this answer is correct" tone="ok">
        <RichText text={orig.why} block />
      </Step>
      {orig.wrong && q.optionKeys && (
        <Step title="Why the other options are wrong" tone="bad">
          <ul className="wrong-list">
            {q.optionKeys.map((k, i) =>
              orig.wrong![k] && i !== correct ? (
                <li key={k}>
                  <strong>{letter(i)}.</strong> <RichText text={orig.wrong![k]!} />
                </li>
              ) : null,
            )}
          </ul>
        </Step>
      )}
      {full && orig.trap && (
        <Step title="Common trap" tone="bad">
          <RichText text={orig.trap} block />
        </Step>
      )}
      {full && (
        <Step title="Exam shortcut" tone="tip">
          <RichText text={skill.shortcut} block />
        </Step>
      )}
      {full && (
        <p className="muted small">
          Need the full lesson? <a href={href('/learn', { q: orig.id })}>Open {orig.id} in Learn mode</a> · <a href={href('/variations', { skill: q.skill })}>Practise with different numbers</a>
        </p>
      )}
    </div>
  );
}

export function Verdict({ ok, selected, correct, review }: { ok: boolean; selected: number | null; correct: number | null; review?: boolean }) {
  if (correct !== null && review) return <div className="callout ok">Answer: <strong>{letter(correct)}</strong></div>;
  if (correct === null) return <div className="callout warn">The answer to this question cannot be verified yet (data file missing). It is not scored.</div>;
  if (selected === null) return <div className="callout bad">Not answered. The correct answer is <strong>{letter(correct)}</strong>.</div>;
  return ok ? (
    <div className="callout ok">
      <strong>Correct!</strong> The answer is {letter(correct)}.
    </div>
  ) : (
    <div className="callout bad">
      <strong>Not quite.</strong> You chose {letter(selected)}; the correct answer is <strong>{letter(correct)}</strong>.
    </div>
  );
}

export function Flags({ flags }: { flags: string[] }) {
  return (
    <div className="callout warn">
      <strong>Review note</strong>
      <ul>
        {flags.map((f, i) => (
          <li key={i}>
            <RichText text={f} />
          </li>
        ))}
      </ul>
    </div>
  );
}
