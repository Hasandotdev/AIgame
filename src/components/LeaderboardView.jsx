import { useEffect, useState } from 'react';
import { cloudEnabled, fetchTopScores } from '../lib/cloud';
import { Spinner } from './Ui';

export default function LeaderboardView({ game }) {
  const rows = game.state.leaderboard;
  const [global, setGlobal] = useState(() => (cloudEnabled() ? undefined : []));

  useEffect(() => {
    if (!cloudEnabled()) return undefined;
    let alive = true;
    fetchTopScores(20).then((data) => {
      if (alive) setGlobal(data || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const renderTable = (list, keyName) => (
    <div className="card table-card">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Score</th>
            <th>Accuracy</th>
            <th>Correct</th>
            <th>Mode</th>
            <th>{keyName === 'global' ? 'Date' : 'Date'}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={r.ts || r.id} className={i === 0 ? 'top-row' : ''}>
              <td>{i + 1}</td>
              <td><b>{r.name}</b></td>
              <td>{r.score}</td>
              <td>{Math.round((r.accuracy || 0) * 100)}%</td>
              <td>{r.correct}/{r.total}</td>
              <td>{r.mode}</td>
              <td>{r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="stack">
      <div className="hero">
        <h2>Leaderboard</h2>
        <p className="muted">Global scores from every player, plus your best on this device.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Global top scores</h3>
          <span className="pill">{cloudEnabled() ? 'Supabase sync on' : 'local only'}</span>
        </div>
        {global === undefined ? (
          <Spinner text="Loading global leaderboard…" />
        ) : global === null ? (
          <p className="bad-text small">
            Could not reach Supabase. Check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env and run
            supabase/schema.sql in the SQL editor.
          </p>
        ) : global.length === 0 ? (
          <p className="muted">No global scores yet — be the first. Save a score after any round.</p>
        ) : (
          renderTable(global, 'global')
        )}
        {!cloudEnabled() && (
          <p className="muted small">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, run supabase/schema.sql in Supabase, then
            restart the app to enable the shared leaderboard.
          </p>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>This device</h3>
          <span className="pill">{rows.length} score{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? (
          <p className="muted">No scores yet. Finish a timed round on the Play tab and save your score.</p>
        ) : (
          renderTable(rows, 'local')
        )}
      </div>
    </div>
  );
}
