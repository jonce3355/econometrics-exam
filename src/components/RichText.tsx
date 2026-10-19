import katex from 'katex';
import { Fragment, memo, type ReactNode } from 'react';

const cache = new Map<string, string>();

function renderMath(tex: string, display: boolean): string {
  const key = (display ? 'D' : 'I') + tex;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
    cache.set(key, html);
  }
  return html;
}

const ESC_DOLLAR = '\u0000';

/** Inline markdown-ish formatting: **bold**, *italic*, `code`. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  const plain = (s: string) => s.split(ESC_DOLLAR).join('$');
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(plain(text.slice(last, m.index)));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={`${key}b${i++}`}>{plain(tok.slice(2, -2))}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={`${key}c${i++}`}>{plain(tok.slice(1, -1))}</code>);
    else out.push(<em key={`${key}e${i++}`}>{plain(tok.slice(1, -1))}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(plain(text.slice(last)));
  return out;
}

/**
 * Renders text containing $inline$ and $$display$$ LaTeX plus light markdown.
 * A literal dollar sign is written as \$ (used for currency).
 */
export const RichText = memo(function RichText({ text, block = false }: { text: string; block?: boolean }) {
  const src = text.replace(/\\`/g, '`').replace(/\\\$/g, ESC_DOLLAR);
  const parts: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) parts.push(<Fragment key={`t${i}`}>{inline(src.slice(last, m.index), `t${i}`)}</Fragment>);
    if (m[1] !== undefined) {
      parts.push(<span key={`d${i}`} className="math-display" dangerouslySetInnerHTML={{ __html: renderMath(m[1].split(ESC_DOLLAR).join('\\$'), true) }} />);
    } else {
      parts.push(<span key={`m${i}`} dangerouslySetInnerHTML={{ __html: renderMath(m[2].split(ESC_DOLLAR).join('\\$'), false) }} />);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < src.length) parts.push(<Fragment key="end">{inline(src.slice(last), 'end')}</Fragment>);
  return block ? <div className="rich">{parts}</div> : <span className="rich">{parts}</span>;
});
