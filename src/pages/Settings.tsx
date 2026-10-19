import { useRef, useState } from 'react';
import { exportProgress, importProgress, resetProgress, setTheme, useProgress } from '../lib/storage';

export function Settings() {
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `econometrics-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      importProgress(await f.text());
      setMsg('Progress imported.');
    } catch (e) {
      setMsg(String((e as Error).message));
    }
  };

  return (
    <div className="page narrow">
      <h1>Settings & data</h1>
      <div className="card">
        <h3>Appearance</h3>
        <div className="seg">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} className={p.theme === t ? 'on' : ''} onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Your progress</h3>
        <p className="muted">Progress is saved automatically in this browser (localStorage). Export it to move to another computer or browser.</p>
        <div className="actions">
          <button className="btn" onClick={doExport}>
            Export progress (.json)
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            Import progress…
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Delete all answers, mistakes, mock results and plan ticks? This cannot be undone.')) {
                resetProgress();
                setMsg('Progress reset.');
              }
            }}
          >
            Reset all progress
          </button>
        </div>
        {msg && <p className="callout">{msg}</p>}
      </div>
      <div className="card">
        <h3>About the question bank</h3>
        <ul>
          <li>211 questions transcribed from “Mid-term bank of questions” (7 sections). The PDF contains no answer key; all answers were derived and the numerical ones are re-checked by automated tests.</li>
          <li>Stata questions show output re-created from the data files (WAGE1, BWGHT, KIELMC, AEJfigs and FoS, all supplied by you).</li>
          <li>All 211 answers are verified; FoS questions were checked against FoS.DTA.</li>
        </ul>
      </div>
    </div>
  );
}
