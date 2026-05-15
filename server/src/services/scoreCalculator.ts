import { PuzzleType } from '../types/puzzle';

interface ScoreInput {
  type: PuzzleType;
  attempts: number;
  durationMs: number;
  solved: boolean;
  validation?: unknown;
}

const MAX_SCORE = 1000;
const TIME_PENALTY_PER_SEC = 1; // lose 1 pt per second after 30s

function gridLineBonus(correctCells: string[]): number {
  const rows = new Map<string, number>();
  const cols = new Map<string, number>();

  for (const cell of correctCells) {
    const [row, col] = cell.split(',');
    if (!row || !col) continue;
    rows.set(row, (rows.get(row) ?? 0) + 1);
    cols.set(col, (cols.get(col) ?? 0) + 1);
  }

  const completedRows = [...rows.values()].filter((count) => count >= 3).length;
  const completedCols = [...cols.values()].filter((count) => count >= 3).length;
  return (completedRows + completedCols) * 10;
}

function scoreGrid(validation: unknown): number {
  const result = validation as { kind?: string; correctCells?: unknown } | undefined;
  const correctCells =
    result?.kind === 'grid' && Array.isArray(result.correctCells)
      ? result.correctCells.filter((cell): cell is string => typeof cell === 'string')
      : [];

  const cellPoints = correctCells.length * 10;
  const linePoints = gridLineBonus(correctCells);
  return Math.max(0, Math.min(150, cellPoints + linePoints));
}

export function calculateScore({ type, attempts, durationMs, solved, validation }: ScoreInput): number {
  if (type === 'grid') {
    return scoreGrid(validation);
  }

  if (!solved) return 0;

  const seconds = Math.floor(durationMs / 1000);
  let base: number;

  switch (type) {
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
