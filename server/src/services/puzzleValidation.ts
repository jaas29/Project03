import { PuzzleType } from '../types/puzzle';

export interface GridValidationResult {
  kind: 'grid';
  solved: boolean;
  correctCells: string[];
  totalCells: number;
  solution: Record<string, string[]>;
}

export interface ConnectionsValidationResult {
  kind: 'connections';
  solved: boolean;
  correctGroups: string[][];
  totalGroups: number;
  solution: { category: string; items: string[] }[];
}

export interface WordleValidationResult {
  kind: 'wordle';
  solved: boolean;
  rows: { guess: string; statuses: LetterStatus[] }[];
  answer: string;
}

export type LetterStatus = 'correct' | 'present' | 'absent';

export type PuzzleValidationResult =
  | GridValidationResult
  | ConnectionsValidationResult
  | WordleValidationResult
  | { kind: 'higherlower'; solved: boolean };

export interface PuzzleSubmissionBody {
  attempts: number;
  durationMs: number;
  solved?: boolean;
  guesses?: unknown;
  groups?: unknown;
}

export type PuzzleCheckResult =
  | { kind: 'grid'; correct: boolean; cellKey: string }
  | { kind: 'connections'; correct: boolean }
  | { kind: 'wordle'; guess: string; statuses: LetterStatus[]; solved: boolean }
  | { kind: 'higherlower'; correct: boolean };

export function validatePuzzleSubmission(
  type: PuzzleType,
  solution: unknown,
  body: PuzzleSubmissionBody,
): PuzzleValidationResult {
  switch (type) {
    case 'grid':
      return validateGrid(solution, body.guesses);
    case 'connections':
      return validateConnections(solution, body.groups);
    case 'wordle':
      return validateWordle(solution, body.guesses);
    case 'higherlower':
      return { kind: 'higherlower', solved: Boolean(body.solved) };
    default:
      return { kind: 'higherlower', solved: false };
  }
}

export function checkPuzzleGuess(
  type: PuzzleType,
  solution: unknown,
  body: { cellKey?: string; guess?: string; group?: string[] },
): PuzzleCheckResult {
  switch (type) {
    case 'grid': {
      const cells = getGridCells(solution);
      const cellKey = body.cellKey ?? '';
      const answers = cells[cellKey] ?? [];
      return {
        kind: 'grid',
        cellKey,
        correct: answers.some((answer) => isAcceptedAnswer(body.guess, answer)),
      };
    }
    case 'connections': {
      const solutionGroups = getConnectionsGroups(solution);
      const group = body.group ?? [];
      const submittedKey = groupKey(group);
      return {
        kind: 'connections',
        correct: solutionGroups.some((solutionGroup) => groupKey(solutionGroup.items) === submittedKey),
      };
    }
    case 'wordle': {
      const answer = getWordleAnswer(solution);
      const guess = cleanWord(body.guess ?? '');
      return {
        kind: 'wordle',
        guess,
        statuses: scoreWordleGuess(guess, answer),
        solved: guess === answer,
      };
    }
    case 'higherlower':
      return { kind: 'higherlower', correct: false };
    default:
      return { kind: 'higherlower', correct: false };
  }
}

function validateGrid(solution: unknown, guesses: unknown): GridValidationResult {
  const cells = getGridCells(solution);
  const guessMap = isRecord(guesses) ? guesses : {};

  const correctCells = Object.entries(cells)
    .filter(([key, answers]) => answers.some((answer) => isAcceptedAnswer(guessMap[key], answer)))
    .map(([key]) => key);

  return {
    kind: 'grid',
    solved: correctCells.length === Object.keys(cells).length,
    correctCells,
    totalCells: Object.keys(cells).length,
    solution: cells,
  };
}

function validateConnections(solution: unknown, groups: unknown): ConnectionsValidationResult {
  const solutionGroups = getConnectionsGroups(solution);
  const submittedGroups = Array.isArray(groups) ? groups.filter(isStringArray) : [];
  const submittedKeys = new Set(submittedGroups.map(groupKey));
  const correctGroups = solutionGroups
    .filter((group) => submittedKeys.has(groupKey(group.items)))
    .map((group) => group.items);

  return {
    kind: 'connections',
    solved: correctGroups.length === solutionGroups.length,
    correctGroups,
    totalGroups: solutionGroups.length,
    solution: solutionGroups,
  };
}

function validateWordle(solution: unknown, guesses: unknown): WordleValidationResult {
  const answer = getWordleAnswer(solution);
  const submittedGuesses = Array.isArray(guesses)
    ? guesses.filter((guess): guess is string => typeof guess === 'string')
    : [];

  const rows = submittedGuesses.map((guess) => ({
    guess: cleanWord(guess),
    statuses: scoreWordleGuess(cleanWord(guess), answer),
  }));

  return {
    kind: 'wordle',
    solved: rows.some((row) => row.guess === answer),
    rows,
    answer,
  };
}

export function scoreWordleGuess(guess: string, answer: string): LetterStatus[] {
  const statuses: LetterStatus[] = Array.from({ length: guess.length }, () => 'absent');
  const remaining = answer.split('');

  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === answer[i]) {
      statuses[i] = 'correct';
      remaining[i] = '';
    }
  }

  for (let i = 0; i < guess.length; i += 1) {
    if (statuses[i] === 'correct') continue;
    const matchIndex = remaining.indexOf(guess[i]);
    if (matchIndex >= 0) {
      statuses[i] = 'present';
      remaining[matchIndex] = '';
    }
  }

  return statuses;
}

function getGridCells(solution: unknown): Record<string, string[]> {
  if (!isRecord(solution) || !isRecord(solution.cells)) return {};
  return Object.fromEntries(
    Object.entries(solution.cells)
      .map(([key, value]) => [key, toAnswerList(value)] as const)
      .filter((entry) => entry[1].length > 0),
  );
}

function getConnectionsGroups(solution: unknown): { category: string; items: string[] }[] {
  if (!isRecord(solution) || !Array.isArray(solution.groups)) return [];
  return solution.groups
    .filter(isRecord)
    .map((group) => ({
      category: typeof group.category === 'string' ? group.category : 'Group',
      items: Array.isArray(group.items) ? group.items.filter((item): item is string => typeof item === 'string') : [],
    }))
    .filter((group) => group.items.length > 0);
}

function getWordleAnswer(solution: unknown): string {
  if (!isRecord(solution) || typeof solution.answer !== 'string') return '';
  return cleanWord(solution.answer);
}

function normalizeAnswer(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isAcceptedAnswer(guess: unknown, answer: string): boolean {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedGuess || !normalizedAnswer) return false;
  if (normalizedGuess === normalizedAnswer) return true;

  const answerParts = normalizeWords(answer);
  const lastName = answerParts.at(-1);
  return Boolean(lastName && normalizedGuess === normalizeAnswer(lastName));
}

function toAnswerList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function normalizeWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function cleanWord(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '');
}

function groupKey(items: string[]): string {
  return items.map(normalizeAnswer).sort().join('|');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
