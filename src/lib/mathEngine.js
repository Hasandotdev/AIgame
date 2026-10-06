export const TOPICS = [
  { id: 'addition', label: 'Addition' },
  { id: 'subtraction', label: 'Subtraction' },
  { id: 'multiplication', label: 'Multiplication' },
  { id: 'division', label: 'Division' },
  { id: 'fractions', label: 'Fractions' },
  { id: 'algebra', label: 'Algebra' },
  { id: 'percentages', label: 'Percentages' },
];

export const TOPIC_IDS = TOPICS.map((t) => t.id);
export const MAX_LEVEL = 5;

const LEVEL_NAMES = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
const SPEED_TARGETS = [0, 15000, 16000, 18000, 20000, 20000];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const levelName = (l) => LEVEL_NAMES[clamp(Math.round(l || 1), 1, 5) - 1];
export const topicLabel = (id) => (TOPICS.find((t) => t.id === id) || { label: 'Mixed' }).label;
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
};
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
const round1 = (x) => Math.round(x * 10) / 10;

const simplify = (n, d) => {
  const g = gcd(n, d);
  return [n / g, d / g];
};
const fstr = (n, d) => {
  const [sn, sd] = simplify(n, d);
  return `${sn}/${sd}`;
};

const tens = (x) => Math.floor(x / 10) * 10;
const ones = (x) => x % 10;
const hundreds = (x) => Math.floor(x / 100) * 100;

let counter = 0;
function makeQuestion(topic, difficulty, raw) {
  counter += 1;
  return {
    id: `q-${Date.now().toString(36)}-${counter}`,
    topic,
    difficulty,
    ...raw,
  };
}

function plusSteps(a, b, threeDigit) {
  const steps = [`Break both numbers into place values.`];
  if (threeDigit) {
    steps.push(
      `Hundreds: ${hundreds(a)} + ${hundreds(b)} = ${hundreds(a) + hundreds(b)}; Tens: ${tens(a % 100)} + ${tens(b % 100)} = ${tens((a % 100)) + tens(b % 100)}; Ones: ${ones(a)} + ${ones(b)} = ${ones(a) + ones(b)}.`,
    );
  } else {
    steps.push(
      `Tens: ${tens(a)} + ${tens(b)} = ${tens(a) + tens(b)}; Ones: ${ones(a)} + ${ones(b)} = ${ones(a) + ones(b)}.`,
    );
  }
  steps.push(`Add the parts together: ${a} + ${b} = ${a + b}.`);
  return steps;
}

function minusSteps(a, b) {
  const parts = [];
  if (b >= 100) parts.push(hundreds(b));
  if (b % 100 >= 10) parts.push(tens(b % 100));
  parts.push(ones(b));
  let running = a;
  const steps = [`Start with ${a} and subtract each part of ${b}.`];
  for (const p of parts) {
    if (p === 0) continue;
    running -= p;
    steps.push(`${running + p} - ${p} = ${running}.`);
  }
  steps.push(`So ${a} - ${b} = ${a - b}.`);
  return steps;
}

function genAddition(d) {
  if (d <= 1) {
    const a = randInt(1, 12);
    const b = randInt(1, 12);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
      hint: 'Start at the bigger number and count on.',
      steps: [`Start at ${Math.max(a, b)}, then count up ${Math.min(a, b)}.`, `Result = ${a + b}.`],
    };
  }
  if (d === 2) {
    const a = randInt(2, 35);
    const b = randInt(2, 35);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
      hint: 'Add the tens first, then the ones.',
      steps: plusSteps(a, b, false),
    };
  }
  if (d === 3) {
    const a = randInt(12, 99);
    const b = randInt(12, 99);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
      hint: 'Watch for a carry from the ones column.',
      steps: plusSteps(a, b, false),
    };
  }
  if (d === 4) {
    const a = randInt(105, 499);
    const b = randInt(105, 499);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
      hint: 'Add hundreds, then tens, then ones.',
      steps: plusSteps(a, b, true),
    };
  }
  if (Math.random() < 0.35) {
    const a = randInt(110, 990) / 10;
    const b = randInt(110, 990) / 10;
    return {
      prompt: `${a.toFixed(1)} + ${b.toFixed(1)} = ?`,
      answer: round1(a + b),
      hint: 'Line up the decimal points, then add.',
      steps: [`Line up the decimal points.`, `${a.toFixed(1)} + ${b.toFixed(1)} = ${round1(a + b)}.`],
    };
  }
  const a = randInt(120, 9999);
  const b = randInt(120, 9999);
  return {
    prompt: `${a} + ${b} = ?`,
    answer: a + b,
    hint: 'Work from the highest place value down.',
    steps: plusSteps(a, b, true),
  };
}

