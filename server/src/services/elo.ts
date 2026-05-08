const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function computeEloDelta(
  ratingA: number,
  ratingB: number,
  outcome: 'win' | 'loss' | 'draw'
): number {
  const ea = expectedScore(ratingA, ratingB);
  const sa = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0;
  return Math.round(K * (sa - ea));
}

export function applyElo(
  ratingA: number,
  ratingB: number,
  outcome: 'win' | 'loss' | 'draw'
): { newA: number; newB: number; delta: number } {
  const delta = computeEloDelta(ratingA, ratingB, outcome);
  return { newA: ratingA + delta, newB: ratingB - delta, delta };
}
