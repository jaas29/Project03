import { PuzzleType } from '../types/puzzle';

interface ScoreInput {
  type: PuzzleType;
  attempts: number;
  durationMs: number;
  solved: boolean;
}

const MAX_SCORE = 1000;
const TIME_PENALTY_PER_SEC = 1; // lose 1 pt per second after 30s

export function calculateScore({ type, attempts, durationMs, solved }: ScoreInput): number {
  if (!solved) return 0;

  const seconds = Math.floor(durationMs / 1000);
  let base: number;

  switch (type) {
    case 'grid':
      // 9 cells; lose points per wrong guess
      base = MAX_SCORE - (attempts - 9) * 30;
      break;
    case 'connections':
      // 4 groups; each wrong guess costs more
      base = MAX_SCORE - (attempts - 4) * 50;
      break;
    case 'wordle':
      // 6 attempts max; fewer = better
      base = MAX_SCORE - (attempts - 1) * 100;
      break;
    case 'higherlower':
      base = MAX_SCORE - (attempts - 1) * 80;
      break;
    default:
      base = MAX_SCORE;
  }

  const timePenalty = Math.max(0, seconds - 30) * TIME_PENALTY_PER_SEC;
  return Math.max(0, Math.min(MAX_SCORE, base - timePenalty));
}
