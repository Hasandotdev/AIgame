import { useState } from 'react';
import { recognitionSupported, setVoiceEnabled, speak } from '../lib/voice';

export default function SettingsView({ game }) {
  const settings = game.state.settings;
  const [nameDraft, setNameDraft] = useState(settings.name);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="stack">
      <div className="hero">
        <h2>Settings</h2>
        <p className="muted">Profile, voice and data preferences for MathMind AI.</p>
      </div>

      <div className="card">
        <h3 className="section-label">Profile</h3>
        <label className="field">
          <span>Display name (used on the leaderboard)</span>
          <input
            className="text-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => game.updateSettings({ name: nameDraft.trim() })}
            placeholder="Player"
          />
        </label>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>AI Voice Mode</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.voiceMode}
              onChange={(e) => {
                game.updateSettings({ voiceMode: e.target.checked });
                setVoiceEnabled(e.target.checked);
                if (e.target.checked) speak('Voice mode is on. I can read questions and explain answers for you.');
              }}
            />
            <span className="slider" />
          </label>
        </div>
        <p className="muted small">
          Voice mode speaks explanations after mistakes and lets you use the mic in a round: say a number to answer,
          or say “explain this question”.
        </p>
        {!recognitionSupported() && (
          <p className="bad-text small">Microphone commands are not supported in this browser — text-to-speech still works. Try Chrome or Edge.</p>
        )}
      </div>

      <div className="card">
        <h3 className="section-label">Data</h3>
        <p className="muted small">
          Progress, stats and leaderboard live in this browser only. Resetting clears everything except your settings.
        </p>
        {confirmReset ? (
          <div className="row">
            <button className="btn btn-danger" onClick={() => { game.resetProgress(); setConfirmReset(false); }}>
              Yes, erase my progress
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirmReset(true)}>Reset progress</button>
        )}
      </div>

      <div className="card">
        <h3 className="section-label">About</h3>
        <p>
          <b>MathMind AI</b> — Play. Solve. Learn. Get Smarter.
        </p>
        <p className="muted small">
          Adaptive difficulty, AI tutor, AI question &amp; puzzle generators, daily challenges, voice mode and
          performance analysis. AI features run on Groq; everything else works offline.
        </p>
      </div>
    </div>
  );
}
