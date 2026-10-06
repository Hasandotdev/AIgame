import { useEffect, useRef, useState } from 'react';
import { chooseTopic, checkAnswer, levelName, scoreFor, topicLabel, TOPICS, verifyAiQuestion } from '../lib/mathEngine';
import { aiCoach, aiExplain, aiGenerateQuestions, aiHint } from '../lib/groq';
import { coachFallback, summaryForPrompt } from '../lib/analysis';
import { listenOnce, recognitionSupported, speak, stopSpeaking } from '../lib/voice';
import { localExplanation } from '../lib/explain';
import { cloudEnabled, submitScore } from '../lib/cloud';
import TutorPanel from './TutorPanel';
import { Kpi, Spinner } from './Ui';

const MODES = [
  { id: 'sprint', label: '60s Sprint', desc: 'As many questions as you can in 60 seconds', seconds: 60, count: null },
  { id: 'marathon', label: '120s Marathon', desc: 'Two minutes of non-stop adaptive math', seconds: 120, count: null },
  { id: 'practice', label: 'Practice', desc: '10 questions, no timer, full explanations', seconds: null, count: 10 },
];

const EMPTY_TALLY = { score: 0, correct: 0, total: 0, msSum: 0, streak: 0, best: 0, hints: 0, perTopic: {} };

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];

