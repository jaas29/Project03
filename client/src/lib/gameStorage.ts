const PREFIX = 'jbd.game.';
const DAILY_PROGRESS_KEY = 'jogo-bonito-daily-progress';

export function loadGame<T>(puzzleId: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + puzzleId);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveGame(puzzleId: string, state: unknown): void {
  try {
    localStorage.setItem(PREFIX + puzzleId, JSON.stringify(state));
  } catch {}
}

export function clearAllGames(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(DAILY_PROGRESS_KEY);
}
