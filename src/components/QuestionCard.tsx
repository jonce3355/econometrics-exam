import { RichText } from './RichText';
import { letter, type ViewQ } from '../lib/view';
import { topicById } from '../data/skills';

interface Props {
  q: ViewQ;
  selected: number | null;
  onSelect?: (i: number) => void;
  /** Show correct / incorrect colouring. */
  revealed?: boolean;
  /** Hide the source badge (e.g. during a mock exam). */
  hideMeta?: boolean;
  number?: number;
}

export function QuestionMeta({ q }: { q: ViewQ }) {
  return (
    <div className="qmeta">
      <span className="badge">{topicById[q.topic].short}</span>
      {q.source === 'original' ? <span className="badge badge-src">Original · {q.qid}</span> : <span className="badge badge-var">Generated variation</span>}
    </div>
  );
}

export function QuestionBody({ q }: { q: ViewQ }) {
  return (
    <>
      <RichText text={q.stem} block />
      {q.table && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {q.table.headers.map((h, i) => (
                  <th key={i}>
                    <RichText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      <RichText text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.code && (
        <div className="code-block">
          <div className="code-label">Stata commands</div>
          <pre>{q.code}</pre>
        </div>
      )}
      {q.output && (
        <div className="code-block output">
          <div className="code-label">Stata output {q.source === 'original' ? '(re-created from the data)' : '(simulated)'}</div>
          <pre>{q.output}</pre>
        </div>
      )}
      {q.outputMissing && <div className="callout warn">The output for this question needs <code>FoS.DTA</code>, which has not been supplied yet.</div>}
      {q.after && <RichText text={q.after} block />}
    </>
  );
}

export function QuestionCard({ q, selected, onSelect, revealed, hideMeta, number }: Props) {
  return (
    <div className="qcard">
      {!hideMeta && <QuestionMeta q={q} />}
      {number !== undefined && <div className="qnum">Question {number}</div>}
      <QuestionBody q={q} />
      <div className="options" role="radiogroup">
        {q.options.map((o, i) => {
          let cls = 'option';
          if (selected === i) cls += ' selected';
          if (revealed && q.correctIndex !== null) {
            if (i === q.correctIndex) cls += ' correct';
            else if (selected === i) cls += ' wrong';
          }
          return (
            <button key={i} type="button" role="radio" aria-checked={selected === i} className={cls} disabled={!onSelect} onClick={() => onSelect?.(i)}>
              <span className="opt-letter">{letter(i)}</span>
              <span className="opt-text">
                <RichText text={o} />
              </span>
              {revealed && q.correctIndex === i && <span className="opt-mark">✓</span>}
              {revealed && selected === i && q.correctIndex !== i && <span className="opt-mark">✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
