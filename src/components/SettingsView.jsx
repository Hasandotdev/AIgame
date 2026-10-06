import { useState } from 'react';
import { DEFAULT_MODEL, GROQ_MODELS, testKey } from '../lib/groq';
import { recognitionSupported, setVoiceEnabled, speak } from '../lib/voice';

export default function SettingsView({ game }) {
  const settings = game.state.settings;
  const aiKey = game.settings.apiKey;
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [nameDraft, setNameDraft] = useState(settings.name);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const modelId = settings.model === 'custom' ? settings.customModel : settings.model;
  const keySource = settings.apiKey
    ? 'This device has its own key, which overrides the shared one.'
    : game.envKey
      ? 'Using the shared key from .env (VITE_GROQ_API_KEY) — everyone on this build uses it.'
      : game.serverAI
        ? 'Using the serverless AI endpoint (/api/groq) with the server key — nothing is exposed in the browser.'
        : 'No key configured yet — AI features are off.';

  function saveKey() {
    game.updateSettings({ apiKey: keyDraft.trim() });
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2500);
  }

  function runTest() {
    setTesting(true);
    setTestResult(null);
    testKey(keyDraft.trim() || aiKey, modelId).then((res) => {
      setTesting(false);
      setTestResult(res);
    });
  }

  return (
    <div className="stack">
      <div className="hero">
        <h2>Settings</h2>
        <p className="muted">The Groq key powers the AI tutor, question generator, puzzles, daily challenge and coach.</p>
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
          <h3>Groq AI key</h3>
          {aiKey ? <span className="pill ok-pill">connected</span> : <span className="pill">not set</span>}
        </div>
        <p className="muted small">{keySource}</p>
        <label className="field">
          <span>API key</span>
          <div className="row">
            <input
              className="text-input grow"
              type={showKey ? 'text' : 'password'}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="gsk_..."
              autoComplete="off"
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowKey((v) => !v)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <p className="muted small">
          Get a free key at console.groq.com. It is stored only in this browser (localStorage) and sent only to the
          Groq API.
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={saveKey}>Save key</button>
          <button className="btn btn-ghost" onClick={runTest} disabled={testing || !keyDraft.trim()}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          {saved && <span className="ok-text small">Saved.</span>}
        </div>
        {testResult && (
          <p className={testResult.ok ? 'ok-text small' : 'bad-text small'}>{testResult.message}</p>
        )}
      </div>

      <div className="card">
        <h3 className="section-label">AI model</h3>
        <label className="field">
          <span>Groq model</span>
          <select
            className="text-input"
            value={settings.model}
            onChange={(e) => game.updateSettings({ model: e.target.value })}
          >
            {GROQ_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        {settings.model === 'custom' && (
          <label className="field">
            <span>Custom model id</span>
            <input
              className="text-input"
              value={settings.customModel}
              onChange={(e) => game.updateSettings({ customModel: e.target.value })}
              placeholder={DEFAULT_MODEL}
            />
          </label>
        )}
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
