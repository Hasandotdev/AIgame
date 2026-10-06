import { useCallback, useEffect, useRef, useState } from 'react';
import { canMove, moveGrid, spawnTile } from '../lib/minigames';
import { Kpi } from './Ui';
import useBest from '../hooks/useBest';

const TILE_BG = {
  2: '#1c2a55', 4: '#22336b', 8: '#2c427f', 16: '#3550a0',
  32: '#4563c4', 64: '#5a78e8', 128: '#35e0d4', 256: '#2ec2b8',
  512: '#3ddc97', 1024: '#ffc857', 2048: '#ff9f43',
};

function freshGrid() {
  return spawnTile(spawnTile([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]));
}

export default function NumberMergeGame() {
  const [grid, setGrid] = useState(freshGrid);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [best, considerBest] = useBest('number-merge');
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const swipe = useRef(null);

  const doMove = useCallback(
    (dir) => {
      if (over) return;
      const res = moveGrid(grid, dir);
      if (!res.moved) return;
      const withTile = spawnTile(res.grid);
      setGrid(withTile);
      if (res.gained) setScore((s) => s + res.gained);
      if (!canMove(withTile)) setOver(true);
    },
    [grid, over],
  );

  useEffect(() => {
    if (over) considerBest(scoreRef.current);
  }, [over, considerBest]);

  useEffect(() => {
    function onKey(e) {
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  function restart() {
    setGrid(freshGrid());
    setScore(0);
    setOver(false);
  }

  const maxTile = Math.max(...grid.flat());

  return (
    <div className="stack">
      <div className="hero">
        <h2>Number Merge</h2>
        <p className="muted">Swipe or use arrow keys. Equal tiles merge into their sum — reach 2048 and beyond.</p>
      </div>

      <div className="kpis">
        <Kpi label="Score" value={score} sub={`best ${best || 0}`} />
        <Kpi label="Max tile" value={maxTile} sub="highest merged" />
        <Kpi label="Goal" value="2048" sub={maxTile >= 2048 ? 'reached!' : `${2048 - maxTile} to go`} />
      </div>

      <div className="qcard">
        <div
          className="merge-grid"
          onTouchStart={(e) => {
            const t = e.touches[0];
            swipe.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            if (!swipe.current) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - swipe.current.x;
            const dy = t.clientY - swipe.current.y;
            swipe.current = null;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
            doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
          }}
        >
          {grid.map((row, r) =>
            row.map((v, c) => (
              <div
                key={`${r}-${c}`}
                className={`merge-tile ${v ? 'on' : ''}`}
                style={v ? { background: TILE_BG[v] || '#ff6b81', fontSize: v > 999 ? 22 : v > 99 ? 27 : 32 } : undefined}
              >
                {v || ''}
              </div>
            )),
          )}
        </div>

        <div className="merge-controls">
          <button className="btn btn-ghost btn-sm" onClick={() => doMove('up')}>▲ Up</button>
          <button className="btn btn-ghost btn-sm" onClick={() => doMove('left')}>◀ Left</button>
          <button className="btn btn-ghost btn-sm" onClick={() => doMove('down')}>▼ Down</button>
          <button className="btn btn-ghost btn-sm" onClick={() => doMove('right')}>Right ▶</button>
        </div>

        {over && (
          <div className="feedback bad">
            <div className="feedback-head">
              <b>No moves left — {score} points</b>
              <span className="muted small">max tile {maxTile}</span>
            </div>
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={restart}>Play again</button>
            </div>
          </div>
        )}

        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={restart}>New game</button>
          <span className="muted small">Keyboard: arrow keys · Touch: swipe the grid</span>
        </div>
      </div>
    </div>
  );
}