function genSubtraction(d) {
  const ranges = [
    [4, 14],
    [6, 40],
    [15, 99],
    [110, 499],
    [250, 9999],
  ];
  const [lo, hi] = ranges[d - 1];
  let a = randInt(lo, hi);
  let b = randInt(Math.min(lo, Math.floor(a / 2)), a);
  if (b > a) [a, b] = [b, a];
  if (a === b) b = Math.max(0, b - 1);
  return {
    prompt: `${a} - ${b} = ?`,
    answer: a - b,
    hint: d <= 2 ? 'Count back from the bigger number.' : 'Subtract place value by place value, watching for borrowing.',
    steps: minusSteps(a, b),
  };
}

function genMultiplication(d) {
  if (d <= 1) {
    const a = randInt(2, 5);
    const b = randInt(2, 5);
    return {
      prompt: `${a} × ${b} = ?`,
      answer: a * b,
      hint: `Think of ${b} added ${a} times.`,
      steps: [`${b} + ${b} + ... (${a} times)`, `${a} × ${b} = ${a * b}.`],
    };
  }
  if (d === 2) {
    const a = randInt(2, 10);
    const b = randInt(2, 10);
    return {
      prompt: `${a} × ${b} = ?`,
      answer: a * b,
      hint: 'Use your times tables.',
      steps: [`${a} groups of ${b}.`, `${a} × ${b} = ${a * b}.`],
    };
  }
  if (d <= 4) {
    const a = d === 3 ? randInt(11, 40) : randInt(21, 99);
    const b = randInt(3, 9);
    const p = tens(a) * b;
    const o = ones(a) * b;
    return {
      prompt: `${a} × ${b} = ?`,
      answer: a * b,
      hint: 'Split the bigger number into tens and ones.',
      steps: [
        `${a} = ${tens(a)} + ${ones(a)}`,
        `${tens(a)} × ${b} = ${p} and ${ones(a)} × ${b} = ${o}`,
        `${p} + ${o} = ${a * b}`,
      ],
    };
  }
  const a = randInt(11, 30);
  const b = randInt(11, 30);
  const ta = tens(a);
  const oa = ones(a);
  const tb = tens(b);
  const ob = ones(b);
  return {
    prompt: `${a} × ${b} = ?`,
    answer: a * b,
    hint: 'Use the distributive rule: (10x + u)(10y + v).',
    steps: [
      `${a} = ${ta} + ${oa}, ${b} = ${tb} + ${ob}`,
      `${ta}×${tb} = ${ta * tb}, ${ta}×${ob} = ${ta * ob}, ${oa}×${tb} = ${oa * tb}, ${oa}×${ob} = ${oa * ob}`,
      `${ta * tb} + ${ta * ob} + ${oa * tb} + ${oa * ob} = ${a * b}`,
    ],
  };
}

function genDivision(d) {
  const table = [
    [2, 9, 2, 9],
    [2, 12, 2, 12],
    [3, 15, 4, 20],
    [12, 30, 5, 30],
    [11, 99, 11, 99],
  ];
  const [dlo, dhi, qlo, qhi] = table[d - 1];
  const divisor = randInt(dlo, dhi);
  const quotient = randInt(qlo, qhi);
  const dividend = divisor * quotient;
  return {
    prompt: `${dividend} ÷ ${divisor} = ?`,
    answer: quotient,
    hint: `Ask yourself: ${divisor} times what makes ${dividend}?`,
    steps: [
      `Think backwards: ${divisor} × ? = ${dividend}`,
      `${divisor} × ${quotient} = ${dividend}`,
      `So ${dividend} ÷ ${divisor} = ${quotient}.`,
    ],
  };
}

