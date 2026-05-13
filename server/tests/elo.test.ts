import { applyElo, computeEloDelta, expectedScore } from '../src/services/elo';

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
  });

  it('higher-rated player has expected score > 0.5', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
  });

  it('lower-rated player has expected score < 0.5', () => {
    expect(expectedScore(800, 1000)).toBeLessThan(0.5);
  });

  it('sum of both sides equals 1', () => {
    const ea = expectedScore(1100, 900);
    const eb = expectedScore(900, 1100);
    expect(ea + eb).toBeCloseTo(1);
  });
});

describe('computeEloDelta', () => {
  it('equal ratings win gives +16', () => {
    expect(computeEloDelta(1000, 1000, 'win')).toBe(16);
  });

  it('equal ratings loss gives -16', () => {
    expect(computeEloDelta(1000, 1000, 'loss')).toBe(-16);
  });

  it('equal ratings draw gives 0', () => {
    expect(computeEloDelta(1000, 1000, 'draw')).toBe(0);
  });

  it('higher-rated beating lower-rated yields smaller positive delta', () => {
    const favored = computeEloDelta(1200, 1000, 'win');
    const even = computeEloDelta(1000, 1000, 'win');
    expect(favored).toBeGreaterThan(0);
    expect(favored).toBeLessThan(even);
  });

  it('upset win (lower beats higher) yields larger positive delta', () => {
    const upset = computeEloDelta(1000, 1200, 'win');
    const even = computeEloDelta(1000, 1000, 'win');
    expect(upset).toBeGreaterThan(even);
  });
});

describe('applyElo', () => {
  it('is zero-sum: total ELO is conserved', () => {
    const { newA, newB } = applyElo(1000, 1000, 'win');
    expect(newA + newB).toBe(2000);
  });

  it('winner gains ELO, loser loses ELO', () => {
    const { newA, newB } = applyElo(1000, 1000, 'win');
    expect(newA).toBeGreaterThan(1000);
    expect(newB).toBeLessThan(1000);
  });

  it('draw with equal ratings leaves both unchanged', () => {
    const { newA, newB } = applyElo(1000, 1000, 'draw');
    expect(newA).toBe(1000);
    expect(newB).toBe(1000);
  });

  it('delta equals what A gained', () => {
    const { newA, delta } = applyElo(1000, 1000, 'win');
    expect(newA - 1000).toBe(delta);
  });

  it('loss is the mirror of win', () => {
    const win = applyElo(1000, 1200, 'win');
    const loss = applyElo(1200, 1000, 'loss');
    expect(win.newA).toBe(loss.newB);
    expect(win.newB).toBe(loss.newA);
  });
});
