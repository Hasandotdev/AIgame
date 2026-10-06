import { useEffect, useRef, useState } from 'react';
import { checkAnswer, levelName, topicLabel } from '../lib/mathEngine';
import { aiCoach, aiDailyChallenge } from '../lib/groq';
import { coachFallback, summaryForPrompt, todayKey } from '../lib/analysis';
import { speak } from '../lib/voice';
import { Kpi, Spinner } from './Ui';

const COUNT = 10;

export default function DailyChallenge({ game }) {
  const date = todayKey();
  const already = game.state.daily.results[date];
  const [phase, setPhase] = useState(already ? 'done' : 'setup');
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [tally, setTally] = useState({ correct: 0, total: 0, msSum: 0, streak: 0, best: 0 });
  const [building, setBuilding] = useState(false);
  const [needAi, setNeedAi] = useState(false);
  const [result, setResult] = useState(already || null);
  const [coach, setCoach] = useState(null);
  const startedAt = useRef(0);
  const feedbackRef = useRef(false);
  const aiInflight = useRef(false);

  const hasKey = Boolean(game.settings.apiKey);
  const question = questions[idx];

  useEffect(() => {
    if (!needAi || aiInflight.current) return undefined;
    aiInflight.current = true;
    const weak = game.summary.weak.map((t) => t.label);
    const level = Math.round(
      (game.summary.played.reduce((a, t) => a + t.level, 0) / Math.max(1, game.summary.played.length)) || 1,
    );
    aiDailyChallenge({ apiKey: game.settings.apiKey, model: game.activeModel, weakTopics: weak, level, count: COUNT })
      .then((list) => {
        const clean = Array.isArray(list) ? list.slice(0, COUNT) : [];
        setQuestions(clean.length ? clean : Array.from({ length: COUNT }, () => game.genQuestion('auto')));
        startedAt.current = Date.now();
        setNeedAi(false);
        setBuilding(false);
      })
      .catch(() => {
        setQuestions(Array.from({ length: COUNT }, () => game.genQuestion('auto')));
        startedAt.current = Date.now();
        setNeedAi(false);
        setBuilding(false);
      });
    return undefined;
  }, [needAi, game, game.summary, game.settings.apiKey, game.activeModel]);

  function start() {
    setIdx(0);
    setInput('');
    setFeedback(null);
    feedbackRef.current = false;
    setTally({ correct: 0, total: 0, msSum: 0, streak: 0, best: 0 });
    setResult(null);
    setCoach(null);
    startedAt.current = Date.now();
    if (hasKey) {
      setQuestions([]);
      setBuilding(true);
      setNeedAi(true);
    } else {
      setQuestions(Array.from({ length: COUNT }, () => game.genQuestion('auto')));
      setNeedAi(false);
    }
    setPhase('quiz');
  }

  function finish(snapshot) {
    const t = snapshot;
    const rec = { correct: t.correct, total: t.total, score: t.score || 0, date };
    game.completeDaily({ date, correct: t.correct, total: t.total });
    setResult(rec);
    setPhase('done');
    const summaryText = summaryForPrompt(game.summary);
    if (hasKey) {
      setCoach({ loading: true, text: '' });
      aiCoach({
        apiKey: game.settings.apiKey,
        model: game.activeModel,
        summaryText,
        resultNote: `Daily challenge ${date}: ${t.correct}/${t.total} correct.`,
      }).then((text) => setCoach({ loading: false, text: text || coachFallback(game.summary) }));
    } else {
      setCoach({ loading: false, text: coachFallback(game.summary) });
    }
  }

  function submit() {
    if (feedbackRef.current || !question || !input.trim()) return;
    const ms = Math.max(1, Date.now() - startedAt.current);
    const ok = checkAnswer(question, input);
    game.recordAnswer({ topic: question.topic, difficulty: question.difficulty, ok, ms });
    const next = {
      correct: tally.correct + (ok ? 1 : 0),
      total: tally.total + 1,
      msSum: tally.msSum + ms,
      streak: ok ? tally.streak + 1 : 0,
      best: ok ? Math.max(tally.best, tally.streak + 1) : tally.best,
      score: (tally.score || 0) + (ok ? 100 + Math.min(tally.streak, 5) * 20 : 0),
    };
    setTally(next);
    setFeedback({ ok, given: input.trim() });
    feedbackRef.current = true;
    if (!ok && game.settings.voiceMode) {
      speak([`The correct answer is ${question.answer}.`, ...(question.steps || [])].join(' '));
    }
    setInput('');
  }

  function continueNext() {
    feedbackRef.current = false;
    setFeedback(null);
    if (tally.total >= COUNT) {
      finish(tally);
      return;
    }
    setIdx((i) => i + 1);
    startedAt.current = Date.now();
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return todayKey(d);
  });

  if (phase === 'done') {
    return (
      <div className="stack">
        <div className="hero">
          <h2>Daily Challenge — {date}</h2>
          <p className="muted">
            {result ? 'Completed. Come back tomorrow to keep your streak alive.' : 'Already completed today.'}
          </p>
        </div>
        <div className="kpis">
          <Kpi label="Streak" value={`${game.state.daily.streak}d`} sub={`best ${game.state.daily.best}d`} />
          <Kpi label="Today" value={result ? `${result.correct}/${result.total}` : `${already?.correct}/${already?.total}`} sub="correct" />
          <Kpi label="Reward" value={result ? `+${result.score || 0}` : '—'} sub="score" />
        </div>
        <div className="card">
          <h3 className="section-label">Last 7 days</h3>
          <div className="day-dots">
            {last7.map((d) => {
              const done = Boolean(game.state.daily.results[d]);
              return (
                <span key={d} className={`day-dot ${done ? 'on' : ''}`} title={d}>
                  {d.slice(8)}
                </span>
              );
            })}
          </div>
        </div>
        <div className="card coach-card">
          <div className="card-head">
            <h3>AI Coach</h3>
            {!hasKey && <span className="pill">offline mode</span>}
          </div>
          {coach?.loading ? <Spinner text="Reviewing your daily challenge…" /> : <p>{coach?.text || coachFallback(game.summary)}</p>}
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    if (building || !question) {
      return (
        <div className="stack">
          <Spinner text="Building your personalized daily challenge…" />
        </div>
      );
    }
    return (
      <div className="stack">
        <div className="hud">
          <div className="hud-item">
            <span className="hud-label">Question</span>
            <b>{tally.total + 1}/{COUNT}</b>
          </div>
          <div className="hud-item">
            <span className="hud-label">Score</span>
            <b>{tally.score || 0}</b>
          </div>
          <div className="hud-item">
            <span className="hud-label">Streak</span>
            <b>{tally.streak}</b>
          </div>
          <div className="hud-item hud-topic">
            <span className="hud-label">{topicLabel(question.topic)}</span>
            <b>Lv {question.difficulty} · {levelName(question.difficulty)}</b>
          </div>
        </div>

        <div className="qcard">
          <div className="qprompt">{question.prompt}</div>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <input
              className="answer-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer"
              disabled={Boolean(feedback)}
              autoComplete="off"
              autoFocus
              aria-label="Answer"
            />
          </form>
          <div className="qactions">
            {!feedback && <button className="btn btn-primary btn-sm" onClick={submit}>Check</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => speak(question.prompt)}>Listen</button>
            <button className="btn btn-ghost btn-sm" onClick={() => speak(question.hint)}>Hint</button>
          </div>
        </div>

        {feedback && (
          <div className={`feedback ${feedback.ok ? 'ok' : 'bad'}`}>
            <div className="feedback-head">
              <b>{feedback.ok ? 'Correct!' : `Not quite — answer: ${question.answer}`}</b>
              <span className="muted small">{tally.total}/{COUNT}</span>
            </div>
            {!feedback.ok && question.steps?.length > 0 && (
              <ol className="steps compact">
                {question.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
            <button className="btn btn-primary btn-sm" onClick={continueNext}>
              {tally.total >= COUNT ? 'Finish' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="hero">
        <h2>Today's AI Daily Challenge</h2>
        <p className="muted">
          10 questions picked for you: extra practice on weak topics, a couple of stretch problems, and a fresh
          coaching report at the end.
        </p>
      </div>
      <div className="kpis">
        <Kpi label="Streak" value={`${game.state.daily.streak}d`} sub={`best ${game.state.daily.best}d`} />
        <Kpi label="Best topic" value={game.summary.strong[0]?.label || '—'} />
        <Kpi label="Focus" value={game.summary.weak[0]?.label || 'Mixed'} sub="needs practice" />
      </div>
      <div className="card">
        <h3 className="section-label">Last 7 days</h3>
        <div className="day-dots">
          {last7.map((d) => {
            const done = Boolean(game.state.daily.results[d]);
            return (
              <span key={d} className={`day-dot ${done ? 'on' : ''}`} title={d}>
                {d.slice(8)}
              </span>
            );
          })}
        </div>
      </div>
      <button className="btn btn-primary btn-lg" onClick={start}>
        Start today's challenge
      </button>
      {!hasKey && <p className="muted small">Using your local adaptive generator for today's challenge.</p>}
    </div>
  );
}
