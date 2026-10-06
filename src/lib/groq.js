import { verifyAiAnswer } from './mathEngine';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const SERVER_KEY = '__server_ai__';
const SERVER_ENDPOINT = '/api/groq';

export const GROQ_MODELS = [
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B — recommended (fast + JSON)' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B — deepest reasoning (slower)' },
  { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B — light alternative' },
  { id: 'custom', label: 'Custom model id…' },
];

export const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
export const RETIRED_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

async function request(apiKey, model, body, signal) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, ...body }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq error ${res.status}: ${text.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function serverRequest(payload, signal) {
  const res = await fetch(SERVER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Server AI error ${res.status}: ${text.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  if (typeof data?.content === 'string') return data.content;
  return data?.choices?.[0]?.message?.content ?? '';
}

export async function groqChat(apiKey, model, messages, opts = {}) {
  if (!apiKey) throw new Error('No API key set. Add your Groq key in Settings or in .env.');
  const { json = false, temperature = 0.6, maxTokens = 1400, timeout = 25000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const payload = { messages, temperature, max_tokens: maxTokens };
  if (json) payload.response_format = { type: 'json_object' };
  try {
    if (apiKey === SERVER_KEY) {
      return await serverRequest({ model, ...payload }, controller.signal);
    }
    try {
      return await request(apiKey, model, payload, controller.signal);
    } catch (err) {
      if (json && String(err.message).includes('400')) {
        const { response_format, ...rest } = payload;
        void response_format;
        return await request(apiKey, model, rest, controller.signal);
      }
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text) {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const startArr = t.indexOf('[');
  const startObj = t.indexOf('{');
  let start = -1;
  if (startArr === -1) start = startObj;
  else if (startObj === -1) start = startArr;
  else start = Math.min(startArr, startObj);
  if (start === -1) return null;
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

const TUTOR_SYSTEM = `You are MathMind AI, a patient math tutor inside a game for kids and adults.
Rules:
- Explain step by step in plain, simple language.
- Never just give the answer when asked for a hint; give a nudge that helps the player solve it themselves.
- Keep answers short: at most 6 sentences unless more is truly needed.
- Friendly, encouraging tone. No markdown headers, simple lists are fine.`;

const GEN_SYSTEM = `You are the question generator for MathMind AI, a math game.
Return ONLY valid JSON in exactly this shape:
{"questions":[{"prompt":"...","answer":"...","verify":"...","hint":"...","steps":["..."]}]}
Rules:
- "answer" must be the correct final answer as a plain number or simple form (e.g. "3/4" for fractions).
- "verify" is the calculation you performed to get the answer: plain digits, + - * / ^ and parentheses only, e.g. "0.4+0.3-0.5". No words, no variables.
- "hint" is one short sentence that nudges without revealing the answer.
- "steps" is 2-4 short strings showing working out.
- Double-check every answer: mentally evaluate your verify expression and fix anything that does not match.
- For fraction questions, redo the arithmetic carefully with common denominators — that is where mistakes happen most.
- Vary the numbers; do not repeat the same question.`;

const PUZZLE_SYSTEM = `You are the puzzle generator for MathMind AI, a math and logic game.
Return ONLY valid JSON in exactly this shape:
{"puzzles":[{"type":"missing|next|pattern|logic","prompt":"...","answer":"...","hint":"...","steps":["..."]}]}
Rules:
- type must be one of: missing, next, pattern, logic.
- Answers must be unambiguous (a single number unless it is a word riddle).
- Steps show how to reach the answer.
- Re-check every sequence and calculation yourself before returning.`;

async function chatJson(apiKey, model, system, user, opts) {
  try {
    const raw = await groqChat(apiKey, model, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { json: true, ...opts });
    return parseJson(raw);
  } catch {
    return null;
  }
}

async function chatText(apiKey, model, system, user, opts) {
  try {
    const raw = await groqChat(apiKey, model, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], opts);
    return raw.trim() || null;
  } catch {
    return null;
  }
}

function sanitizeQuestions(list, topic, difficulty) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((q) => q && typeof q.prompt === 'string' && q.prompt.trim() && q.answer !== undefined && String(q.answer).trim() !== '')
    .filter((q) => verifyAiAnswer({ prompt: q.prompt, answer: q.answer, verify: q.verify }))
    .map((q) => ({
      id: `q-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      topic,
      difficulty,
      prompt: q.prompt.trim(),
      answer: typeof q.answer === 'number' ? q.answer : String(q.answer).trim(),
      hint: typeof q.hint === 'string' && q.hint.trim() ? q.hint.trim() : 'Break the problem into smaller steps.',
      steps: Array.isArray(q.steps) && q.steps.length ? q.steps.slice(0, 5).map(String) : [],
      ai: true,
    }))
    .filter((q) => q.answer !== null);
}

export async function aiGenerateQuestions({ apiKey, model, topic, difficulty, count = 5, focus }) {
  if (!apiKey) return null;
  const extra = focus ? `\nThe player struggles with: ${focus}. Lean the questions toward that area.` : '';
  const user = `Generate ${count} ${topic} questions at difficulty ${difficulty} (1=easiest, 5=hardest).${extra}`;
  const data = await chatJson(apiKey, model, GEN_SYSTEM, user, { temperature: 0.6 });
  if (!data) return null;
  return sanitizeQuestions(data.questions, topic, difficulty);
}

export async function aiDailyChallenge({ apiKey, model, weakTopics, level, count = 10 }) {
  if (!apiKey) return null;
  const topics = weakTopics.length ? weakTopics : ['mixed arithmetic'];
  const user = `Generate ${count} personalized daily-challenge questions at overall difficulty ${level}.
Focus topics: ${topics.join(', ')}.
Mix in 2-3 slightly easier confidence boosters and 2-3 stretch questions.`;
  const data = await chatJson(apiKey, model, GEN_SYSTEM, user, { temperature: 0.6 });
  if (!data) return null;
  return sanitizeQuestions(data.questions, 'mixed', level);
}

export async function aiExplain({ apiKey, model, question, givenAnswer, isCorrect }) {
  if (!apiKey) return null;
  const status = !givenAnswer
    ? 'The player has not answered yet — explain how to solve it.'
    : isCorrect
      ? 'The player answered correctly.'
      : `The player answered "${givenAnswer}" which is wrong.`;
  const user = `Question: ${question.prompt}
Correct answer: ${question.answer}
${status}
Explain the solution step by step${isCorrect || !givenAnswer ? '.' : ' and explain the likely mistake in simple language.'}`;
  return chatText(apiKey, model, TUTOR_SYSTEM, user, { temperature: 0.5, maxTokens: 600 });
}

export async function aiHint({ apiKey, model, question }) {
  if (!apiKey) return null;
  const user = `Question: ${question.prompt}
Give ONE short hint that points the player in the right direction without giving away the answer.`;
  return chatText(apiKey, model, TUTOR_SYSTEM, user, { temperature: 0.7, maxTokens: 200 });
}

export async function aiCoach({ apiKey, model, summaryText, resultNote }) {
  if (!apiKey) return null;
  const user = `Here is the player's performance data:
${summaryText}
${resultNote ? `Latest session: ${resultNote}` : ''}
Write 3-4 short sentences as their AI coach: praise what they are strong at, name the topic to practice next with a concrete suggestion, and finish with an encouraging push.`;
  return chatText(apiKey, model, TUTOR_SYSTEM, user, { temperature: 0.7, maxTokens: 500 });
}

export async function aiPuzzles({ apiKey, model, difficulty, count = 4 }) {
  if (!apiKey) return null;
  const user = `Generate ${count} number puzzles at difficulty ${difficulty} (1-5). Mix missing-number, next-in-sequence, function-machine and logic types.`;
  const data = await chatJson(apiKey, model, PUZZLE_SYSTEM, user, { temperature: 0.7 });
  if (!data) return null;
  return Array.isArray(data.puzzles) ? data.puzzles : [];
}

export async function testKey(apiKey, model) {
  if (!apiKey) return { ok: false, message: 'Enter your Groq API key first.' };
  try {
    const reply = await groqChat(apiKey, model, [{ role: 'user', content: 'Reply with the single word: OK' }], {
      maxTokens: 10,
      timeout: 15000,
    });
    return { ok: true, message: `Connected. Model replied: "${reply.trim().slice(0, 40)}"` };
  } catch (err) {
    return { ok: false, message: String(err.message || err) };
  }
}
