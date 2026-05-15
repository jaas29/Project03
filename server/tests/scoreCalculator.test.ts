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

  it('grid gives max 150 when all cells and all lines are completed', () => {
    const score = calculateScore({
      type: 'grid',
      attempts: 9,
      durationMs: 0,
      solved: true,
      validation: {
        kind: 'grid',
        correctCells: [
          'R1,C1', 'R1,C2', 'R1,C3',
          'R2,C1', 'R2,C2', 'R2,C3',
          'R3,C1', 'R3,C2', 'R3,C3',
        ],
      },
    });
    expect(score).toBe(150);
  });

  it('grid gives partial credit even if puzzle is not solved', () => {
    const score = calculateScore({
      type: 'grid',
      attempts: 4,
      durationMs: 20_000,
      solved: false,
      validation: {
        kind: 'grid',
        correctCells: ['R1,C1', 'R1,C2', 'R1,C3', 'R2,C1'],
      },
    });
    // 4 correct cells (40) + one completed row (10)
    expect(score).toBe(50);
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