export default function Game({ game, initialTopic }) {
  const [phase, setPhase] = useState('setup');
  const [modeId, setModeId] = useState('sprint');
  const [topicSel, setTopicSel] = useState(initialTopic || 'auto');
  const [question, setQuestion] = useState(null);
  const [input, setInput] = useState('');
  const [hint, setHint] = useState(null);
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [tally, setTally] = useState(EMPTY_TALLY);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [coach, setCoach] = useState(null);
  const [tutor, setTutor] = useState(null);
  const [note, setNote] = useState('');
  const [listening, setListening] = useState(false);
  const [scoreName, setScoreName] = useState(game.settings.name || '');
  const [savedScore, setSavedScore] = useState(false);
  const [sync, setSync] = useState('local');

  const mode = MODES.find((m) => m.id === modeId) || MODES[0];
  const aiQueue = useRef([]);
  const aiBusy = useRef(false);
  const feedbackRef = useRef(null);
  const voiceBusy = useRef(false);
  const endedRef = useRef(false);
  const coachUsedRef = useRef(false);
  const startedAtRef = useRef(0);
  const autoNextRef = useRef(null);
  const inputRef = useRef(null);
  const phaseRef = useRef('setup');
  const endGameRef = useRef(() => {});
  phaseRef.current = phase;

  const hasKey = Boolean(game.settings.apiKey);
  const voiceOn = game.settings.voiceMode && recognitionSupported();

  function setFb(value) {
    feedbackRef.current = value;
    setFeedback(value);
  }

  function clearAutoNext() {
    if (autoNextRef.current) {
      clearTimeout(autoNextRef.current);
      autoNextRef.current = null;
    }
  }

  function refillAi() {
    if (!hasKey || aiBusy.current || aiQueue.current.length >= 4) return;
    aiBusy.current = true;
    const topic = topicSel === 'auto' ? chooseTopic(game.state.topics, 'auto') : topicSel;
    const level = game.state.topics[topic]?.level || 1;
    aiGenerateQuestions({ apiKey: game.settings.apiKey, model: game.activeModel, topic, difficulty: level, count: 5 })
      .then((qs) => {
        if (qs) aiQueue.current.push(...qs.filter(verifyAiQuestion));
      })
      .catch(() => {})
      .finally(() => {
        aiBusy.current = false;
      });
  }

  function nextQuestion() {
    let q = aiQueue.current.shift();
    if (!q) q = game.genQuestion(topicSel);
    setQuestion(q);
    setInput('');
    setHint(null);
    setFb(null);
    startedAtRef.current = Date.now();
    refillAi();
  }

  function startGame() {
    endedRef.current = false;
    coachUsedRef.current = false;
    setTally(EMPTY_TALLY);
    setResult(null);
    setCoach(null);
    setSavedScore(false);
    setTimeLeft(mode.seconds || 0);
    setPhase('play');
    aiQueue.current = [];
    nextQuestion();
    refillAi();
  }

  function endGame(snapshot) {
    if (endedRef.current) return;
    endedRef.current = true;
    clearAutoNext();
    stopSpeaking();
    const t = snapshot || tally;
    const session = {
      mode: mode.label,
      topic: topicSel === 'auto' ? 'Auto' : topicLabel(topicSel),
      score: t.score,
      correct: t.correct,
      total: t.total,
      accuracy: t.total ? t.correct / t.total : 0,
      avgMs: t.total ? Math.round(t.msSum / t.total) : 0,
      seconds: mode.seconds,
    };
    if (t.total > 0) game.saveSession(session);
    setResult({ session, summary: game.summary });
    setFb(null);
    setPhase('result');
  }

  endGameRef.current = endGame;

  function advance() {
    clearAutoNext();
    if (phaseRef.current !== 'play') return;
    if (mode.seconds && timeLeft <= 0) {
      endGame();
      return;
    }
    nextQuestion();
  }

  function submitAnswer(value) {
    if (phaseRef.current !== 'play' || feedbackRef.current || !question) return;
    const raw = String(value ?? input).trim();
    if (!raw) return;
    const ms = Math.max(1, Date.now() - startedAtRef.current);
    const ok = checkAnswer(question, raw);
    game.recordAnswer({ topic: question.topic, difficulty: question.difficulty, ok, ms });

    const prev = tally;
    const topicRec = prev.perTopic[question.topic] || { c: 0, t: 0 };
    const next = {
      score: prev.score + (ok ? scoreFor(question.difficulty, prev.streak) : 0),
      correct: prev.correct + (ok ? 1 : 0),
      total: prev.total + 1,
      msSum: prev.msSum + ms,
      streak: ok ? prev.streak + 1 : 0,
      best: ok ? Math.max(prev.best, prev.streak + 1) : prev.best,
      hints: prev.hints,
      perTopic: { ...prev.perTopic, [question.topic]: { c: topicRec.c + (ok ? 1 : 0), t: topicRec.t + 1 } },
    };
    setTally(next);
    setFb({ ok, given: raw, ms });

    if (!ok) {
      const lines = localExplanation(question, raw, false);
      if (game.settings.voiceMode) speak(lines.join(' '));
      if (hasKey) {
        aiExplain({ apiKey: game.settings.apiKey, model: game.activeModel, question, givenAnswer: raw, isCorrect: false }).then((text) => {
          if (text && game.settings.voiceMode) speak(text);
        });
      }
    }

    const finishedByCount = Boolean(mode.count) && next.total >= mode.count;
    if (finishedByCount && ok) {
      autoNextRef.current = setTimeout(() => endGame(next), 700);
    } else if (ok) {
      autoNextRef.current = setTimeout(() => advance(), 650);
    }
  }

  function continueFromFeedback() {
    if (!feedback) return;
    clearAutoNext();
    if (feedback.ok) {
      advance();
      return;
    }
    if (mode.count && tally.total >= mode.count) endGame();
    else advance();
  }

  function askHint() {
    if (hint || aiHintLoading) return;
    if (!hasKey) {
      setHint(question.hint);
      if (game.settings.voiceMode) speak(question.hint);
      return;
    }
    setAiHintLoading(true);
    aiHint({ apiKey: game.settings.apiKey, model: game.activeModel, question })
      .then((text) => {
        const value = text || question.hint;
        setHint(value);
        if (game.settings.voiceMode) speak(value);
      })
      .finally(() => setAiHintLoading(false));
  }

  function openTutor() {
    setTutor({
      question,
      given: feedback?.given || '',
      correct: Boolean(feedback?.ok),
    });
    if (hasKey) speak('Here is your step by step explanation.');
    else speak(localExplanation(question, feedback?.given || '', Boolean(feedback?.ok)).join(' '));
  }

  function handleVoice() {
    if (voiceBusy.current || !question) return;
    voiceBusy.current = true;
    setListening(true);
    listenOnce({
      onResult: (text) => {
        voiceBusy.current = false;
        setListening(false);
        routeVoice(text);
      },
      onError: (msg) => {
        voiceBusy.current = false;
        setListening(false);
        setNote(msg);
        setTimeout(() => setNote(''), 4000);
      },
    });
  }

  function routeVoice(text) {
    const t = text.toLowerCase();
    if (/explain|solution|how do|walk me|show me/.test(t)) {
      openTutor();
      return;
    }
    if (/hint/.test(t)) {
      askHint();
      return;
    }
    if (/repeat|read|again/.test(t)) {
      speak(question.prompt);
      return;
    }
    if (/skip|next/.test(t)) {
      advance();
      return;
    }
    if (/\d/.test(t)) {
      setInput(text);
      submitAnswer(text);
      return;
    }
    setNote(`Heard "${text}". Say a number to answer, or say "explain" for help.`);
    setTimeout(() => setNote(''), 4500);
  }

  useEffect(() => {
    if (phase !== 'play' || !mode.seconds) return undefined;
    const iv = setInterval(() => {
      if (!feedbackRef.current) setTimeLeft((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, mode.seconds]);

  useEffect(() => {
    if (phase === 'play' && mode.seconds && timeLeft <= 0) endGameRef.current();
  }, [timeLeft, phase, mode.seconds]);

  useEffect(() => {
    if (phase !== 'result' || coachUsedRef.current || !result) return undefined;
    coachUsedRef.current = true;
    const noteText = `Latest session: score ${result.session.score}, ${result.session.correct}/${result.session.total} correct (${result.session.mode}).`;
    if (hasKey) {
      setCoach({ loading: true, text: '' });
      aiCoach({
        apiKey: game.settings.apiKey,
        model: game.activeModel,
        summaryText: summaryForPrompt(result.summary),
        resultNote: noteText,
      }).then((text) => setCoach({ loading: false, text: text || coachFallback(result.summary) }));
    } else {
      setCoach({ loading: false, text: coachFallback(result.summary) });
    }
    return undefined;
  }, [phase, result, hasKey, game.settings.apiKey, game.activeModel, game]);

  useEffect(() => {
    if (phase === 'play' && inputRef.current) inputRef.current.focus();
  }, [phase, question]);

  useEffect(() => () => {
    clearAutoNext();
    stopSpeaking();
  }, []);

  const timerPct = mode.seconds ? Math.max(0, (timeLeft / mode.seconds) * 100) : 100;
  const lowTime = mode.seconds && timeLeft <= Math.ceil(mode.seconds * 0.2);

  if (phase === 'setup') {
    return (
      <div className="stack">
        <div className="hero">
          <h2>60 seconds. Adaptive AI. Real improvement.</h2>
          <p className="muted">
            Questions are tuned to your level every few answers — get them right and the AI turns up the heat.
          </p>
        </div>

        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${modeId === m.id ? 'active' : ''}`}
              onClick={() => setModeId(m.id)}
            >
              <b>{m.label}</b>
              <span className="muted small">{m.desc}</span>
            </button>
          ))}
        </div>

        <div className="card">
          <h3 className="section-label">Topic</h3>
          <div className="chips">
            <button className={`chip ${topicSel === 'auto' ? 'active' : ''}`} onClick={() => setTopicSel('auto')}>
              Auto · AI adaptive
            </button>
            {TOPICS.map((t) => (
              <button
                key={t.id}
                className={`chip ${topicSel === t.id ? 'active' : ''}`}
                onClick={() => setTopicSel(t.id)}
              >
                {t.label}
                {game.currentLevel(t.id) ? ` · Lv ${game.currentLevel(t.id)}` : ''}
              </button>
            ))}
          </div>
          {!hasKey && (
            <p className="muted small">
              Tip: add your Groq API key in Settings to unlock AI-generated questions, explanations and coaching.
            </p>
          )}
        </div>

        <button className="btn btn-primary btn-lg" onClick={startGame}>
          Start {mode.label}
        </button>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const s = result.session;
    return (
      <div className="stack">
        <div className="hero result-hero">
          <span className="hero-kicker">Round complete</span>
          <div className="hero-score">{s.score}</div>
          <p className="muted">{s.mode} · {s.topic}</p>
        </div>

        <div className="kpis">
          <Kpi label="Accuracy" value={`${Math.round(s.accuracy * 100)}%`} sub={`${s.correct}/${s.total} correct`} />
          <Kpi label="Avg time" value={s.avgMs ? `${(s.avgMs / 1000).toFixed(1)}s` : '—'} sub="per question" />
          <Kpi label="Best streak" value={tally.best} sub="in a row" />
          <Kpi label="Hints used" value={tally.hints} sub="this round" />
        </div>

        <div className="card coach-card">
          <div className="card-head">
            <h3>AI Coach</h3>
            {!hasKey && <span className="pill">offline mode</span>}
          </div>
          {coach?.loading ? <Spinner text="AI Coach is reviewing your round…" /> : <p>{coach?.text}</p>}
        </div>

        {Object.keys(tally.perTopic).length > 0 && (
          <div className="card">
            <h3 className="section-label">This round by topic</h3>
            <div className="topic-results">
              {Object.entries(tally.perTopic).map(([id, v]) => (
                <div key={id} className={`topic-result ${v.c / v.t >= 0.7 ? 'good' : v.c / v.t >= 0.4 ? 'mid' : 'bad'}`}>
                  <span>{topicLabel(id)}</span>
                  <b>{v.c}/{v.t}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="section-label">Leaderboard</h3>
          {savedScore ? (
            <p className="ok-text">
              Saved. See it on the Leaderboard tab.
              {sync === 'pending' && ' Syncing to the global board…'}
              {sync === 'ok' && ' Synced to the global leaderboard.'}
              {sync === 'fail' && ' Global sync failed — it is saved on this device.'}
              {sync === 'local' && ' Saved on this device.'}
            </p>
          ) : (
            <div className="row">
              <input
                className="text-input"
                placeholder="Your name"
                value={scoreName}
                onChange={(e) => setScoreName(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const name = scoreName.trim() || 'Player';
                  const entry = {
                    name,
                    score: s.score,
                    accuracy: s.accuracy,
                    correct: s.correct,
                    total: s.total,
                    mode: s.mode,
                    date: new Date().toLocaleDateString(),
                  };
                  game.addLeaderboardEntry(entry);
                  if (!game.settings.name) game.updateSettings({ name });
                  setSavedScore(true);
                  if (cloudEnabled()) {
                    setSync('pending');
                    submitScore(entry)
                      .then((ok) => setSync(ok ? 'ok' : 'fail'))
                      .catch(() => setSync('fail'));
                  } else {
                    setSync('local');
                  }
                }}
              >
                Save score
              </button>
            </div>
          )}
        </div>

        <div className="row">
          <button className="btn btn-primary" onClick={startGame}>Play again</button>
          <button className="btn btn-ghost" onClick={() => setPhase('setup')}>Change mode</button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="stack">
      <div className="hud">
        <div className="hud-item">
          <span className="hud-label">Time</span>
          <b className={lowTime ? 'danger-text' : ''}>{mode.seconds ? `${timeLeft}s` : '∞'}</b>
        </div>
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <b>{tally.score}</b>
        </div>
        <div className="hud-item">
          <span className="hud-label">Streak</span>
          <b>{tally.streak}</b>
        </div>
        <div className="hud-item">
          <span className="hud-label">Answered</span>
          <b>{tally.total}{mode.count ? `/${mode.count}` : ''}</b>
        </div>
        <div className="hud-item hud-topic">
          <span className="hud-label">{topicLabel(question.topic)}</span>
          <b>Lv {question.difficulty} · {levelName(question.difficulty)}{question.ai ? ' · AI' : ''}</b>
        </div>
      </div>

      <div className="timerbar">
        <div className={`timerfill ${lowTime ? 'low' : ''}`} style={{ width: `${timerPct}%` }} />
      </div>

      <div className="qcard">
        <div className="qprompt">{question.prompt}</div>

        <form onSubmit={(e) => { e.preventDefault(); submitAnswer(); }}>
          <input
            ref={inputRef}
            className="answer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer"
            inputMode="text"
            autoComplete="off"
            disabled={Boolean(feedback)}
            aria-label="Answer"
          />
        </form>

        <div className="keypad">
          {KEYS.map((row) =>
            row.map((k) => (
              <button
                key={k}
                className="key"
                disabled={Boolean(feedback)}
                onClick={() => {
                  if (k === '⌫') setInput((v) => v.slice(0, -1));
                  else setInput((v) => (v === '0' && k !== '.' ? k : v + k));
                  inputRef.current?.focus();
                }}
              >
                {k}
              </button>
            )),
          )}
          <button className="key key-enter" disabled={Boolean(feedback)} onClick={() => submitAnswer()}>
            Enter
          </button>
        </div>

        <div className="qactions">
          <button className="btn btn-ghost btn-sm" onClick={askHint} disabled={Boolean(hint) || aiHintLoading}>
            {aiHintLoading ? 'Thinking…' : hint ? 'Hint shown' : hasKey ? 'AI Hint' : 'Hint'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={openTutor}>Explain</button>
          {voiceOn && (
            <button className={`btn btn-ghost btn-sm ${listening ? 'rec' : ''}`} onClick={handleVoice}>
              {listening ? 'Listening…' : 'Voice'}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => advance()}>Skip</button>
        </div>

        {hint && <div className="hint-box">{hint}</div>}
        {note && <div className="note-box">{note}</div>}
      </div>

      {feedback && (
        <div className={`feedback ${feedback.ok ? 'ok' : 'bad'}`}>
          <div className="feedback-head">
            <b>{feedback.ok ? 'Correct!' : `Not quite — the answer is ${question.answer}`}</b>
            <span className="muted small">{(feedback.ms / 1000).toFixed(1)}s</span>
          </div>
          {!feedback.ok && question.steps?.length > 0 && (
            <ol className="steps compact">
              {question.steps.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          )}
          {feedback.ok ? (
            <p className="muted small">Next question coming up…</p>
          ) : (
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={continueFromFeedback}>Continue</button>
              <button className="btn btn-ghost btn-sm" onClick={openTutor}>Deep explanation</button>
            </div>
          )}
        </div>
      )}

      {tutor && (
        <TutorPanel
          question={tutor.question}
          given={tutor.given}
          correct={tutor.correct}
          apiKey={game.settings.apiKey}
          model={game.activeModel}
          onClose={() => setTutor(null)}
        />
      )}
    </div>
  );
}
