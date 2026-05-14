import { checkPuzzleGuess, scoreWordleGuess, validatePuzzleSubmission } from '../src/services/puzzleValidation';

describe('validatePuzzleSubmission', () => {
  it('validates grid guesses against stored cell answers', () => {
    const result = validatePuzzleSubmission(
      'grid',
      { cells: { 'PL,ARS': 'Thierry Henry', 'PD,RMA': 'Luka Modric' } },
      {
        attempts: 2,
        durationMs: 20_000,
        guesses: { 'PL,ARS': 'thierry henry', 'PD,RMA': 'Wrong Name' },
      },
    );

    expect(result.kind).toBe('grid');
    if (result.kind !== 'grid') return;
    expect(result.solved).toBe(false);
    expect(result.correctCells).toEqual(['PL,ARS']);
  });

  it('accepts grid answer lists and last-name guesses', () => {
    const result = validatePuzzleSubmission(
      'grid',
      { cells: { 'PL,ARS': ['Thierry Henry', 'Bukayo Saka'] } },
      {
        attempts: 1,
        durationMs: 20_000,
        guesses: { 'PL,ARS': 'saka' },
      },
    );

    expect(result.kind).toBe('grid');
    if (result.kind !== 'grid') return;
    expect(result.solved).toBe(true);
    expect(result.correctCells).toEqual(['PL,ARS']);
  });

  it('validates connections groups ignoring order', () => {
    const result = validatePuzzleSubmission(
      'connections',
      {
        groups: [
          { category: 'Premier League clubs', items: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City'] },
        ],
      },
      {
        attempts: 1,
        durationMs: 20_000,
        groups: [['Liverpool', 'Arsenal', 'Manchester City', 'Chelsea']],
      },
    );

    expect(result.kind).toBe('connections');
    if (result.kind !== 'connections') return;
    expect(result.solved).toBe(true);
    expect(result.correctGroups).toHaveLength(1);
  });

  it('validates wordle guesses and returns letter statuses', () => {
    const result = validatePuzzleSubmission(
      'wordle',
      { answer: 'LUKAKU' },
      { attempts: 2, durationMs: 20_000, guesses: ['SALAH', 'LUKAKU'] },
    );

    expect(result.kind).toBe('wordle');
    if (result.kind !== 'wordle') return;
    expect(result.solved).toBe(true);
    expect(result.rows.at(-1)?.statuses.every((status) => status === 'correct')).toBe(true);
  });
});

describe('scoreWordleGuess', () => {
  it('marks correct, present, and absent letters', () => {
    expect(scoreWordleGuess('KULUKU', 'LUKAKU')).toEqual([
      'present',
      'correct',
      'present',
      'absent',
      'correct',
      'correct',
    ]);
  });
});

describe('checkPuzzleGuess', () => {
  it('checks a single grid cell immediately', () => {
    expect(checkPuzzleGuess(
      'grid',
      { cells: { 'PL,ARS': ['Thierry Henry', 'Bukayo Saka'] } },
      { cellKey: 'PL,ARS', guess: 'saka' },
    )).toEqual({ kind: 'grid', cellKey: 'PL,ARS', correct: true });
  });

  it('checks a wordle guess immediately', () => {
    expect(checkPuzzleGuess('wordle', { answer: 'OLISE' }, { guess: 'OLISE' })).toEqual({
      kind: 'wordle',
      guess: 'OLISE',
      statuses: ['correct', 'correct', 'correct', 'correct', 'correct'],
      solved: true,
    });
  });
});
