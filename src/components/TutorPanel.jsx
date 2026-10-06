import { useEffect, useState } from 'react';
import { aiExplain, aiHint } from '../lib/groq';
import { localExplanation } from '../lib/explain';
import { speak } from '../lib/voice';
import { Spinner } from './Ui';

export default function TutorPanel({ question, given, correct, apiKey, model, onClose }) {
  const [aiText, setAiText] = useState(null);
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(Boolean(apiKey));
  const [hintLoading, setHintLoading] = useState(false);
  const localLines = localExplanation(question, given, correct);

  useEffect(() => {
    let alive = true;
    if (!apiKey) {
      setLoading(false);
      return () => {};
    }
    aiExplain({ apiKey, model, question, givenAnswer: given, isCorrect: correct }).then((text) => {
      if (!alive) return;
      setAiText(text);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [apiKey, model, question, given, correct]);

  const askHint = () => {
    if (hint || hintLoading) return;
    if (!apiKey) {
      setHint(question.hint);
      speak(question.hint);
      return;
    }
    setHintLoading(true);
    aiHint({ apiKey, model, question }).then((text) => {
      setHint(text || question.hint);
      setHintLoading(false);
      speak(text || question.hint);
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal tutor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>AI Tutor</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        <p className="tutor-question">{question.prompt}</p>
        <p className="tutor-answers">
          <span className={correct ? 'ok-text' : 'bad-text'}>Your answer: {given || '—'}</span>
          <span className="muted"> · Correct: <b>{question.answer}</b></span>
        </p>

        <div className="tutor-actions">
          <button className="btn btn-ghost btn-sm" onClick={askHint} disabled={hintLoading || Boolean(hint)}>
            {hintLoading ? 'Getting hint…' : 'Hint (no answer)'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => speak(localLines.join(' '))}
          >
            Hear explanation
          </button>
        </div>
        {hint ? <div className="hint-box">Hint: {hint}</div> : null}

        <h4 className="section-label">Step by step</h4>
        <ol className="steps">
          {localLines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>

        <h4 className="section-label">AI explanation</h4>
        {!apiKey ? (
          <p className="muted small">
            AI explanations are off — the app owner must configure the Groq API key.
          </p>
        ) : loading ? (
          <Spinner text="AI is preparing an explanation…" />
        ) : aiText ? (
          <div className="ai-text">
            {aiText}
            <div className="tutor-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => speak(aiText)}>Hear it</button>
            </div>
          </div>
        ) : (
          <p className="muted small">The AI was unavailable — the step-by-step solution above still applies.</p>
        )}
      </div>
    </div>
  );
}
