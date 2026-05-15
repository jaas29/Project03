import { useEffect, useState } from 'react';
import { api, extractApiError } from '../api/client';
import type { ApiPuzzle } from '../pages/PuzzlePlay';

interface PuzzleProgress {
  type: 'grid' | 'connections' | 'wordle';
  status: 'not-started' | 'completed';
}

const STORAGE_KEY = 'jogo-bonito-daily-progress';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useTodayProgress() {
  const [puzzles, setPuzzles] = useState<ApiPuzzle[]>([]);
  const [progress, setProgress] = useState<Record<string, PuzzleProgress['status']>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        setLoading(true);
        setError(null);

        // Fetch today's puzzles
        const puzzlesRes = await api.get<{ date: string; puzzles: ApiPuzzle[] }>(
          '/api/puzzles/today'
        );
        setPuzzles(puzzlesRes.data.puzzles);

        // Load completion status from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        const completedToday = stored ? JSON.parse(stored)[getTodayKey()] || {} : {};

        const progressMap: Record<string, PuzzleProgress['status']> = {};
        puzzlesRes.data.puzzles.forEach((puzzle) => {
          progressMap[puzzle.type] = completedToday[puzzle.type] ? 'completed' : 'not-started';
        });
        setProgress(progressMap);
      } catch (err) {
        setError(extractApiError(err));
        // Fallback: try to load from localStorage at least
        const stored = localStorage.getItem(STORAGE_KEY);
        const completedToday = stored ? JSON.parse(stored)[getTodayKey()] || {} : {};
        setProgress({
          grid: completedToday.grid ? 'completed' : 'not-started',
          connections: completedToday.connections ? 'completed' : 'not-started',
          wordle: completedToday.wordle ? 'completed' : 'not-started',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();

    // Listen for puzzle completion events from PuzzlePlay
    const handlePuzzleComplete = (
      event: Event
    ) => {
      const customEvent = event as CustomEvent<{ type: string; date: string }>;
      const { type, date } = customEvent.detail;
      if (date === getTodayKey()) {
        setProgress((prev) => ({ ...prev, [type]: 'completed' }));
      }
    };

    window.addEventListener('puzzle-completed', handlePuzzleComplete);
    return () => {
      window.removeEventListener('puzzle-completed', handlePuzzleComplete);
    };
  }, []);

  return { puzzles, progress, loading, error };
}

export function markPuzzleComplete(type: 'grid' | 'connections' | 'wordle') {
  const today = getTodayKey();
  const stored = localStorage.getItem(STORAGE_KEY);
  const data = stored ? JSON.parse(stored) : {};

  if (!data[today]) {
    data[today] = {};
  }
  data[today][type] = true;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // Dispatch a storage event so other tabs/components can listen
  window.dispatchEvent(
    new CustomEvent('puzzle-completed', { detail: { type, date: today } })
  );
}
