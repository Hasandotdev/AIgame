import { TOPICS } from './mathEngine';

const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dayOffsetKey = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return todayKey(d);
};

export function buildSummary(state) {
  const topics = TOPICS.map((t) => {
    const s = state.topics[t.id];
    const attempts = s?.attempts || 0;
    const correct = s?.correct || 0;
    return {
      id: t.id,
      label: t.label,
      attempts,
      correct,
      accuracy: attempts ? correct / attempts : null,
      avgMs: attempts && s?.totalMs ? s.totalMs / attempts : null,
      level: s?.level || 1,
    };
  });

  const totalAttempts = topics.reduce((a, t) => a + t.attempts, 0);
  const totalCorrect = topics.reduce((a, t) => a + t.correct, 0);
  const totalMs = TOPICS.reduce((a, t) => a + (state.topics[t.id]?.totalMs || 0), 0);
  const played = topics.filter((t) => t.attempts > 0);
  const rated = played.filter((t) => t.attempts >= 4);
  const sortedByAcc = [...rated].sort((a, b) => b.accuracy - a.accuracy);
  const strong = sortedByAcc.filter((t) => t.accuracy >= 0.75).slice(0, 2);
  const weak = [...sortedByAcc].filter((t) => t.accuracy < 0.75).reverse().slice(0, 2);
  const unrated = played.filter((t) => t.attempts < 4);

  const byDay = new Map();
  for (const h of state.history) {
    const rec = byDay.get(h.d) || { d: h.d, attempts: 0, correct: 0 };
    rec.attempts += 1;
    rec.correct += h.ok ? 1 : 0;
    byDay.set(h.d, rec);
  }
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const key = dayOffsetKey(-i);
    const rec = byDay.get(key);
    days.push({
      d: key,
      attempts: rec?.attempts || 0,
      accuracy: rec && rec.attempts ? rec.correct / rec.attempts : null,
    });
  }

  const lastThree = days.slice(-4, -1).filter((x) => x.attempts > 0);
  const prevThree = days.slice(-8, -4).filter((x) => x.attempts > 0);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b.accuracy, 0) / arr.length : null);
  const recentAcc = avg(lastThree);
  const olderAcc = avg(prevThree);
  let trend = 'steady';
  if (recentAcc !== null && olderAcc !== null) {
    if (recentAcc - olderAcc > 0.05) trend = 'improving';
    else if (olderAcc - recentAcc > 0.05) trend = 'declining';
  }

  return {
    topics,
    played,
    strong,
    weak,
    unrated,
    totalAttempts,
    totalCorrect,
    accuracy: totalAttempts ? totalCorrect / totalAttempts : null,
    avgMs: totalAttempts ? totalMs / totalAttempts : null,
    days,
    trend,
    sessions: state.sessions.length,
    dailyStreak: state.daily.streak || 0,
    puzzleStats: state.puzzles || { attempts: 0, correct: 0 },
  };
}

export function coachFallback(summary) {
  if (!summary.totalAttempts) {
    return 'Welcome! Play a 60-second round so I can learn your strengths, then come back for a personalized coaching session.';
  }
  const parts = [];
  const acc = Math.round(summary.accuracy * 100);
  if (summary.strong.length && summary.weak.length) {
    const s = summary.strong[0];
    const w = summary.weak[0];
    parts.push(
      `You're strong at ${s.label.toLowerCase()} (${Math.round(s.accuracy * 100)}%), while ${w.label.toLowerCase()} sits at ${Math.round(w.accuracy * 100)}% — that is the area to work on.`,
    );
  } else if (summary.strong.length) {
    const s = summary.strong[0];
    parts.push(`No weak spots in your rated topics — ${s.label.toLowerCase()} is your best at ${Math.round(s.accuracy * 100)}%.`);
  } else {
    parts.push(`Overall you're sitting at ${acc}% accuracy across ${summary.totalAttempts} questions.`);
  }
  if (summary.trend === 'improving') parts.push('Your accuracy has been climbing over the last few days — that is real progress.');
  else if (summary.trend === 'declining') parts.push('Your recent accuracy dipped a little; slowing down and checking each step should fix that.');
  else if (!summary.strong.length && summary.weak.length) parts.push(`Overall accuracy is ${acc}% across ${summary.totalAttempts} questions.`);
  if (summary.weak.length) {
    const w = summary.weak[0];
    parts.push(`Today, try a short ${w.label.toLowerCase()} warm-up (level ${w.level}) before your next timed round.`);
  } else {
    parts.push('Try a harder topic or raise the difficulty to keep improving.');
  }
  return parts.join(' ');
}

export function summaryForPrompt(summary) {
  const lines = [];
  lines.push(`Total questions answered: ${summary.totalAttempts}, accuracy: ${summary.accuracy !== null ? Math.round(summary.accuracy * 100) : 0}%`);
  lines.push(`Average solve time: ${summary.avgMs ? (summary.avgMs / 1000).toFixed(1) : '?'} seconds`);
  lines.push('Per-topic:');
  for (const t of summary.played) {
    lines.push(
      `- ${t.label}: accuracy ${Math.round(t.accuracy * 100)}% over ${t.attempts} questions, avg ${(t.avgMs / 1000).toFixed(1)}s, level ${t.level}`,
    );
  }
  if (summary.strong.length) lines.push(`Strong topics: ${summary.strong.map((t) => t.label).join(', ')}`);
  if (summary.weak.length) lines.push(`Weak topics: ${summary.weak.map((t) => t.label).join(', ')}`);
  lines.push(`Trend over last days: ${summary.trend}`);
  lines.push(`Daily challenge streak: ${summary.dailyStreak} days`);
  return lines.join('\n');
}

export { todayKey };