function genFractions(d) {
  if (d <= 1) {
    const den = randInt(3, 6);
    const a = 1;
    const b = 1;
    return {
      prompt: `${a}/${den} + ${b}/${den} = ?`,
      answer: fstr(a + b, den),
      hint: 'Add the numerators, keep the denominator.',
      steps: [`Denominators match, so add numerators: ${a} + ${b} = ${a + b}.`, `Answer = ${fstr(a + b, den)}.`],
    };
  }
  if (d === 2) {
    const den = randInt(3, 9);
    const a = randInt(1, den - 1);
    const b = randInt(1, den - a);
    return {
      prompt: `${a}/${den} + ${b}/${den} = ?`,
      answer: fstr(a + b, den),
      hint: 'The denominator stays the same.',
      steps: [`Same denominator: add ${a} + ${b} = ${a + b}.`, `Result = ${fstr(a + b, den)}.`],
    };
  }
  if (d === 3) {
    const den1 = pick([2, 3, 4, 6, 8]);
    const den2 = pick([4, 6, 8, 12].filter((x) => x % den1 === 0 || den1 % x === 0));
    const L = lcm(den1, den2);
    const a = randInt(1, den1 - 1);
    const b = randInt(1, den2 - 1);
    const na = a * (L / den1);
    const nb = b * (L / den2);
    const isMinus = Math.random() < 0.35 && na > nb;
    const num = isMinus ? na - nb : na + nb;
    return {
      prompt: `${a}/${den1} ${isMinus ? '-' : '+'} ${b}/${den2} = ?`,
      answer: fstr(num, L),
      hint: `The lowest common denominator is ${L}.`,
      steps: [
        `LCD of ${den1} and ${den2} = ${L}.`,
        `${a}/${den1} = ${na}/${L}, ${b}/${den2} = ${nb}/${L}`,
        `${isMinus ? '-' : '+'} the numerators: ${isMinus ? `${na} - ${nb}` : `${na} + ${nb}`} = ${num}`,
        `Simplify: ${fstr(num, L)}.`,
      ],
    };
  }
  if (d === 4) {
    const den1 = pick([3, 4, 5, 6, 8, 9, 10]);
    const den2 = pick([4, 5, 6, 7, 8, 9, 10, 12]);
    const L = lcm(den1, den2);
    const a = randInt(1, Math.max(1, den1 - 1));
    const b = randInt(1, Math.max(1, den2 - 1));
    const na = a * (L / den1);
    const nb = b * (L / den2);
    const isMinus = na !== nb && Math.random() < 0.5;
    const num = isMinus ? Math.abs(na - nb) : na + nb;
    return {
      prompt: `${a}/${den1} ${isMinus ? '-' : '+'} ${b}/${den2} = ?`,
      answer: fstr(num, L),
      hint: `Find the LCD of ${den1} and ${den2} first.`,
      steps: [
        `LCD of ${den1} and ${den2} = ${L}.`,
        `Convert: ${na}/${L} ${isMinus ? '-' : '+'} ${nb}/${L}`,
        `Result before simplifying: ${num}/${L}`,
        `Simplified: ${fstr(num, L)}.`,
      ],
    };
  }
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const c = randInt(2, 9);
  const dd = randInt(2, 9);
  return {
    prompt: `${a}/${b} × ${c}/${dd} = ?`,
    answer: fstr(a * c, b * dd),
    hint: 'Multiply straight across, then simplify.',
    steps: [`Numerators: ${a} × ${c} = ${a * c}`, `Denominators: ${b} × ${dd} = ${b * dd}`, `Simplify: ${fstr(a * c, b * dd)}.`],
  };
}

