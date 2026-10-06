const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
export const PUZZLE_TYPES = [
  { id: 'missing', label: 'Missing Number' },
  { id: 'next', label: 'What Comes Next' },
  { id: 'pattern', label: 'Function Machine' },
  { id: 'logic', label: 'Logic Challenge' },
];

let counter = 0;

function arithmeticTerms(start, step, len) {
  return Array.from({ length: len }, (_, i) => start + i * step);
}
function geometricTerms(start, mult, len) {
  return Array.from({ length: len }, (_, i) => start * mult ** i);
}

function genSequence(difficulty) {
  const d = Math.max(1, Math.min(5, difficulty));
  let terms;
  let rule;
  if (d <= 2) {
    const step = randInt(2, d === 1 ? 5 : 12) * (Math.random() < 0.15 ? -1 : 1);
    const start = randInt(1, 20);
    terms = arithmeticTerms(start, step, 6);
    rule = step >= 0 ? `Add ${step}` : `Add ${step}`;
  } else if (d === 3) {
    if (Math.random() < 0.5) {
      const step = randInt(6, 25);
      const start = randInt(2, 30);
      terms = arithmeticTerms(start, step, 6);
      rule = `Add ${step}`;
    } else {
      const mult = pick([2, 3]);
      const start = randInt(2, 5);
      terms = geometricTerms(start, mult, 6);
      rule = `Multiply by ${mult}`;
    }
  } else if (d === 4) {
    const start = randInt(2, 15);
    const step = randInt(3, 9);
    terms = Array.from({ length: 6 }, (_, i) => start + (i * (i + 1) * step) / 2);
    rule = `Add ${step}, then ${step * 2}, then ${step * 3}... (growing by ${step} each time)`;
  } else {
    const add = randInt(3, 9);
    const mult = pick([2, 3]);
    const start = randInt(2, 8);
    terms = [start];
    for (let i = 1; i < 6; i += 1) {
      const prev = terms[i - 1];
      terms.push(i % 2 === 1 ? prev + add : prev * mult);
    }
    rule = `Alternate: add ${add}, then multiply by ${mult}`;
  }
  const hidden = randInt(2, terms.length - 2);
  const answer = terms[hidden];
  const shown = terms.map((t, i) => (i === hidden ? '?' : t));
  return {
    type: 'missing',
    prompt: `Find the missing number: ${shown.join(', ')}`,
    answer,
    hint: rule,
    steps: [`The rule of the sequence is: ${rule}.`, `Applying it to the previous term gives ${answer}.`, `So the missing number is ${answer}.`],
  };
}

function genNext(difficulty) {
  const d = Math.max(1, Math.min(5, difficulty));
  let terms;
  let rule;
  let answer;
  if (d <= 2) {
    const step = randInt(2, d === 1 ? 6 : 15);
    const start = randInt(1, 25);
    terms = arithmeticTerms(start, step, 5);
    answer = terms[terms.length - 1] + step;
    rule = `Each term goes up by ${step}`;
  } else if (d === 3) {
    const mult = pick([2, 3]);
    const start = randInt(2, 6);
    terms = geometricTerms(start, mult, 5);
    answer = terms[terms.length - 1] * mult;
    rule = `Each term is multiplied by ${mult}`;
  } else if (d === 4) {
    const start = randInt(1, 8);
    const step = randInt(3, 9);
    terms = Array.from({ length: 5 }, (_, i) => start + step * i + i * i);
    const diffNow = terms[4] - terms[3];
    answer = terms[4] + diffNow + 2;
    rule = `The gaps grow by 2 each time (gaps: ${terms[1] - terms[0]}, ${terms[2] - terms[1]}, ${terms[3] - terms[2]}, ${diffNow}, ...)`;
  } else {
    const start = randInt(2, 9);
    const add = randInt(3, 9);
    const mult = pick([2, 3]);
    terms = [start];
    for (let i = 1; i < 5; i += 1) {
      const prev = terms[i - 1];
      terms.push(i % 2 === 1 ? prev + add : prev * mult);
    }
    answer = terms[4] + add;
    rule = `Alternate: add ${add}, then multiply by ${mult}`;
  }
  return {
    type: 'next',
    prompt: `What comes next? ${terms.join(', ')}, ...`,
    answer,
    hint: rule,
    steps: [`Look at how each term changes: ${rule}.`, `Continuing the pattern gives ${answer}.`],
  };
}

function genPattern(difficulty) {
  const d = Math.max(1, Math.min(5, difficulty));
  const a = randInt(2, 3 + d);
  const b = randInt(1, 4 + d * 2);
  const n = randInt(2, 9 + d * 2);
  const answer = a * n + b;
  return {
    type: 'pattern',
    prompt: `In a function machine, every number n becomes ${a}n + ${b}. What comes out for n = ${n}?`,
    answer,
    hint: `Multiply ${n} by ${a}, then add ${b}.`,
    steps: [`${a} × ${n} = ${a * n}`, `${a * n} + ${b} = ${answer}`, `Output = ${answer}.`],
  };
}

