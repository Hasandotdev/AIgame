const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let clientPromise = null;

export function cloudEnabled() {
  return Boolean(url && anon);
}

async function getClient() {
  if (!cloudEnabled()) return null;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient: cc }) => cc(url, anon));
  }
  return clientPromise;
}

export function playerId() {
  const key = 'mathmind-player-id';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'anonymous-player';
  }
}

export async function submitScore(entry) {
  const client = await getClient();
  if (!client) return false;
  const { error } = await client.from('leaderboard').insert({
    player_id: playerId(),
    name: entry.name,
    score: entry.score,
    accuracy: entry.accuracy,
    correct: entry.correct,
    total: entry.total,
    mode: entry.mode,
  });
  return !error;
}

export async function fetchTopScores(limit = 20) {
  const client = await getClient();
  if (!client) return null;
  const { data, error } = await client
    .from('leaderboard')
    .select('id, name, score, accuracy, correct, total, mode, created_at')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) return null;
  return data || [];
}
