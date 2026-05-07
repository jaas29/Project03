import { calculateScore } from '../src/services/scoreCalculator';

describe('calculateScore', () => {
  it('returns 0 when not solved', () => {
    expect(calculateScore({ type: 'wordle', attempts: 6, durationMs: 60_000, solved: false })).toBe(0);
  });

  it('wordle perfect solve (1 attempt, fast) gives max score', () => {
    const score = calculateScore({ type: 'wordle', attempts: 1, durationMs: 10_000, solved: true });
    expect(score).toBe(1000);
  });

  it('wordle penalises extra attempts', () => {
    const fast = calculateScore({ type: 'wordle', attempts: 1, durationMs: 10_000, solved: true });
    const slow = calculateScore({ type: 'wordle', attempts: 4, durationMs: 10_000, solved: true });
    expect(fast).toBeGreaterThan(slow);
  });

  it('score is never negative', () => {
    const score = calculateScore({ type: 'wordle', attempts: 6, durationMs: 600_000, solved: true });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('score is never above 1000', () => {
    const score = calculateScore({ type: 'grid', attempts: 9, durationMs: 0, solved: true });
    expect(score).toBeLessThanOrEqual(1000);
  });

  it('connections: fewer attempts = higher score', () => {
    const good = calculateScore({ type: 'connections', attempts: 4, durationMs: 20_000, solved: true });
    const bad = calculateScore({ type: 'connections', attempts: 8, durationMs: 20_000, solved: true });
    expect(good).toBeGreaterThan(bad);
  });

  it('time penalty kicks in after 30 seconds', () => {
    const fast = calculateScore({ type: 'wordle', attempts: 2, durationMs: 30_000, solved: true });
    const slow = calculateScore({ type: 'wordle', attempts: 2, durationMs: 90_000, solved: true });
    expect(fast).toBeGreaterThan(slow);
  });
});
