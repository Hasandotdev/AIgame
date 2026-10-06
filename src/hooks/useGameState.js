import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyAnswer, chooseTopic, emptyTopicStat, generateQuestion, TOPIC_IDS } from '../lib/mathEngine';
import { buildSummary, todayKey } from '../lib/analysis';
import { DEFAULT_MODEL, RETIRED_MODELS, SERVER_KEY } from '../lib/groq';

const STORAGE_KEY = 'mathmind-ai-v1';

const DEFAULT_STATE = {
  settings: {
    name: '',
    apiKey: '',
    model: DEFAULT_MODEL,
    customModel: '',
    voiceMode: false,
  },
  topics: {},
  history: [],
  sessions: [],
  leaderboard: [],
  daily: { last: '', streak: 0, best: 0, results: {} },
  puzzles: { attempts: 0, correct: 0 },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      const savedModel = parsed?.settings?.model;
      const migrated = RETIRED_MODELS.includes(savedModel) ? DEFAULT_MODEL : undefined;
      return {
        ...DEFAULT_STATE,
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}), ...(migrated ? { model: migrated } : {}) },
      daily: { ...DEFAULT_STATE.daily, ...(parsed.daily || {}) },
      puzzles: { ...DEFAULT_STATE.puzzles, ...(parsed.puzzles || {}) },
      topics: parsed.topics || {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useGameState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable; keep playing in memory
    }
  }, [state]);

  const updateSettings = useCallback((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const recordAnswer = useCallback(({ topic, ok, ms }) => {
    setState((s) => {
      const prevStat = s.topics[topic] || emptyTopicStat();
      const nextStat = applyAnswer(prevStat, ok, ms);
      const history = [
        ...s.history,
        { d: todayKey(), topic, ok, ms, lvl: nextStat.level },
      ].slice(-3000);
      return { ...s, topics: { ...s.topics, [topic]: nextStat }, history };
    });
  }, []);

  const saveSession = useCallback((session) => {
    setState((s) => ({
      ...s,
      sessions: [{ ...session, date: new Date().toISOString() }, ...s.sessions].slice(0, 30),
    }));
  }, []);

  const addLeaderboardEntry = useCallback((entry) => {
    setState((s) => {
      const next = [...s.leaderboard, { ...entry, ts: Date.now() }].sort((a, b) => b.score - a.score).slice(0, 20);
      return { ...s, leaderboard: next };
    });
  }, []);

  const completeDaily = useCallback(({ date, correct, total }) => {
    setState((s) => {
      const prev = s.daily.last || '';
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterday = todayKey(y);
      const streak = prev === yesterday ? (s.daily.streak || 0) + 1 : 1;
      return {
        ...s,
        daily: {
          last: date,
          streak,
          best: Math.max(streak, s.daily.best || 0),
          results: { ...s.daily.results, [date]: { correct, total } },
        },
      };
    });
  }, []);

  const recordPuzzle = useCallback((ok) => {
    setState((s) => ({
      ...s,
      puzzles: { attempts: s.puzzles.attempts + 1, correct: s.puzzles.correct + (ok ? 1 : 0) },
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState((s) => ({ ...DEFAULT_STATE, settings: s.settings }));
  }, []);

  const summary = useMemo(() => buildSummary(state), [state]);

  const genQuestion = useCallback(
    (forcedTopic) => {
      const topic = chooseTopic(state.topics, forcedTopic);
      const level = state.topics[topic]?.level || 1;
      return generateQuestion(topic, level);
    },
    [state.topics],
  );

  const currentLevel = useCallback(
    (topic) => (topic && topic !== 'auto' && state.topics[topic] ? state.topics[topic].level : null),
    [state.topics],
  );

  const activeModel = state.settings.model === 'custom' ? state.settings.customModel : state.settings.model;

  const envKey = (import.meta.env.VITE_GROQ_API_KEY || '').trim();
  const serverAI = import.meta.env.VITE_USE_SERVER_AI === '1';
  const effectiveKey = state.settings.apiKey || envKey || (serverAI ? SERVER_KEY : '');

  return {
    state,
    summary,
    settings: { ...state.settings, apiKey: effectiveKey },
    envKey,
    serverAI,
    activeModel,
    updateSettings,
    recordAnswer,
    saveSession,
    addLeaderboardEntry,
    completeDaily,
    recordPuzzle,
    resetProgress,
    genQuestion,
    currentLevel,
    topicIds: TOPIC_IDS,
  };
}
