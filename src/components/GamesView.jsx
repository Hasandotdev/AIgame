import { useEffect, useState } from 'react';
import SudokuGame from './SudokuGame';
import NumberMatchGame from './NumberMatchGame';
import NumberMergeGame from './NumberMergeGame';
import CrossMatchGame from './CrossMatchGame';
import useBest from '../hooks/useBest';

const GAMES = [
  {
    id: 'sudoku',
    label: 'Sudoku',
    icon: '9×9',
    desc: 'Classic 9×9 logic grid — three difficulties, keyboard friendly.',
    bestKey: 'sudoku',
    bestLabel: 'best score',
  },
  {
    id: 'number-match',
    label: 'Number Match',
    icon: '+10',
    desc: 'Tap pairs that add up to the target before the clock runs out.',
    bestKey: 'number-match',
    bestLabel: 'best score',
  },
  {
    id: 'number-merge',
    label: 'Number Merge',
    icon: '2048',
    desc: 'Slide and merge equal tiles — swipe or arrow keys.',
    bestKey: 'number-merge',
    bestLabel: 'best score',
  },
  {
    id: 'cross-match',
    label: 'Cross Match',
    icon: '×÷',
    desc: 'Row rule meets column rule — find every true intersection.',
    bestKey: 'cross-match',
    bestLabel: 'best score',
  },
];

function GameCard({ game, onOpen }) {
  const [best] = useBest(game.bestKey);
  return (
    <button className="mode-card" onClick={() => onOpen(game.id)}>
      <span className="hero-kicker">{game.icon}</span>
      <b>{game.label}</b>
      <span className="muted small">{game.desc}</span>
      <span className="pill">{best ? `${game.bestLabel}: ${best}` : 'not played yet'}</span>
    </button>
  );
}

const GAME_IDS = GAMES.map((g) => g.id);

function gameFromHash() {
  const id = (window.location.hash || '').replace('#', '');
  return GAME_IDS.includes(id) ? id : null;
}

export default function GamesView() {
  const [active, setActive] = useState(gameFromHash);

  useEffect(() => {
    const onHash = () => setActive(gameFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = (id) => {
    window.location.hash = id;
    setActive(id);
  };

  const back = () => {
    window.location.hash = 'games';
    setActive(null);
  };

  if (active === 'sudoku') return <BackWrapper onBack={back}><SudokuGame /></BackWrapper>;
  if (active === 'number-match') return <BackWrapper onBack={back}><NumberMatchGame /></BackWrapper>;
  if (active === 'number-merge') return <BackWrapper onBack={back}><NumberMergeGame /></BackWrapper>;
  if (active === 'cross-match') return <BackWrapper onBack={back}><CrossMatchGame /></BackWrapper>;

  return (
    <div className="stack">
      <div className="hero">
        <h2>Mini Games</h2>
        <p className="muted">Four quick games that keep your number sense sharp between rounds.</p>
      </div>
      <div className="mode-grid">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} onOpen={open} />
        ))}
      </div>
    </div>
  );
}

function BackWrapper({ onBack, children }) {
  return (
    <div className="stack">
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={() => onBack(null)}>← All games</button>
      </div>
      {children}
    </div>
  );
}
