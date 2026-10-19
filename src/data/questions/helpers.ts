import type { OptionKey, Question, TopicId } from '../types';

export const L = String.raw;

export interface QInput extends Omit<Question, 'id' | 'topic' | 'options' | 'status'> {
  options: [string, string, string, string];
  status?: Question['status'];
}

export function section(topic: TopicId, items: QInput[]): Question[] {
  return items.map((it) => {
    const keys: OptionKey[] = ['a', 'b', 'c', 'd'];
    const options = Object.fromEntries(keys.map((k, i) => [k, it.options[i]])) as Record<OptionKey, string>;
    return {
      ...it,
      id: `${topic}-Q${String(it.number).padStart(2, '0')}`,
      topic,
      options,
      status: it.status ?? 'verified',
    };
  });
}

/** LaTeX bmatrix from rows. */
export function bm(rows: (number | string)[][]): string {
  return '\\begin{bmatrix}' + rows.map((r) => r.join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
}

export const col = (...v: (number | string)[]) => bm(v.map((x) => [x]));
