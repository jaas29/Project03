import { generateConnections, generateWordle, generateHigherLower } from '../src/services/puzzleGenerator';

describe('generateConnections', () => {
  it('returns 16 shuffled items', async () => {
    const { payload } = await generateConnections();
    expect(payload.items).toHaveLength(16);
  });

  it('solution has exactly 4 groups', async () => {
    const { solution } = await generateConnections();
    expect(solution.groups).toHaveLength(4);
  });

  it('each group has exactly 4 items', async () => {
    const { solution } = await generateConnections();
    solution.groups.forEach((g) => expect(g.items).toHaveLength(4));
  });

  it('payload items match flattened solution items (same set)', async () => {
    const { payload, solution } = await generateConnections();
    const solutionItems = solution.groups.flatMap((g) => g.items).sort();
    expect([...payload.items].sort()).toEqual(solutionItems);
  });

  it('groups have valid colors', async () => {
    const { solution } = await generateConnections();
    const validColors = new Set(['yellow', 'green', 'blue', 'purple']);
    solution.groups.forEach((g) => expect(validColors.has(g.color)).toBe(true));
  });
});

describe('generateWordle', () => {
  it('answer is 5 or 6 uppercase letters', async () => {
    const { solution } = await generateWordle();
    expect(solution.answer).toMatch(/^[A-Z]{5,6}$/);
  });

  it('payload length matches answer length', async () => {
    const { payload, solution } = await generateWordle();
    expect(payload.length).toBe(solution.answer.length);
  });

  it('maxAttempts is 6', async () => {
    const { payload } = await generateWordle();
    expect(payload.maxAttempts).toBe(6);
  });

  it('includes a hint string', async () => {
    const { payload } = await generateWordle();
    expect(typeof payload.hint).toBe('string');
    expect(payload.hint.length).toBeGreaterThan(0);
  });
});

describe('generateHigherLower', () => {
  it('returns 8 rounds', async () => {
    const { payload } = await generateHigherLower();
    expect(payload.rounds).toBe(8);
    expect(payload.players).toHaveLength(8);
  });

  it('solution values match round count', async () => {
    const { payload, solution } = await generateHigherLower();
    expect(solution.values).toHaveLength(payload.rounds);
  });

  it('all transfer values are positive numbers', async () => {
    const { solution } = await generateHigherLower();
    solution.values.forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  it('payload does not expose transfer values', async () => {
    const { payload } = await generateHigherLower();
    payload.players.forEach((p) => {
      expect(p).not.toHaveProperty('valueMEur');
    });
  });

  it('players have required fields', async () => {
    const { payload } = await generateHigherLower();
    payload.players.forEach((p) => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('club');
      expect(p).toHaveProperty('nationality');
      expect(p).toHaveProperty('position');
    });
  });
});
