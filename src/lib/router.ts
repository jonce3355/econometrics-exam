import { useSyncExternalStore } from 'react';

export interface Route {
  path: string;
  params: URLSearchParams;
}

function parse(): Route {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  return { path: path || '/', params: new URLSearchParams(query) };
}

let current = typeof window === 'undefined' ? { path: '/', params: new URLSearchParams() } : parse();
let currentHash = typeof window === 'undefined' ? '' : window.location.hash;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (window.location.hash === currentHash) return;
    currentHash = window.location.hash;
    current = parse();
    subs.forEach((s) => s());
    window.scrollTo(0, 0);
  });
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
  );
}

export function href(path: string, params?: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return `#${path}${s ? '?' + s : ''}`;
}

export function navigate(path: string, params?: Record<string, string | number | undefined>) {
  window.location.hash = href(path, params).slice(1);
}
