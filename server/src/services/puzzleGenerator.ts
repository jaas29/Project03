import { getCompetitionTeams, getTeamSquad, SUPPORTED_COMPETITIONS, FdTeam } from './footballApi';

// ─── Shared helpers ────────────────────────────────────────────────────────

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Football Grid ──────────────────────────────────────────────────────────
// 3×3 grid: rows = competitions, cols = teams. Each cell = a player who
// played for that team in that competition.

export interface GridCell {
  row: string;   // competition code
  col: string;   // team tla
  answer: string; // player name (hidden on client)
}

export interface GridPayload {
  rows: string[];  // 3 competition codes
  cols: string[];  // 3 team tlas + names
  teamMeta: Record<string, { name: string; crest: string }>;
}

export interface GridSolution {
  cells: Record<string, string>; // key = "row,col", value = player name
}

export async function generateGrid(): Promise<{ payload: GridPayload; solution: GridSolution }> {
  const competitionCodes = pick([...SUPPORTED_COMPETITIONS], 3);

  const teamsByComp: Record<string, FdTeam[]> = {};
  for (const code of competitionCodes) {
    const { teams } = await getCompetitionTeams(code);
    teamsByComp[code] = teams;
  }

  // Pick 3 teams that appear in at least 2 of the chosen competitions
  const allTeams = Object.values(teamsByComp).flat();
  const uniqueTeams = [...new Map(allTeams.map((t) => [t.id, t])).values()];
  const colTeams = pick(uniqueTeams, 3);

  const teamMeta: GridPayload['teamMeta'] = {};
  for (const t of colTeams) {
    teamMeta[t.tla] = { name: t.name, crest: t.crest };
  }

  const cells: GridSolution['cells'] = {};

  for (const code of competitionCodes) {
    for (const team of colTeams) {
      try {
        const { team: teamData } = await getTeamSquad(team.id);
        const squadNames = (teamData.squad ?? []).map((p) => p.name);
        cells[`${code},${team.tla}`] = pickOne(squadNames) ?? '?';
      } catch {
        cells[`${code},${team.tla}`] = '?';
      }
    }
  }

  return {
    payload: {
      rows: competitionCodes,
      cols: colTeams.map((t) => t.tla),
      teamMeta,
    },
    solution: { cells },
  };
}

// ─── Connections ────────────────────────────────────────────────────────────
// 4 groups of 4 items. Categories: clubs by country, player nationalities,
// trophies, or jersey numbers.

export interface ConnectionsGroup {
  category: string;
  color: 'yellow' | 'green' | 'blue' | 'purple';
  items: string[];
}

export interface ConnectionsPayload {
  items: string[]; // 16 shuffled items
}

export interface ConnectionsSolution {
  groups: ConnectionsGroup[];
}

const STATIC_GROUPS: ConnectionsGroup[] = [
  {
    category: 'La Liga clubs',
    color: 'yellow',
    items: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Sevilla'],
  },
  {
    category: 'Premier League clubs',
    color: 'green',
    items: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City'],
  },
  {
    category: 'Serie A clubs',
    color: 'blue',
    items: ['Juventus', 'Inter Milan', 'AC Milan', 'Napoli'],
  },
  {
    category: 'Bundesliga clubs',
    color: 'purple',
    items: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'],
  },
];

const EXTRA_GROUPS: ConnectionsGroup[] = [
  {
    category: 'Brazilian clubs',
    color: 'yellow',
    items: ['Flamengo', 'Palmeiras', 'Santos', 'Corinthians'],
  },
  {
    category: 'Portuguese clubs',
    color: 'green',
    items: ['Benfica', 'Porto', 'Sporting CP', 'Braga'],
  },
  {
    category: 'Argentine clubs',
    color: 'blue',
    items: ['Boca Juniors', 'River Plate', 'Racing Club', 'San Lorenzo'],
  },
  {
    category: 'Dutch clubs',
    color: 'purple',
    items: ['Ajax', 'PSV', 'Feyenoord', 'AZ Alkmaar'],
  },
];

const ALL_GROUP_POOLS = [STATIC_GROUPS, EXTRA_GROUPS];

export async function generateConnections(): Promise<{ payload: ConnectionsPayload; solution: ConnectionsSolution }> {
  const pool = pickOne(ALL_GROUP_POOLS);
  const groups = pick(pool, 4) as ConnectionsGroup[];
  const items = pick(groups.flatMap((g) => g.items), 16);

  return {
    payload: { items },
    solution: { groups },
  };
}

// ─── Wordle ─────────────────────────────────────────────────────────────────
// 6-letter football player surnames.

export interface WordlePayload {
  length: number;
  maxAttempts: number;
  hint: string;
}

export interface WordleSolution {
  answer: string; // uppercase
}

const WORDLE_WORDS = [
  { word: 'MBAPPE', hint: 'French superstar, PSG & Real Madrid' },
  { word: 'NEYMAR', hint: 'Brazilian forward' },
  { word: 'MODRIC', hint: 'Croatian maestro' },
  { word: 'KROOS', hint: 'German midfielder, retired 2024' },
  { word: 'SALAH', hint: 'Egyptian King of Liverpool' },
  { word: 'BENZEMA', hint: 'Ballon d\'Or 2022 winner' },
  { word: 'CASEM', hint: 'Brazilian defensive midfielder' },
  { word: 'ALISON', hint: 'Liverpool keeper' },
  { word: 'STONES', hint: 'Manchester City centre-back' },
  { word: 'KANTE', hint: 'French box-to-box midfielder' },
  { word: 'LUKAKU', hint: 'Belgian striker' },
  { word: 'GNABRY', hint: 'German winger, Bayern Munich' },
  { word: 'SAKA', hint: 'England & Arsenal winger' },
  { word: 'PEDRI', hint: 'Barcelona & Spain midfielder' },
  { word: 'VINI', hint: 'Brazilian winger nickname' },
  { word: 'PULISI', hint: 'American forward' },
];

// Filter to only 5-6 letter words for Wordle-style play
const VALID_WORDLE = WORDLE_WORDS.filter((w) => w.word.length >= 5 && w.word.length <= 6);

export async function generateWordle(): Promise<{ payload: WordlePayload; solution: WordleSolution }> {
  const entry = pickOne(VALID_WORDLE);
  return {
    payload: {
      length: entry.word.length,
      maxAttempts: 6,
      hint: entry.hint,
    },
    solution: { answer: entry.word },
  };
}