function genPercentages(d) {
  if (d <= 1) {
    const p = pick([10, 50, 5]);
    const base = randInt(2, 20) * 10;
    const val = (base * p) / 100;
    return {
      prompt: `What is ${p}% of ${base}?`,
      answer: val,
      hint: p === 10 ? 'Divide by 10.' : p === 50 ? 'Halve the number.' : 'Divide by 10, then halve.',
      steps: [`${p}% = ${p}/100`, `${base} × ${p / 100} = ${val}`, `Answer = ${val}.`],
    };
  }
  if (d === 2) {
    const p = pick([5, 20, 25, 30, 40, 75]);
    const base = randInt(2, 25) * 20;
    const val = (base * p) / 100;
    return {
      prompt: `What is ${p}% of ${base}?`,
      answer: val,
      hint: `Find 1% by dividing by 100, then multiply by ${p}.`,
      steps: [`1% of ${base} = ${base / 100}`, `${base / 100} × ${p} = ${val}`, `Answer = ${val}.`],
    };
  }
  if (d === 3) {
    const p = randInt(3, 95);
    const base = p % 5 === 0 ? randInt(3, 30) * 20 : randInt(2, 20) * 100;
    const val = (base * p) / 100;
    return {
      prompt: `What is ${p}% of ${base}?`,
      answer: val,
      hint: `Multiply ${base} by ${p}/100.`,
      steps: [`Convert: ${p}% = ${p / 100}`, `${base} × ${p / 100} = ${val}`, `Answer = ${val}.`],
    };
  }
  if (d === 4) {
    const p = 4 * randInt(2, 24);
    const base = randInt(4, 20) * 25;
    const val = (base * p) / 100;
    return {
      prompt: `${val} is what percent of ${base}?`,
      answer: p,
      hint: 'Divide part by whole, then multiply by 100.',
      steps: [`Part ÷ Whole = ${val} ÷ ${base} = ${val / base}`, `${val / base} × 100 = ${p}`, `Answer = ${p}%.`],
    };
  }
  const p = pick([5, 10, 15, 20, 25, 30, 40, 50]);
  const base = randInt(3, 20) * 100;
  const up = Math.random() < 0.5;
  const val = base + (base * p) / 100;
  const opText = up ? 'increases' : 'decreases';
  const stepText = up
    ? `${base} + (${base} × ${p}/100) = ${base} + ${(base * p) / 100} = ${val}`
    : `${base} - (${base} × ${p}/100) = ${base} - ${(base * p) / 100} = ${val}`;
  return {
    prompt: `A price of $${base} ${opText} by ${p}%. What is the new price?`,
    answer: val,
    hint: `Calculate ${p}% of ${base} first, then ${up ? 'add' : 'subtract'} it.`,
    steps: [`${p}% of ${base} = ${(base * p) / 100}`, stepText, `Answer = $${val}.`],
  };
}

function genAlgebra(d) {
  if (d <= 1) {
    const x = randInt(2, 15);
    const b = randInt(2, 20);
    return {
      prompt: `Solve for x:  x + ${b} = ${x + b}`,
      answer: x,
      hint: `Subtract ${b} from both sides.`,
      steps: [`x + ${b} = ${x + b}`, `x = ${x + b} - ${b}`, `x = ${x}`],
    };
  }
  if (d === 2) {
    const x = randInt(2, 12);
    const a = randInt(2, 9);
    const b = randInt(2, 25);
    return {
      prompt: `Solve for x:  ${a}x + ${b} = ${a * x + b}`,
      answer: x,
      hint: `Subtract ${b}, then divide by ${a}.`,
      steps: [`${a}x + ${b} = ${a * x + b}`, `${a}x = ${a * x}`, `x = ${x}`],
    };
  }
  if (d === 3) {
    const x = randInt(2, 12);
    const a = randInt(3, 9);
    const c = randInt(1, a - 1);
    const b = randInt(2, 20);
    const dd = b + (a - c) * x;
    return {
      prompt: `Solve for x:  ${a}x + ${b} = ${c}x + ${dd}`,
      answer: x,
      hint: `Move the x terms to one side and the numbers to the other.`,
      steps: [`${a}x + ${b} = ${c}x + ${dd}`, `${a - c}x = ${dd - b}`, `x = ${x}`],
    };
  }
  if (d === 4) {
    const x = randInt(2, 12);
    const a = randInt(2, 8);
    const b = randInt(2, 15);
    const c = a * (x + b);
    return {
      prompt: `Solve for x:  ${a}(x + ${b}) = ${c}`,
      answer: x,
      hint: `Divide both sides by ${a} first.`,
      steps: [`${a}(x + ${b}) = ${c}`, `x + ${b} = ${c / a}`, `x = ${x}`],
    };
  }
  const option = randInt(1, 3);
  if (option === 1) {
    const n = randInt(4, 30);
    const sum = n * 3;
    return {
      prompt: `The sum of three consecutive integers is ${sum}. What is the largest?`,
      answer: n + 1,
      hint: 'If they are consecutive, the sum is 3 times the middle one.',
      steps: [`Middle integer = ${sum} ÷ 3 = ${n}`, `The three are ${n - 1}, ${n}, ${n + 1}`, `Largest = ${n + 1}`],
    };
  }
  if (option === 2) {
    const x = randInt(4, 25);
    const a = randInt(3, 9);
    const b = randInt(5, 40);
    return {
      prompt: `Twice a number is wrong — instead: ${a} times a number plus ${b} equals ${a * x + b}. Find the number.`,
      answer: x,
      hint: `Subtract ${b}, then divide by ${a}.`,
      steps: [`${a}x + ${b} = ${a * x + b}`, `${a}x = ${a * x}`, `x = ${x}`],
    };
  }
  const w = randInt(3, 12);
  const a = randInt(2, 4);
  const len = a * w;
  const perimeter = 2 * (w + len);
  return {
    prompt: `A rectangle is ${a} times as long as it is wide. Its perimeter is ${perimeter}. What is the width?`,
    answer: w,
    hint: 'Perimeter = 2 × (width + length).',
    steps: [
      `Width = w, Length = ${a}w`,
      `2 × (w + ${a}w) = ${perimeter} → ${2 + 2 * a}w = ${perimeter}`,
      `w = ${perimeter} ÷ ${2 + 2 * a} = ${w}`,
    ],
  };
}