const LOGIC_TEMPLATES = [
  {
    minD: 1,
    make() {
      const pens = randInt(3, 9);
      const cost = pens * randInt(2, 6);
      const want = randInt(4, 12);
      return {
        prompt: `${pens} pens cost $${cost}. How much do ${want} pens cost?`,
        answer: (cost / pens) * want,
        hint: 'Find the price of one pen first.',
        steps: [`One pen = $${cost} ÷ ${pens} = $${cost / pens}`, `${want} pens = ${cost / pens} × ${want} = $${(cost / pens) * want}`],
      };
    },
  },
  {
    minD: 2,
    make() {
      const machines = pick([3, 4, 5]);
      const more = pick([6, 9, 12]);
      return {
        prompt: `${machines} machines make ${machines} toys in ${machines} minutes. How many toys do ${more} machines make in ${more} minutes?`,
        answer: more,
        hint: 'How many toys does ONE machine make in one minute?',
        steps: [`1 machine makes 1 toy per minute.`, `${more} machines make ${more} toys per minute.`, `In ${more} minutes they make ${more} toys.`],
      };
    },
  },
  {
    minD: 2,
    make() {
      const mult = randInt(2, 4);
      const son = randInt(5, 15);
      return {
        prompt: `A father is ${mult} times as old as his son. Together they are ${mult * son + son} years old. How old is the son?`,
        answer: son,
        hint: `Their ages are ${mult} parts and 1 part.`,
        steps: [`Total parts = ${mult} + 1 = ${mult + 1}`, `${mult * son + son} ÷ ${mult + 1} = ${son}`, `The son is ${son}.`],
      };
    },
  },
  {
    minD: 3,
    make() {
      const strikes = pick([7, 9, 11]);
      const gap = randInt(2, 4);
      const secs = (strikes - 1) * gap;
      const answer = 2 * gap;
      return {
        prompt: `A clock takes ${secs} seconds to strike ${strikes} times (equal gaps between strikes). How many seconds to strike 3 times?`,
        answer,
        hint: 'Strikes have gaps: gaps = strikes - 1.',
        steps: [`Each gap = ${secs} ÷ ${strikes - 1} = ${gap} seconds.`, `3 strikes = 2 gaps.`, `2 × ${gap} = ${answer} seconds.`],
      };
    },
  },
  {
    minD: 3,
    make() {
      const speed = randInt(2, 5);
      const bike = randInt(4, 9);
      return {
        prompt: `In the same time, a car travels ${speed} times as far as a bike. The car covers ${speed * bike} km. How far does the bike travel?`,
        answer: bike,
        hint: 'Divide the car distance by the multiple.',
        steps: [`Car = ${speed} × bike`, `${speed * bike} ÷ ${speed} = ${bike}`, `The bike travels ${bike} km.`],
      };
    },
  },
  {
    minD: 4,
    make() {
      const a = randInt(2, 5);
      const c = randInt(1, 4);
      const x = randInt(4, 15);
      const b = randInt(2, 20);
      const right = (a - c) * x + b;
      return {
        prompt: `If ${a}x + ${b} = ${c}x + ${right}, what is x?`,
        answer: x,
        hint: 'Collect x terms on one side.',
        steps: [`${a}x - ${c}x = ${right} - ${b}`, `${a - c}x = ${(a - c) * x}`, `x = ${x}`],
      };
    },
  },
];

function genLogic(difficulty) {
  const pool = LOGIC_TEMPLATES.filter((t) => t.minD <= difficulty);
  return { type: 'logic', ...pick(pool.length ? pool : LOGIC_TEMPLATES).make() };
}

export function generatePuzzle(difficulty, typeFilter) {
  counter += 1;
  const d = Math.max(1, Math.min(5, difficulty || 1));
  let built;
  const type = typeFilter && typeFilter !== 'auto' ? typeFilter : pick(PUZZLE_TYPES).id;
  if (type === 'missing') built = genSequence(d);
  else if (type === 'next') built = genNext(d);
  else if (type === 'pattern') built = genPattern(d);
  else built = genLogic(d);
  return { id: `p-${Date.now().toString(36)}-${counter}`, difficulty: d, ...built };
}

export function normalizeAiPuzzle(item, difficulty) {
  if (!item || typeof item.prompt !== 'string' || !item.prompt.trim()) return null;
  if (item.answer === undefined || item.answer === null || String(item.answer).trim() === '') return null;
  counter += 1;
  const type = PUZZLE_TYPES.some((t) => t.id === item.type) ? item.type : 'logic';
  return {
    id: `p-ai-${Date.now().toString(36)}-${counter}`,
    type,
    difficulty,
    prompt: item.prompt.trim(),
    answer: item.answer,
    hint: typeof item.hint === 'string' && item.hint.trim() ? item.hint.trim() : 'Break the problem into smaller steps.',
    steps: Array.isArray(item.steps) && item.steps.length ? item.steps.slice(0, 5).map(String) : ['Work through it one step at a time.'],
    ai: true,
  };
}
