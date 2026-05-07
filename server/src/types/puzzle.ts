export type PuzzleType = 'grid' | 'connections' | 'wordle' | 'higherlower';

export interface Puzzle {
  id: string;
  date: string; // YYYY-MM-DD
  type: PuzzleType;
  payload: unknown;
}

export interface PlayResult {
  puzzleId: string;
  score: number;
  attempts: number;
  durationMs: number;
}