const GENERATORS = {
  addition: genAddition,
  subtraction: genSubtraction,
  multiplication: genMultiplication,
  division: genDivision,
  fractions: genFractions,
  percentages: genPercentages,
  algebra: genAlgebra,
};

export function generateQuestion(topic, difficulty) {
  const t = TOPIC_IDS.includes(topic) ? topic : pick(TOPIC_IDS);
  const d = clamp(Math.round(difficulty || 1), 1, 5);
  return makeQuestion(t, d, GENERATORS[t](d));
}

export function parseMath(raw) {
  let s = String(raw ?? '')
    .toLowerCase()
    .replace(/[$€£]/g, '')
    .replace(/%/g, '')
    .replace(/[?,]/g, '')
    .trim();
  s = s.replace(/^(x|y|n|answer|ans)\s*[:=]\s*/, '').trim();
  let m = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const whole = parseInt(m[2], 10);
    const num = parseInt(m[3], 10);
    const den = parseInt(m[4], 10);
    if (!den) return null;
    return sign * (whole + num / den);
  }
  s = s.replace(/\s+/g, '');
  m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const den = parseFloat(m[2]);
    if (!den) return null;
    return parseFloat(m[1]) / den;
  }
  if (s === '') return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

export function checkAnswer(question, input) {
  const raw = String(input ?? '').trim();
  if (!raw) return false;
  const guess = parseMath(raw);
  const correct = parseMath(String(question.answer));
  if (guess === null || correct === null) {
    return raw.toLowerCase().replace(/\s+/g, ' ') === String(question.answer).toLowerCase().replace(/\s+/g, ' ');
  }
  const exact = Number.isInteger(guess) && Number.isInteger(correct);
  return Math.abs(guess - correct) <= (exact ? 1e-9 : 0.011);
}

export const emptyTopicStat = () => ({ attempts: 0, correct: 0, totalMs: 0, level: 1, recent: [] });

export function applyAnswer(stat, ok, ms) {
  const prev = stat || emptyTopicStat();
  const recent = [...(prev.recent || []), { ok, ms }].slice(-8);
  const window = recent.slice(-6);
  const acc = window.reduce((s, r) => s + (r.ok ? 1 : 0), 0) / window.length;
  const avgMs = window.reduce((s, r) => s + r.ms, 0) / window.length;
  let level = prev.level || 1;
  if (window.length >= 5) {
    if (acc >= 0.83 && avgMs <= SPEED_TARGETS[level]) level += 1;
    else if (acc <= 0.4) level -= 1;
  }
  return {
    attempts: prev.attempts + 1,
    correct: prev.correct + (ok ? 1 : 0),
    totalMs: prev.totalMs + ms,
    level: clamp(level, 1, MAX_LEVEL),
    recent,
  };
}

