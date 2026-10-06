import { useState } from 'react';
import { aiCoach } from '../lib/groq';
import { coachFallback, summaryForPrompt } from '../lib/analysis';
import { levelName } from '../lib/mathEngine';
import { speak } from '../lib/voice';
import { AccuracyChart, Bar, Kpi, Spinner } from './Ui';

export default function CoachView({ game, onPractice }) {
  const summary = game.summary;
  const hasKey = Boolean(game.settings.apiKey);
  const [coach, setCoach] = useState({ text: coachFallback(summary), loading: false });
  const [note, setNote] = useState('');

  function refreshCoach() {
    if (!hasKey || coach.loading) return;
    setCoach({ text: coach.text, loading: true });
    aiCoach({
      apiKey: game.settings.apiKey,
      model: game.activeModel,
      summaryText: summaryForPrompt(summary),
      resultNote: '',
    }).then((text) => setCoach({ text: text || coachFallback(summary), loading: false }));
  }

  function copyCoaches() {
    speak(coach.text);
    setNote('Reading your coaching report aloud.');
    setTimeout(() => setNote(''), 3000);
  }

  const trendText = {
    improving: 'Improving',
    declining: 'Slipping',
    steady: 'Steady',
  }[summary.trend];

  return (
    <div className="stack">
      <div className="hero">
        <h2>AI Performance Analysis</h2>
        <p className="muted">Accuracy, speed, weak spots and progress — updated after every answer.</p>
      </div>

      <div className="kpis">
        <Kpi
          label="Accuracy"
          value={summary.accuracy === null ? '—' : `${Math.round(summary.accuracy * 100)}%`}
          sub={`${summary.totalCorrect}/${summary.totalAttempts} correct`}
        />
        <Kpi label="Avg solve time" value={summary.avgMs ? `${(summary.avgMs / 1000).toFixed(1)}s` : '—'} sub="per question" />
        <Kpi label="Sessions" value={summary.sessions} sub="timed rounds played" />
        <Kpi label="Trend" value={trendText} sub="last days" />
      </div>

      <div className="card coach-card">
        <div className="card-head">
          <h3>AI Coach</h3>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={copyCoaches}>Hear it</button>
            <button className="btn btn-primary btn-sm" onClick={refreshCoach} disabled={!hasKey || coach.loading}>
              {coach.loading ? 'Analyzing…' : hasKey ? 'Fresh AI analysis' : 'AI off'}
            </button>
          </div>
        </div>
        {coach.loading ? <Spinner text="AI Coach is studying your stats…" /> : <p>{coach.text}</p>}
        {note && <div className="note-box">{note}</div>}
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="section-label">Strong topics</h3>
          {summary.strong.length ? (
            summary.strong.map((t) => (
              <Bar
                key={t.id}
                label={t.label}
                value={t.accuracy}
                right={`${Math.round(t.accuracy * 100)}% · Lv ${t.level}`}
                tone="good"
              />
            ))
          ) : (
            <p className="muted">Answer a few questions in each topic to rank your strengths.</p>
          )}
        </div>

        <div className="card">
          <h3 className="section-label">Needs practice</h3>
          {summary.weak.length ? (
            summary.weak.map((t) => (
              <Bar
                key={t.id}
                label={t.label}
                value={t.accuracy}
                right={`${Math.round(t.accuracy * 100)}% · Lv ${t.level}`}
                tone="bad"
              />
            ))
          ) : (
            <p className="muted">No weak topics detected yet — keep playing.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All topics</h3>
          <span className="muted small">accuracy · speed · level</span>
        </div>
        <div className="topic-table">
          {summary.topics.map((t) => (
            <div key={t.id} className="topic-row">
              <span className="topic-name">{t.label}</span>
              <div className="bar-track">
                <div className={`bar-fill ${t.accuracy !== null && t.accuracy >= 0.75 ? 'good' : t.accuracy !== null && t.accuracy < 0.55 ? 'bad' : ''}`} style={{ width: `${Math.round((t.accuracy || 0) * 100)}%` }} />
              </div>
              <span className="topic-stat">{t.attempts ? `${Math.round(t.accuracy * 100)}%` : '—'}</span>
              <span className="topic-stat">{t.avgMs ? `${(t.avgMs / 1000).toFixed(1)}s` : '—'}</span>
              <span className="topic-stat">{t.attempts ? `Lv ${t.level} ${levelName(t.level)}` : 'unplayed'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onPractice(t.id)}>Practice</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="section-label">Progress — last 14 days</h3>
        <AccuracyChart days={summary.days} />
      </div>

      <div className="card">
        <h3 className="section-label">Recommended next steps</h3>
        <ul className="rec-list">
          {summary.weak.length > 0 ? (
            <li>
              10 focused questions on <b>{summary.weak[0].label}</b>{' '}
              <button className="link" onClick={() => onPractice(summary.weak[0].id)}>start now</button>
            </li>
          ) : (
            <li>Play a round so the AI can build your personalized plan.</li>
          )}
          {summary.trend === 'declining' && <li>Slow down: your last sessions were rushed — accuracy beats speed until the pattern is solid.</li>}
          {summary.trend === 'improving' && <li>You are trending up — try the next difficulty level on your strongest topic.</li>}
          {summary.avgMs > 15000 && <li>Your average is {(summary.avgMs / 1000).toFixed(1)}s per question. Practise mental shortcuts on arithmetic rounds.</li>}
          <li>Keep the daily streak alive — {summary.dailyStreak} day{summary.dailyStreak === 1 ? '' : 's'} so far.</li>
        </ul>
      </div>
    </div>
  );
}
