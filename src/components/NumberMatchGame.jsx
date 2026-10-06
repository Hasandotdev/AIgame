import { useEffect, useMemo, useState } from 'react';
import { generateMatchBoard, matchTargetForLevel } from '../lib/minigames';
import { Kpi } from './Ui';
import useBest from '../hooks/useBest';

const LEVEL_SECONDS = 45;

function makeTiles(level) {
  const target = matchTargetForLevel(level);
  const values = generateMatchBoard(24, target);
  return values.map((v, i) => ({ id: `${level}-${i}`, v, gone: false, wrong: false }));
}

export default function NumberMatchGame() {
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(() => matchTargetForLevel(1));
  const [tiles, setTiles] = useState(() => makeTiles(1));
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LEVEL_SECONDS);
  const [phase, setPhase] = useState('playing');
  const [best, considerBest] = useBest('number-match');

  const cleared = useMemo(() => tiles.filter((t) => t.gone).length, [tiles]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      setPhase('over');
      considerBest(score);
    }
  }, [timeLeft, phase, score, considerBest]);

  function nextLevel() {
    const nl = level + 1;
    setLevel(nl);
    setTarget(matchTargetForLevel(nl));
    setTiles(makeTiles(nl));
    setPicked(null);
    setCombo(0);
    setTimeLeft(LEVEL_SECONDS + Math.min(15, nl * 3));
    setScore((s) => s + 50);
  }

  function tap(tile) {
    if (phase !== 'playing' || tile.gone) return;
    if (!picked || picked.id === tile.id) {
      setPicked(tile);
      return;
    }
    const sum = picked.v + tile.v;
    if (sum === target) {
      const gain = 100 + Math.min(combo, 8) * 25;
      const next = tiles.map((t) =>
        t.id === picked.id || t.id === tile.id ? { ...t, gone: true, wrong: false } : t,
      );
      setTiles(next);
      setPicked(null);
      setCombo((c) => c + 1);
      setScore((s) => s + gain);
      if (next.every((t) => t.gone)) nextLevel();
    } else {
      const mark = new Set([picked.id, tile.id]);
      setTiles((prev) => prev.map((t) => (mark.has(t.id) ? { ...t, wrong: true } : t)));
      setPicked(null);
      setCombo(0);
      window.setTimeout(() => {
        setTiles((prev) => prev.map((t) => (mark.has(t.id) ? { ...t, wrong: false } : t)));
      }, 380);
    }
  }

  function restart() {
    setLevel(1);
    setTarget(matchTargetForLevel(1));
    setTiles(makeTiles(1));
    setPicked(null);
    setScore(0);
    setCombo(0);
    setTimeLeft(LEVEL_SECONDS);
    setPhase('playing');
  }

  return (
    <div className="stack">
      <div className="hero">
        <h2>Number Match</h2>
        <p className="muted">Tap two tiles that add up to the target. Clear the board before the clock hits zero.</p>
      </div>

      <div className="kpis">
        <Kpi label="Score" value={score} sub={`best ${best || 0}`} />
        <Kpi label="Target" value={target} sub="sum the pair" />
        <Kpi label="Level" value={level} sub={`${cleared}/${tiles.length} cleared`} />
        <Kpi
          label="Time"
          value={`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
          sub={combo > 1 ? `combo ×${combo}` : 'clock'}
        />
      </div>

      <div className="qcard">
        <div className="qmeta">Match pairs that make {target}</div>

        <div className="nm-grid">
          {tiles.map((t) => (
            <button
              key={t.id}
              className={[
                'nm-tile',
                t.gone ? 'gone' : '',
                picked && picked.id === t.id ? 'picked' : '',
                t.wrong ? 'wrong' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => tap(t)}
              disabled={t.gone}
              aria-label={`tile ${t.v}`}
            >
              {t.v}
            </button>
          ))}
        </div>

        <div className="row">
          {phase === 'playing' ? (
            <>
              <span className="muted small">{tiles.length - cleared} tiles left · combo resets on a wrong pair</span>
              <button className="btn btn-ghost btn-sm" onClick={restart}>Restart</button>
            </>
          ) : (
            <>
              <b>Time up — {score} points (level {level})</b>
              <button className="btn btn-primary btn-sm" onClick={restart}>Play again</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
