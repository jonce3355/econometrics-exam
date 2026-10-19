import { useEffect, useState } from 'react';
import { useRoute, href } from './lib/router';
import { useProgress } from './lib/storage';
import { Dashboard } from './pages/Dashboard';
import { Learn } from './pages/Learn';
import { Practice } from './pages/Practice';
import { Variations } from './pages/Variations';
import { Mock } from './pages/Mock';
import { Mistakes } from './pages/Mistakes';
import { Formulas } from './pages/Formulas';
import { Plan } from './pages/Plan';
import { Bank } from './pages/Bank';
import { Settings } from './pages/Settings';
import { mistakes } from './lib/stats';

const NAV = [
  { path: '/', label: 'Dashboard', icon: '⌂' },
  { path: '/learn', label: 'Learn', icon: '📘' },
  { path: '/practice', label: 'Practice', icon: '✎' },
  { path: '/variations', label: 'Different numbers', icon: '🔢' },
  { path: '/mock', label: 'Mock exam', icon: '⏱' },
  { path: '/mistakes', label: 'Mistakes', icon: '⚠' },
  { path: '/formulas', label: 'Formula sheet', icon: 'Σ' },
  { path: '/plan', label: '3-day plan', icon: '🗓' },
  { path: '/bank', label: 'Answer key', icon: '🗂' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];

export function App() {
  const route = useRoute();
  const progress = useProgress();
  const [menu, setMenu] = useState(false);
  const activeMistakes = mistakes(progress).filter((m) => m.active).length;

  useEffect(() => {
    const root = document.documentElement;
    if (progress.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', progress.theme);
  }, [progress.theme]);
  useEffect(() => setMenu(false), [route]);

  const key = route.path + '?' + route.params.toString();
  let page;
  switch (route.path) {
    case '/learn':
      page = <Learn />;
      break;
    case '/practice':
      page = <Practice key={key} />;
      break;
    case '/variations':
      page = <Variations />;
      break;
    case '/mock':
      page = <Mock />;
      break;
    case '/mistakes':
      page = <Mistakes />;
      break;
    case '/formulas':
      page = <Formulas />;
      break;
    case '/plan':
      page = <Plan />;
      break;
    case '/bank':
      page = <Bank />;
      break;
    case '/settings':
      page = <Settings />;
      break;
    default:
      page = <Dashboard />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={() => setMenu(!menu)}>
          ☰
        </button>
        <a className="brand" href="#/">
          <span className="brand-mark">β̂</span> Econometrics Exam Trainer
        </a>
      </header>
      <nav className={`sidebar ${menu ? 'open' : ''}`}>
        <a className="brand side-brand" href="#/">
          <span className="brand-mark">β̂</span>
          <span>
            Econometrics
            <br />
            <small>Exam Trainer</small>
          </span>
        </a>
        {NAV.map((n) => (
          <a key={n.path} href={href(n.path)} className={route.path === n.path || (n.path === '/' && route.path === '') ? 'active' : ''}>
            <span className="nav-icon" aria-hidden>
              {n.icon}
            </span>
            {n.label}
            {n.path === '/mistakes' && activeMistakes > 0 && <span className="count">{activeMistakes}</span>}
          </a>
        ))}
      </nav>
      <main className="main">{page}</main>
    </div>
  );
}
