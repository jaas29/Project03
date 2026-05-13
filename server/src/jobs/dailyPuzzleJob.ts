import cron from 'node-cron';
import { generateGrid, generateConnections, generateWordle, generateHigherLower } from '../services/puzzleGenerator';
import { Puzzle } from '../models/Puzzle';
import { PuzzleType } from '../types/puzzle';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function generateAndSave(
  type: PuzzleType,
  date: string,
  generator: () => Promise<{ payload: unknown; solution: unknown }>,
): Promise<void> {
  const existing = await Puzzle.findOne({ date, type });
  if (existing) return;

  let result: { payload: unknown; solution: unknown };
  try {
    result = await generator();
  } catch (err) {
    console.error(`[cron] failed to generate ${type} puzzle for ${date}:`, err);
    // Retry once after 30 s
    await new Promise((r) => setTimeout(r, 30_000));
    result = await generator();
  }

  await Puzzle.create({ date, type, ...result });
  console.log(`[cron] created ${type} puzzle for ${date}`);
}

export async function runDailyPuzzleJob(): Promise<void> {
  const date = todayUTC();
  console.log(`[cron] generating puzzles for ${date}`);

  await Promise.allSettled([
    generateAndSave('grid', date, generateGrid),
    generateAndSave('connections', date, generateConnections),
    generateAndSave('wordle', date, generateWordle),
    generateAndSave('higherlower', date, generateHigherLower),
  ]);

  console.log('[cron] done');
}

// Runs at midnight UTC every day
export function scheduleDailyPuzzleJob(): void {
  cron.schedule('0 0 * * *', runDailyPuzzleJob, { timezone: 'UTC' });
  console.log('[cron] daily puzzle job scheduled');
}
