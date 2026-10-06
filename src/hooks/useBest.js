import { useCallback, useState } from 'react';

const PREFIX = 'mathmind-arcade-';

export default function useBest(key, initial = 0) {
  const [best, setBest] = useState(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      const v = Number(raw);
      return Number.isFinite(v) && v > 0 ? v : initial;
    } catch {
      return initial;
    }
  });

  const consider = useCallback(
    (value) => {
      setBest((prev) => {
        if (!Number.isFinite(value) || value <= prev) return prev;
        try {
          localStorage.setItem(PREFIX + key, String(value));
        } catch {
          // storage unavailable; keep the in-memory best
        }
        return value;
      });
    },
    [key],
  );

  return [best, consider];
}
