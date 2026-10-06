import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import Game from './components/Game';
import Puzzles from './components/Puzzles';
import DailyChallenge from './components/DailyChallenge';
import CoachView from './components/CoachView';
import LeaderboardView from './components/LeaderboardView';
import SettingsView from './components/SettingsView';

const VIEWS = [
  { id: 'play', label: 'Play' },
  { id: 'puzzles', label: 'Puzzles' },
  { id: 'daily', label: 'Daily Challenge' },
  { id: 'coach', label: 'AI Coach' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const game = useGameState();
  const [view, setView] = useState('play');
  const [playTopic, setPlayTopic] = useState('auto');

  const practice = (topic) => {
    setPlayTopic(topic || 'auto');
    setView('play');
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">∑</div>
          <div className="brand-text">
            <h1>MathMind AI</h1>
            <p className="tagline">Play. Solve. Learn. Get Smarter.</p>
          </div>
        </div>

        <nav className="nav">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`nav-btn ${view === v.id ? 'active' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <div className="topstats">
          <span className="pill">Streak {game.state.daily.streak || 0}d</span>
          <span className="pill">{game.summary.totalAttempts} solved</span>
        </div>
      </header>

      <main className="page">
        {view === 'play' && <Game key={playTopic} game={game} initialTopic={playTopic} />}
        {view === 'puzzles' && <Puzzles game={game} />}
        {view === 'daily' && <DailyChallenge game={game} />}
        {view === 'coach' && <CoachView game={game} onPractice={practice} />}
        {view === 'leaderboard' && <LeaderboardView game={game} />}
        {view === 'settings' && <SettingsView game={game} />}
      </main>

      <footer className="footer">MathMind AI · AI powered by Groq · Your progress is stored on this device</footer>
    </div>
  );
}