export function topicAccuracy(stat) {
  if (!stat || !stat.attempts) return null;
  return stat.correct / stat.attempts;
}

export function chooseTopic(topics, forced) {
  if (forced && forced !== 'auto' && TOPIC_IDS.includes(forced)) return forced;
  if (Math.random() < 0.2) return pick(TOPIC_IDS);
  const weights = TOPIC_IDS.map((id) => {
    const s = topics[id];
    if (!s || !s.attempts) return 2;
    const acc = s.correct / s.attempts;
    return 1 + (1 - acc) * 4 + (acc < 0.7 ? 1.5 : 0);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < TOPIC_IDS.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return TOPIC_IDS[i];
  }
  return 'addition';
}

export function scoreFor(difficulty, streak) {
  const base = 60 + (difficulty - 1) * 30;
  const bonus = Math.min(streak, 5) * 10;
  return base + bonus;
}

export function safeEval(expr) {
  const s = String(expr ?? '').replace(/\s+/g, '');
  if (!s || !/^[-+*/^().0-9]+$/.test(s)) return null;
  if (!/[-+*/^]/.test(s)) return null;
  let i = 0;
  const primary = () => {
    if (s[i] === '(') {
      i += 1;
      const v = exprLevel();
      if (v === null || s[i] !== ')') return null;
      i += 1;
      return v;
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const unary = () => {
    if (s[i] === '-') {
      i += 1;
      const v = unary();
      return v === null ? null : -v;
    }
    if (s[i] === '+') {
      i += 1;
      return unary();
    }
    return primary();
  };
  const power = () => {
    const base = unary();
    if (base === null) return null;
    if (s[i] === '^') {
      i += 1;
      const exp = power();
      if (exp === null) return null;
      return base ** exp;
    }
    return base;
  };
  const term = () => {
    let v = power();
    if (v === null) return null;
    while (i < s.length && (s[i] === '*' || s[i] === '/')) {
      const op = s[i];
      i += 1;
      const r = power();
      if (r === null) return null;
      if (op === '/') {
        if (r === 0) return null;
        v /= r;
      } else v *= r;
    }
    return v;
  };
  const exprLevel = () => {
    let v = term();
    if (v === null) return null;
    while (i < s.length && (s[i] === '+' || s[i] === '-')) {
      const op = s[i];
      i += 1;
      const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const result = exprLevel();
  if (result === null || i !== s.length || !Number.isFinite(result)) return null;
  return result;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function verifyAiAnswer(q) {
  if (!q) return false;
  if (!verifyAiQuestion(q)) return false;
  const expr = q.verify === undefined ? '' : String(q.verify);
  if (!expr || !/[-+*/^]/.test(expr)) return true;
  const computed = safeEval(expr);
  const answer = parseMath(String(q.answer));
  if (computed === null || answer === null) return true;
  const tolerance = 0.011;
  if (Math.abs(computed - answer) <= tolerance) return true;
  const answerText = String(q.answer).trim();
  const substitutesAnswer = new RegExp(`(^|[^0-9.])${escapeRe(answerText)}([^0-9.]|$)`).test(expr);
  if (!substitutesAnswer) return false;
  if (Math.abs(computed) <= tolerance) return true;
  const promptNumbers = String(q.prompt ?? '').match(/-?\d+(?:\.\d+)?/g) || [];
  return promptNumbers.some((n) => Math.abs(parseFloat(n) - computed) <= Math.max(tolerance, Math.abs(computed) * 1e-6));
}

export function verifyAiQuestion(q) {
  if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) return false;
  if (q.answer === undefined || q.answer === null || String(q.answer).trim() === '') return false;
  const m = q.prompt.trim().match(/^(-?\d+(?:\.\d+)?)\s*([+\-x×*÷/])\s*(-?\d+(?:\.\d+)?)\s*=\s*\?$/);
  if (!m) return true;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[3]);
  const op = m[2];
  let expected = null;
  if (op === '+') expected = a + b;
  else if (op === '-') expected = a - b;
  else if (op === 'x' || op === '×' || op === '*') expected = a * b;
  else if ((op === '÷' || op === '/') && b !== 0) expected = a / b;
  if (expected === null) return true;
  const given = parseMath(String(q.answer));
  if (given === null) return false;
  return Math.abs(given - expected) < 1e-6;
}
