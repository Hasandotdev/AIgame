const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function canPlace(grid, r, c, v) {
  for (let i = 0; i < 9; i += 1) {
    if (grid[r][i] === v || grid[i][c] === v) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      if (grid[br + i][bc + j] === v) return false;
    }
  }
  return true;
}

function bestEmpty(grid) {
  let best = null;
  let bestCount = 10;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] !== 0) continue;
      let count = 0;
      for (let v = 1; v <= 9; v += 1) {
        if (canPlace(grid, r, c, v)) count += 1;
      }
      if (count < bestCount) {
        best = [r, c];
        bestCount = count;
        if (count === 0) return best;
      }
    }
  }
  return best;
}

function countSolutions(grid, limit = 2) {
  const g = grid.map((row) => row.slice());
  let count = 0;
  const solve = () => {
    if (count >= limit) return;
    const pos = bestEmpty(g);
    if (!pos) {
      count += 1;
      return;
    }
    const [r, c] = pos;
    for (let v = 1; v <= 9; v += 1) {
      if (canPlace(g, r, c, v)) {
        g[r][c] = v;
        solve();
        g[r][c] = 0;
        if (count >= limit) return;
      }
    }
  };
  solve();
  return count;
}

function fillSolution(grid) {
  const pos = bestEmpty(grid);
  if (!pos) return true;
  const [r, c] = pos;
  const order = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const v of order) {
    if (canPlace(grid, r, c, v)) {
      grid[r][c] = v;
      if (fillSolution(grid)) return true;
      grid[r][c] = 0;
    }
  }
  return false;
}

export const SUDOKU_LEVELS = [
  { id: 1, label: 'Easy', clues: 44, points: 400 },
  { id: 2, label: 'Medium', clues: 35, points: 650 },
  { id: 3, label: 'Hard', clues: 28, points: 950 },
];

export function generateSudoku(levelId = 2) {
  const level = SUDOKU_LEVELS.find((l) => l.id === levelId) || SUDOKU_LEVELS[1];
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillSolution(solution);
  const puzzle = solution.map((row) => row.slice());
  const positions = shuffle(puzzle.flatMap((row, r) => row.map((_, c) => [r, c])));
  let clues = 81;
  for (const [r, c] of positions) {
    if (clues <= level.clues) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) === 1) clues -= 1;
    else puzzle[r][c] = backup;
  }
  return { puzzle, solution, level: level.id, label: level.label, points: level.points, clues };
}

export function sudokuConflicts(values) {
  const bad = new Set();
  const scan = (cells) => {
    const seen = new Map();
    for (const [r, c] of cells) {
      const v = values[r][c];
      if (!v) continue;
      const prev = seen.get(v);
      if (prev) {
        bad.add(prev);
        bad.add(`${r},${c}`);
      } else {
        seen.set(v, `${r},${c}`);
      }
    }
  };
  for (let i = 0; i < 9; i += 1) {
    scan(Array.from({ length: 9 }, (_, c) => [i, c]));
    scan(Array.from({ length: 9 }, (_, r) => [r, i]));
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const cells = [];
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) cells.push([br + i, bc + j]);
      }
      scan(cells);
    }
  }
  return bad;
}

export function sudokuFilled(values) {
  return values.every((row) => row.every((v) => v >= 1 && v <= 9));
}

export const MATCH_TARGETS = [10, 12, 15, 18, 20, 24, 30, 36];

export function matchTargetForLevel(level) {
  return MATCH_TARGETS[Math.min(Math.max(level, 1), MATCH_TARGETS.length) - 1];
}

export function generateMatchBoard(size = 24, target = 10) {
  const tiles = [];
  for (let i = 0; i < size / 2; i += 1) {
    const a = randInt(1, target - 1);
    tiles.push(a, target - a);
  }
  return shuffle(tiles);
}

function transpose(grid) {
  return grid[0].map((_, i) => grid.map((row) => row[i]));
}

function mergeRowsLeft(grid) {
  let gained = 0;
  let moved = false;
  const out = grid.map((row) => {
    const vals = row.filter((v) => v !== 0);
    const merged = [];
    for (let i = 0; i < vals.length; i += 1) {
      if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
        const v = vals[i] * 2;
        merged.push(v);
        gained += v;
        i += 1;
      } else {
        merged.push(vals[i]);
      }
    }
    while (merged.length < row.length) merged.push(0);
    if (merged.some((v, i) => v !== row[i])) moved = true;
    return merged;
  });
  return { grid: out, gained, moved };
}

