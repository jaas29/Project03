import { getLeagueTeams, getTeamSquad, SUPPORTED_COMPETITIONS, LeagueCode } from './footballApi';

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

// Static fallback used when football-data.org API is unavailable
const GRID_FALLBACK: { payload: GridPayload; solution: GridSolution } = {
  payload: {
    rows: ['PL', 'PD', 'BL1'],
    cols: ['MCI', 'FCB', 'FCB'],
    teamMeta: {
      MCI:  { name: 'Manchester City',   crest: '' },
      FCB:  { name: 'FC Barcelona',      crest: '' },
      FCBM: { name: 'FC Bayern München', crest: '' },
    },
  },
  solution: {
    cells: {
      'PL,MCI':  'Kevin De Bruyne',  'PL,FCB':  'Raheem Sterling', 'PL,FCBM': 'Harry Kane',
      'PD,MCI':  'Rodri',           'PD,FCB':  'Pedri',           'PD,FCBM': 'Robert Lewandowski',
      'BL1,MCI': 'İlkay Gündoğan', 'BL1,FCB': 'Gavi',            'BL1,FCBM': 'Thomas Müller',
    },
  },
};

export async function generateGrid(): Promise<{ payload: GridPayload; solution: GridSolution }> {
  try {
    const competitionCodes = pick([...SUPPORTED_COMPETITIONS], 3) as LeagueCode[];

    const teamsByComp: Record<string, Awaited<ReturnType<typeof getLeagueTeams>>> = {};
    for (const code of competitionCodes) {
      teamsByComp[code] = await getLeagueTeams(code);
    }

    const allTeams = Object.values(teamsByComp).flat();
    const uniqueTeams = [...new Map(allTeams.map((t) => [t.idTeam, t])).values()];
    const colTeams = pick(uniqueTeams, 3);

    const teamMeta: GridPayload['teamMeta'] = {};
    for (const t of colTeams) {
      const key = t.strTeamShort || t.strTeam.slice(0, 3).toUpperCase();
      teamMeta[key] = { name: t.strTeam, crest: t.strBadge };
    }

    const cells: GridSolution['cells'] = {};
    for (const code of competitionCodes) {
      for (const team of colTeams) {
        const key = team.strTeamShort || team.strTeam.slice(0, 3).toUpperCase();
        try {
          const players = await getTeamSquad(team.idTeam);
          cells[`${code},${key}`] = pickOne(players)?.strPlayer ?? '?';
        } catch {
          cells[`${code},${key}`] = '?';
        }
      }
    }

    return {
      payload: { rows: competitionCodes, cols: colTeams.map((t) => t.strTeamShort || t.strTeam.slice(0, 3).toUpperCase()), teamMeta },
      solution: { cells },
    };
  } catch {
    // API unavailable — serve static fallback so Grid always generates
    return GRID_FALLBACK;
  }
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

const ALL_CONNECTIONS_GROUPS: ConnectionsGroup[] = [
  { category: 'La Liga clubs',        color: 'yellow', items: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Sevilla'] },
  { category: 'Premier League clubs', color: 'green',  items: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City'] },
  { category: 'Serie A clubs',        color: 'blue',   items: ['Juventus', 'Inter Milan', 'AC Milan', 'Napoli'] },
  { category: 'Bundesliga clubs',     color: 'purple', items: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'] },
  { category: 'Brazilian clubs',      color: 'yellow', items: ['Flamengo', 'Palmeiras', 'Santos', 'Corinthians'] },
  { category: 'Portuguese clubs',     color: 'green',  items: ['Benfica', 'Porto', 'Sporting CP', 'Braga'] },
  { category: 'Argentine clubs',      color: 'blue',   items: ['Boca Juniors', 'River Plate', 'Racing Club', 'San Lorenzo'] },
  { category: 'Dutch clubs',          color: 'purple', items: ['Ajax', 'PSV', 'Feyenoord', 'AZ Alkmaar'] },
  { category: 'French clubs',         color: 'yellow', items: ['PSG', 'Olympique Lyon', 'Marseille', 'Monaco'] },
  { category: 'Turkish clubs',        color: 'green',  items: ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor'] },
  { category: 'Mexican clubs',        color: 'blue',   items: ['Club América', 'Chivas', 'Cruz Azul', 'Tigres'] },
  { category: 'English legends',      color: 'purple', items: ['Wayne Rooney', 'Steven Gerrard', 'Frank Lampard', 'Alan Shearer'] },
  { category: 'Spanish legends',      color: 'yellow', items: ['Raúl', 'Xavi', 'Andrés Iniesta', 'David Villa'] },
  { category: 'South American legends', color: 'green', items: ['Pelé', 'Diego Maradona', 'Ronaldinho', 'Gabriel Batistuta'] },
  { category: 'Ballon d\'Or winners 2015–2024', color: 'blue', items: ['Luka Modrić', 'Lionel Messi', 'Karim Benzema', 'Rodri'] },
  { category: 'FIFA World Cup hosts 2000s+', color: 'purple', items: ['South Korea/Japan', 'Germany', 'South Africa', 'Brazil'] },
];

export async function generateConnections(): Promise<{ payload: ConnectionsPayload; solution: ConnectionsSolution }> {
  const groups = pick(ALL_CONNECTIONS_GROUPS, 4) as ConnectionsGroup[];
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
  { word: 'MODRIC', hint: 'Croatian maestro, Real Madrid' },
  { word: 'KROOS',  hint: 'German midfielder, retired 2024' },
  { word: 'SALAH',  hint: 'Egyptian King of Liverpool' },
  { word: 'STONES', hint: 'Manchester City centre-back' },
  { word: 'KANTE',  hint: 'French box-to-box midfielder' },
  { word: 'LUKAKU', hint: 'Belgian striker' },
  { word: 'GNABRY', hint: 'German winger, Bayern Munich' },
  { word: 'PEDRI',  hint: 'Barcelona & Spain midfielder' },
  { word: 'ALABA',  hint: 'Austrian defender, Real Madrid' },
  { word: 'KIMMICH', hint: 'German midfielder, Bayern Munich' },
  { word: 'THIAGO', hint: 'Spanish-Brazilian midfielder' },
  { word: 'PULISIC', hint: 'American forward, AC Milan' },
  { word: 'RUDIGER', hint: 'German defender, Real Madrid' },
  { word: 'MUSIALA', hint: 'Young German star, Bayern Munich' },
  { word: 'YAMAL',  hint: 'Spanish teenage prodigy, Barcelona' },
  { word: 'WIRTZ',  hint: 'German creative midfielder, Leverkusen' },
  { word: 'GAVI',   hint: 'Spanish midfielder, Barcelona' },
  { word: 'FODEN',  hint: 'English midfielder, Manchester City' },
  { word: 'DIAZ',   hint: 'Colombian winger, Liverpool' },
  { word: 'OLISE',  hint: 'French winger, Bayern Munich' },
  { word: 'SAKA',   hint: 'English winger, Arsenal' },
  { word: 'ODEGAARD', hint: 'Norwegian captain, Arsenal' },
  { word: 'RICE',   hint: 'English midfielder, Arsenal' },
  { word: 'TRENT',  hint: 'English right-back, now at Real Madrid' },
  { word: 'CARVAJAL', hint: 'Spanish right-back, Real Madrid' },
  { word: 'MILITAO', hint: 'Brazilian centre-back, Real Madrid' },
  { word: 'CAMAVINGA', hint: 'French midfielder, Real Madrid' },
  { word: 'BELLINGHAM', hint: 'English midfielder, Real Madrid' },
  { word: 'OSIMHEN', hint: 'Nigerian striker, Napoli' },
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

// ─── Higher / Lower ─────────────────────────────────────────────────────────
// Guess whether a player's transfer value is higher or lower than the previous.

export interface HigherLowerPlayer {
  name: string;
  club: string;
  nationality: string;
  position: string;
  /** Value in millions EUR — shown only after guess */
  valueMEur: number;
}

export interface HigherLowerPayload {
  /** Ordered list of players; client shows one at a time */
  players: Omit<HigherLowerPlayer, 'valueMEur'>[];
  rounds: number;
}

export interface HigherLowerSolution {
  values: number[]; // valueMEur in same order as players
}

const HIGHER_LOWER_POOL: HigherLowerPlayer[] = [
  { name: 'Kylian Mbappé',      club: 'Real Madrid',       nationality: 'France',    position: 'Forward',    valueMEur: 180 },
  { name: 'Erling Haaland',     club: 'Manchester City',   nationality: 'Norway',    position: 'Forward',    valueMEur: 180 },
  { name: 'Vinicius Jr.',       club: 'Real Madrid',       nationality: 'Brazil',    position: 'Forward',    valueMEur: 180 },
  { name: 'Jude Bellingham',    club: 'Real Madrid',       nationality: 'England',   position: 'Midfielder', valueMEur: 180 },
  { name: 'Bukayo Saka',        club: 'Arsenal',           nationality: 'England',   position: 'Winger',     valueMEur: 160 },
  { name: 'Florian Wirtz',      club: 'Bayer Leverkusen',  nationality: 'Germany',   position: 'Midfielder', valueMEur: 150 },
  { name: 'Rodri',              club: 'Manchester City',   nationality: 'Spain',     position: 'Midfielder', valueMEur: 150 },
  { name: 'Phil Foden',         club: 'Manchester City',   nationality: 'England',   position: 'Midfielder', valueMEur: 150 },
  { name: 'Pedri',              club: 'Barcelona',         nationality: 'Spain',     position: 'Midfielder', valueMEur: 120 },
  { name: 'Lamine Yamal',       club: 'Barcelona',         nationality: 'Spain',     position: 'Winger',     valueMEur: 120 },
  { name: 'Mohamed Salah',      club: 'Liverpool',         nationality: 'Egypt',     position: 'Forward',    valueMEur: 60  },
  { name: 'Harry Kane',         club: 'Bayern Munich',     nationality: 'England',   position: 'Forward',    valueMEur: 90  },
  { name: 'Jamal Musiala',      club: 'Bayern Munich',     nationality: 'Germany',   position: 'Midfielder', valueMEur: 130 },
  { name: 'Gavi',               club: 'Barcelona',         nationality: 'Spain',     position: 'Midfielder', valueMEur: 90  },
  { name: 'Declan Rice',        club: 'Arsenal',           nationality: 'England',   position: 'Midfielder', valueMEur: 120 },
  { name: 'Nico Williams',      club: 'Athletic Bilbao',   nationality: 'Spain',     position: 'Winger',     valueMEur: 100 },
  { name: 'Raphinha',           club: 'Barcelona',         nationality: 'Brazil',    position: 'Winger',     valueMEur: 90  },
  { name: 'Victor Osimhen',     club: 'Napoli',            nationality: 'Nigeria',   position: 'Forward',    valueMEur: 75  },
  { name: 'Marcus Rashford',    club: 'Manchester United', nationality: 'England',   position: 'Forward',    valueMEur: 50  },
  { name: 'Trent Alexander-Arnold', club: 'Real Madrid',  nationality: 'England',   position: 'Defender',   valueMEur: 80  },
];

const ROUNDS = 8;

export async function generateHigherLower(): Promise<{ payload: HigherLowerPayload; solution: HigherLowerSolution }> {
  const players = pick(HIGHER_LOWER_POOL, ROUNDS);

  return {
    payload: {
      players: players.map(({ name, club, nationality, position }) => ({
        name, club, nationality, position,
      })),
      rounds: ROUNDS,
    },
    solution: {
      values: players.map((p) => p.valueMEur),
    },
  };
}
