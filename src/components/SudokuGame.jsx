import { useEffect, useMemo, useState } from 'react';
import { generateSudoku, SUDOKU_LEVELS, sudokuConflicts, sudokuFilled } from '../lib/minigames';
import { Kpi } from './Ui';
import useBest from '../hooks/useBest';

function newRound(levelId) {
  const g = generateSudoku(levelId);
  return { ...g, values: g.puzzle.map((r) => r.slice()) };
}

export default function SudokuGame() {
  const [levelId, setLevelId] = useState(2);
  const [round, setRound] = useState(() => newRound(2));
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(null);
  const [notes, setNotes] = useState(false);
  const [best, considerBest] = useBest('sudoku');

  const conflicts = useMemo(() => sudokuConflicts(round.values), [round.values]);
  const won = sudokuFilled(round.values) && conflicts.size === 0;
  const givens = round.puzzle;

  useEffect(() => {
    if (won || score !== null) return undefined;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [won, score]);

  useEffect(() => {
    if (won && score === null) {
      const final = Math.max(50, round.points - seconds * 2 - mistakes * 25);
      setScore(final);
      considerBest(final);
    }
  }, [won, score, seconds, mistakes, round.points, considerBest]);

  function start(nextLevel) {
    setLevelId(nextLevel);
    setRound(newRound(nextLevel));
    setSelected(null);
    setSeconds(0);
    setMistakes(0);
    setScore(null);
    setNotes(false);
  }

  function place(v) {
    if (won || selected === null) return;
    const [r, c] = selected;
    if (givens[r][c] !== 0) return;
    const before = round.values[r][c];
    if (v !== 0 && before !== v && v !== round.solution[r][c]) setMistakes((m) => m + 1);
    setRound((prev) => {
      const values = prev.values.map((row) => row.slice());
      values[r][c] = v;
      return { ...prev, values };
    });
  }

  useEffect(() => {
    function onKey(e) {
      if (won) return;
      if (e.key >= '1' && e.key <= '9') place(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') place(0);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (!selected) {
          setSelected([0, 0]);
          return;
        }
        const [r, c] = selected;
        const nr = e.key === 'ArrowUp' ? Math.max(0, r - 1) : e.key === 'ArrowDown' ? Math.min(8, r + 1) : r;
        const nc = e.key === 'ArrowLeft' ? Math.max(0, c - 1) : e.key === 'ArrowRight' ? Math.min(8, c + 1) : c;
        setSelected([nr, nc]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const level = SUDOKU_LEVELS.find((l) => l.id === levelId);
  const wrong = selected && round.values[selected[0]][selected[1]] !== 0 && round.values[selected[0]][selected[1]] !== round.solution[selected[0]][selected[1]];

  return (
    <div className="stack">
      <div className="hero">
        <h2>Sudoku</h2>
        <p className="muted">Fill every row, column and 3×3 box with the digits 1–9. Arrow keys to move, digits to fill.</p>
      </div>

      <div className="kpis">
        <Kpi label="Time" value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`} sub="elapsed" />
        <Kpi label="Mistakes" value={mistakes} sub="wrong entries" />
        <Kpi label="Clues" value={round.clues} sub={level?.label || 'level'} />
        <Kpi label="Best score" value={best || '—'} sub="on this device" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Board</h3>
          <div className="row">
            <button className={`chip ${notes ? 'active' : ''}`} onClick={() => setNotes((n) => !n)}>Notes {notes ? 'on' : 'off'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => start(levelId)}>Restart</button>
          </div>
        </div>
        <div className="filters" style={{ marginTop: 12 }}>
          <div className="filter-group">
            <span className="filter-label">Difficulty</span>
            <div className="chips">
              {SUDOKU_LEVELS.map((l) => (
                <button key={l.id} className={`chip ${levelId === l.id ? 'active' : ''}`} onClick={() => start(l.id)}>
                  {l.label} · {l.clues} clues
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sudoku-board">
          {round.values.map((row, r) =>
            row.map((v, c) => {
              const given = givens[r][c] !== 0;
              const sel = selected && selected[0] === r && selected[1] === c;
              const peer = selected && (selected[0] === r || selected[1] === c || (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)));
              const same = selected && v !== 0 && v === round.values[selected[0]][selected[1]];
              const cls = [
                'sudoku-cell',
                given ? 'given' : '',
                sel ? 'sel' : '',
                peer ? 'peer' : '',
                same ? 'same' : '',
                conflicts.has(`${r},${c}`) ? 'conflict' : '',
                c % 3 === 2 && c !== 8 ? 'box-r' : '',
                r % 3 === 2 && r !== 8 ? 'box-b' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={`${r}-${c}`}
                  className={cls}
                  onClick={() => setSelected([r, c])}
                  aria-label={`row ${r + 1} column ${c + 1}`}
                >
                  {v !== 0 ? v : ''}
                </button>
              );
            }),
          )}
        </div>

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} className="key" onClick={() => place(n)} disabled={won}>{n}</button>
          ))}
          <button className="key" onClick={() => place(0)} disabled={won}>⌫</button>
        </div>

        {won && (
          <div className="feedback ok">
            <div className="feedback-head">
              <b>Solved in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} — {score} points</b>
              <span className="muted small">{mistakes} mistake{mistakes === 1 ? '' : 's'}</span>
            </div>
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => start(levelId)}>New puzzle</button>
            </div>
          </div>
        )}
        {wrong && <p className="bad-text small">That number breaks a rule — check its row, column or box.</p>}
      </div>
    </div>
  );
}