export function moveGrid(grid, dir) {
  let g = grid.map((row) => row.slice());
  if (dir === 'right') g = g.map((row) => row.slice().reverse());
  else if (dir === 'up') g = transpose(g);
  else if (dir === 'down') g = transpose(g).map((row) => row.slice().reverse());

  const res = mergeRowsLeft(g);
  g = res.grid;

  if (dir === 'right') g = g.map((row) => row.slice().reverse());
  else if (dir === 'up') g = transpose(g);
  else if (dir === 'down') g = transpose(g.map((row) => row.slice().reverse()));

  return { grid: g, gained: res.gained, moved: res.moved };
}

export function spawnTile(grid) {
  const g = grid.map((row) => row.slice());
  const empty = [];
  g.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return g;
  const [r, c] = empty[randInt(0, empty.length - 1)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return g;
}

export function canMove(grid) {
  const n = grid.length;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < n && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < n && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false;
  return true;
}

export const CROSS_RULES = [
  { id: 'even', label: 'Even', title: 'Even numbers', tier: 1, test: (n) => n % 2 === 0 },
  { id: 'odd', label: 'Odd', title: 'Odd numbers', tier: 1, test: (n) => n % 2 === 1 },
  { id: 'm3', label: '×3', title: 'Multiples of 3', tier: 1, test: (n) => n % 3 === 0 },
  { id: 'm5', label: '×5', title: 'Multiples of 5', tier: 1, test: (n) => n % 5 === 0 },
  { id: 'gtHalf', label: '>half', title: 'Greater than half the max', tier: 1, half: true, test: (n, max) => n > max / 2 },
  { id: 'ltQuarter', label: '<25%', title: 'Below a quarter of the max', tier: 1, quarter: true, test: (n, max) => n < max / 4 },
  { id: 'two', label: '2-digit', title: 'Two-digit numbers (10+)', tier: 1, test: (n) => n >= 10 },
  { id: 'one', label: '1-digit', title: 'Single digits (1-9)', tier: 1, test: (n) => n < 10 },
  { id: 'm4', label: '×4', title: 'Multiples of 4', tier: 2, test: (n) => n % 4 === 0 },
  { id: 'm7', label: '×7', title: 'Multiples of 7', tier: 2, test: (n) => n % 7 === 0 },
  { id: 'prime', label: 'Prime', title: 'Prime numbers', tier: 2, test: (n) => isPrime(n) },
  { id: 'square', label: 'Square', title: 'Perfect squares (1, 4, 9, 16...)', tier: 2, test: (n) => Number.isInteger(Math.sqrt(n)) },
];

function rulePasses(rule, n, max) {
  if (rule.half) return n > max / 2;
  if (rule.quarter) return n < max / 4;
  return rule.test(n, max);
}

export function generateCrossRound(level = 1) {
  const size = level <= 2 ? 4 : 5;
  const max = level <= 2 ? 50 : 99;
  const pool = CROSS_RULES.filter((r) => r.tier <= (level <= 2 ? 1 : 2));
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const rowRules = Array.from({ length: size }, () => pool[randInt(0, pool.length - 1)]);
    const colRules = Array.from({ length: size }, () => pool[randInt(0, pool.length - 1)]);
    const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => randInt(2, max)));
    const matches = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (rulePasses(rowRules[r], grid[r][c], max) && rulePasses(colRules[c], grid[r][c], max)) {
          matches.push(`${r},${c}`);
        }
      }
    }
    if (matches.length >= 3 && matches.length <= size + 1) {
      return { size, max, grid, rowRules, colRules, matches };
    }
  }
  const even = CROSS_RULES[0];
  const rowRules = Array.from({ length: size }, () => even);
  const colRules = Array.from({ length: size }, () => even);
  const grid = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => (r + c) % 2 === 0 ? 4 : 3));
  const matches = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (rulePasses(rowRules[r], grid[r][c], max) && rulePasses(colRules[c], grid[r][c], max)) {
        matches.push(`${r},${c}`);
      }
    }
  }
  return { size, max, grid, rowRules, colRules, matches };
}
