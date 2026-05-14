const PREFIX = 'jbd.game.';

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
