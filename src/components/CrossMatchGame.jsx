import { useEffect, useMemo, useState } from 'react';
import { generateCrossRound, CROSS_RULES } from '../lib/minigames';
import { Kpi } from './Ui';
import useBest from '../hooks/useBest';

function ruleLabel(rule) {
  if (rule.half) return '> half';
  if (rule.quarter) return '< 25%';
  return rule.label;
}

function ruleTitle(rule, max) {
  if (rule.half) return `Greater than ${Math.floor(max / 2)}`;
  if (rule.quarter) return `Less than ${Math.ceil(max / 4)}`;
  return rule.title;
}

export default function CrossMatchGame() {
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(() => generateCrossRound(1));
  const [found, setFound] = useState(() => new Set());
  const [misses, setMisses] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [phase, setPhase] = useState('playing');
  const [flash, setFlash] = useState(null);
  const [best, considerBest] = useBest('cross-match');

  const remaining = useMemo(
    () => round.matches.filter((k) => !found.has(k)),
    [round, found],
  );

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (remaining.length === 0) {
      const bonus = 60 + level * 20 - misses * 5;
      setScore((s) => s + Math.max(20, bonus));
      const nl = level + 1;
      setLevel(nl);
      setRound(generateCrossRound(nl));
      setFound(new Set());
      setMisses(0);
    }
  }, [remaining.length, phase, level, misses]);

  useEffect(() => {
    if (phase === 'playing' && (lives <= 0 || score < 0)) {
      setPhase('over');
      considerBest(Math.max(0, score));
    }
  }, [lives, score, phase, considerBest]);

  function tap(r, c) {
    if (phase !== 'playing') return;
    const key = `${r},${c}`;
    if (found.has(key)) return;
    if (round.matches.includes(key)) {
      const next = new Set(found);
      next.add(key);
      setFound(next);
      setScore((s) => s + 25);
      setFlash({ key, ok: true });
    } else {
      setMisses((m) => m + 1);
      setLives((l) => l - 1);
      setScore((s) => s - 10);
      setFlash({ key, ok: false });
    }
    window.setTimeout(() => setFlash(null), 350);
  }

  function restart() {
    setLevel(1);
    setRound(generateCrossRound(1));
    setFound(new Set());
    setMisses(0);
    setScore(0);
    setLives(5);
    setPhase('playing');
    setFlash(null);
  }

  const cols = Array.from({ length: round.size }, (_, i) => i);

  return (
    <div className="stack">
      <div className="hero">
        <h2>Cross Match</h2>
        <p className="muted">
          Every row and column has a rule. Tap each cell where <b>both</b> its row rule and column rule are true.
          Five misses and the run ends.
        </p>
      </div>

      <div className="kpis">
        <Kpi label="Score" value={Math.max(0, score)} sub={`best ${best || 0}`} />
        <Kpi label="Level" value={level} sub={`${remaining.length} left to find`} />
        <Kpi label="Lives" value={lives} sub={`${misses} misses`} />
        <Kpi label="Board" value={`${round.size}×${round.size}`} sub={`numbers 1–${round.max}`} />
      </div>

      <div className="qcard">
        <div className="qmeta">Row rule × column rule — find the intersections</div>

        <div
          className="cross-grid"
          style={{ gridTemplateColumns: `minmax(64px, auto) repeat(${round.size}, minmax(54px, 1fr))` }}
        >
          <div className="cross-corner" title="Row rules go across, column rules go down">row ↓ / col →</div>
          {cols.map((c) => (
            <div key={`h-${c}`} className="cross-rule" title={ruleTitle(round.colRules[c], round.max)}>
              {ruleLabel(round.colRules[c])}
            </div>
          ))}

          {cols.map((r) => (
            <div key={`row-${r}`} className="cross-contents">
              <div className="cross-rule" title={ruleTitle(round.rowRules[r], round.max)}>
                {ruleLabel(round.rowRules[r])}
              </div>
              {cols.map((c) => {
                const key = `${r},${c}`;
                const cls = [
                  'cross-cell',
                  found.has(key) ? 'found' : '',
                  flash && flash.key === key ? (flash.ok ? 'hit' : 'miss') : '',
                ].filter(Boolean).join(' ');
                return (
                  <button key={key} className={cls} onClick={() => tap(r, c)} aria-label={`cell ${key}`}>
                    {round.grid[r][c]}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="row">
          <span className="muted small">
            Tap cells where the row rule AND column rule both hold. Wrong taps cost a life and 10 points.
          </span>
          <button className="btn btn-ghost btn-sm" onClick={restart}>New board</button>
        </div>

        {phase === 'over' && (
          <div className="feedback bad">
            <div className="feedback-head">
              <b>Out of lives — {Math.max(0, score)} points (level {level})</b>
              <span className="muted small">{misses} misses</span>
            </div>
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={restart}>Play again</button>
            </div>
          </div>
        )}

        <p className="muted small">
          Rules in play: {[...new Set([...round.rowRules, ...round.colRules])]
            .map((r) => `${ruleLabel(r)} = ${ruleTitle(r, round.max)}`)
            .join(' · ')}
        </p>
        <p className="muted small hide-sm">Available rules: {CROSS_RULES.map((r) => `${r.label} (${r.title})`).join(', ')}</p>
      </div>
    </div>
  );
}
