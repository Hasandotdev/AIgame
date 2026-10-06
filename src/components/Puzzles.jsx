import { useRef, useState } from 'react';
import { generatePuzzle, normalizeAiPuzzle, PUZZLE_TYPES } from '../lib/puzzles';
import { aiPuzzles } from '../lib/groq';
import { checkAnswer, levelName } from '../lib/mathEngine';
import { speak } from '../lib/voice';
import { Kpi, Spinner } from './Ui';

export default function Puzzles({ game }) {
  const [difficulty, setDifficulty] = useState(2);
  const [type, setType] = useState('auto');
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(2, 'auto'));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const aiQueue = useRef([]);
  const stats = game.state.puzzles;
  const hasKey = Boolean(game.settings.apiKey);

  function load(next) {
    setPuzzle(next);
    setInput('');
    setFeedback(null);
    setHint(null);
  }

  function nextLocal() {
    if (aiQueue.current.length) {
      load(aiQueue.current.shift());
      return;
    }
    load(generatePuzzle(difficulty, type));
  }

  function generateAiSet() {
    if (!hasKey || loading) return;
    setLoading(true);
    aiPuzzles({ apiKey: game.settings.apiKey, model: game.activeModel, difficulty, count: 4 })
      .then((list) => {
        const clean = (list || []).map((p) => normalizeAiPuzzle(p, difficulty)).filter(Boolean);
        if (!clean.length) {
          setNote('The AI had nothing for us right now — here is a local puzzle instead.');
          setTimeout(() => setNote(''), 4000);
          load(generatePuzzle(difficulty, type));
        } else {
          aiQueue.current.push(...clean);
          load(aiQueue.current.shift());
        }
      })
      .catch(() => setNote('AI request failed — using the local generator.'))
      .finally(() => setLoading(false));
  }

  function submit() {
    if (feedback || !input.trim()) return;
    const ok = checkAnswer(puzzle, input);
    game.recordPuzzle(ok);
    setFeedback({ ok, given: input.trim() });
    if (!ok && game.settings.voiceMode) {
      speak([`The answer is ${puzzle.answer}.`, ...(puzzle.steps || [])].join(' '));
    }
  }

  const typeLabel = PUZZLE_TYPES.find((t) => t.id === puzzle.type)?.label || 'Puzzle';

  return (
    <div className="stack">
      <div className="hero">
        <h2>AI Number Puzzles</h2>
        <p className="muted">Sequences, missing numbers, function machines and logic traps.</p>
      </div>

      <div className="kpis">
        <Kpi label="Solved" value={`${stats.correct}/${stats.attempts}`} sub="puzzles" />
        <Kpi label="Difficulty" value={`Lv ${difficulty}`} sub={levelName(difficulty)} />
        <Kpi label="Source" value={puzzle.ai ? 'AI' : 'Local'} sub={hasKey ? 'Groq powered' : 'offline generator'} />
      </div>

      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <span className="filter-label">Type</span>
            <div className="chips">
              <button className={`chip ${type === 'auto' ? 'active' : ''}`} onClick={() => setType('auto')}>Mixed</button>
              {PUZZLE_TYPES.map((t) => (
                <button key={t.id} className={`chip ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Difficulty</span>
            <div className="chips">
              {[1, 2, 3, 4, 5].map((d) => (
                <button key={d} className={`chip ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="qcard">
        <div className="qmeta">{typeLabel} · Level {puzzle.difficulty} {levelName(puzzle.difficulty)}</div>
        <div className="qprompt">{puzzle.prompt}</div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            className="answer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer"
            disabled={Boolean(feedback)}
            autoComplete="off"
            aria-label="Puzzle answer"
          />
        </form>

        <div className="qactions">
          {!feedback && (
            <button className="btn btn-primary btn-sm" onClick={submit}>Check</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setHint(puzzle.hint)} disabled={Boolean(hint)}>
            Hint
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => speak(puzzle.prompt)}>Listen</button>
          <button className="btn btn-ghost btn-sm" onClick={nextLocal}>Next puzzle</button>
          <button className="btn btn-ghost btn-sm" onClick={generateAiSet} disabled={!hasKey || loading}>
            {loading ? 'Generating…' : 'AI puzzles'}
          </button>
        </div>

        {hint && <div className="hint-box">{hint}</div>}
        {note && <div className="note-box">{note}</div>}
        {!hasKey && <p className="muted small">Add a Groq API key in Settings for AI-generated puzzles.</p>}
        {loading && <Spinner text="The AI is crafting tricky puzzles…" />}
      </div>

      {feedback && (
        <div className={`feedback ${feedback.ok ? 'ok' : 'bad'}`}>
          <div className="feedback-head">
            <b>{feedback.ok ? 'Solved it!' : `Not this time — the answer is ${puzzle.answer}`}</b>
            <span className="muted small">you said: {feedback.given}</span>
          </div>
          <ol className="steps compact">
            {(puzzle.steps || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="row">
            <button className="btn btn-primary btn-sm" onClick={nextLocal}>Next puzzle</button>
            <button className="btn btn-ghost btn-sm" onClick={() => speak((puzzle.steps || []).join(' '))}>Hear solution</button>
          </div>
        </div>
      )}
    </div>
  );
}
