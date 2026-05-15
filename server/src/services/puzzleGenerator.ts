import mongoose from 'mongoose';
import { getLeagueTeams, getTeamSquad, SUPPORTED_COMPETITIONS, LEAGUE_DISPLAY_NAMES, LeagueCode } from './footballApi';
import { HigherLowerPlayer } from '../models/HigherLowerPlayer';

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

function teamKey(team: { strTeamShort?: string; strTeam: string }): string {
  const short = team.strTeamShort?.trim();
  // Reject single-letter shorts \u2014 TheSportsDB returns "F" for Fiorentina, Frosinone, etc.
  if (short && short.length >= 2) return short.slice(0, 4).toUpperCase();

  const words = team.strTeam
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
  }
  return (words[0] ?? team.strTeam).slice(0, 3).toUpperCase();
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
  playerPool?: string[]; // public autocomplete list; cell mapping stays hidden in solution
  playerHeadshots?: Record<string, string>; // key = player name, value = headshot URL
}

export interface GridSolution {
  cells: Record<string, string | string[]>; // key = "row,col", value = accepted player names
}

// Static fallback: rows = nationalities, cols = teams
// Each cell = players of that nationality who played for that team (all-time)
const GRID_FALLBACKS: Array<{ payload: GridPayload; solution: GridSolution }> = [
  {
    payload: {
      rows: ['Brazil', 'France', 'Germany'],
      cols: ['RMA', 'ARS', 'BAY'],
      teamMeta: {
        RMA: { name: 'Real Madrid', crest: '' },
        ARS: { name: 'Arsenal', crest: '' },
        BAY: { name: 'Bayern Munich', crest: '' },
      },
      playerPool: [
        'Roberto Carlos', 'Ronaldo', 'Marcelo', 'Casemiro', 'Rodrygo', 'Vinicius Junior', 'Eder Militao',
        'Edu', 'Gilberto Silva', 'Gabriel Martinelli', 'Gabriel Magalhaes',
        'Ze Roberto', 'Giovanni Elber', 'Lucio',
        'Zinedine Zidane', 'Karim Benzema', 'Raphael Varane', 'Ferland Mendy', 'Eduardo Camavinga',
        'William Saliba', 'Thierry Henry', 'Robert Pires', 'Patrick Vieira', 'Nicolas Anelka',
        'Franck Ribery', 'Kingsley Coman', 'Dayot Upamecano', 'Lucas Hernandez',
        'Toni Kroos', 'Sami Khedira', 'Christoph Metzelder',
        'Lukas Podolski', 'Per Mertesacker', 'Kai Havertz',
        'Thomas Muller', 'Joshua Kimmich', 'Manuel Neuer', 'Jamal Musiala', 'Leroy Sane', 'Serge Gnabry',
      ],
      playerHeadshots: {},
    },
    solution: {
      cells: {
        'Brazil,RMA': ['Roberto Carlos', 'Ronaldo', 'Marcelo', 'Casemiro', 'Rodrygo', 'Vinicius Junior', 'Eder Militao'],
        'Brazil,ARS': ['Edu', 'Gilberto Silva', 'Gabriel Martinelli', 'Gabriel Magalhaes'],
        'Brazil,BAY': ['Ze Roberto', 'Giovanni Elber', 'Lucio'],
        'France,RMA': ['Zinedine Zidane', 'Karim Benzema', 'Raphael Varane', 'Ferland Mendy', 'Eduardo Camavinga'],
        'France,ARS': ['William Saliba', 'Thierry Henry', 'Robert Pires', 'Patrick Vieira', 'Nicolas Anelka'],
        'France,BAY': ['Franck Ribery', 'Kingsley Coman', 'Dayot Upamecano', 'Lucas Hernandez'],
        'Germany,RMA': ['Toni Kroos', 'Sami Khedira', 'Christoph Metzelder'],
        'Germany,ARS': ['Lukas Podolski', 'Per Mertesacker', 'Kai Havertz'],
        'Germany,BAY': ['Thomas Muller', 'Joshua Kimmich', 'Manuel Neuer', 'Jamal Musiala', 'Leroy Sane', 'Serge Gnabry'],
      },
    },
  },
  {
    payload: {
      rows: ['Brazil', 'France', 'Spain'],
      cols: ['BAR', 'CHE', 'PSG'],
      teamMeta: {
        BAR: { name: 'Barcelona', crest: '' },
        CHE: { name: 'Chelsea', crest: '' },
        PSG: { name: 'Paris Saint-Germain', crest: '' },
      },
      playerPool: [
        'Ronaldinho', 'Neymar', 'Dani Alves', 'Rivaldo',
        'Thiago Silva', 'David Luiz', 'Willian', 'Oscar',
        'Marquinhos',
        'Thierry Henry', 'Ousmane Dembele', 'Jules Kounde',
        'N Golo Kante', 'Claude Makelele',
        'Kylian Mbappe', 'Blaise Matuidi', 'Presnel Kimpembe',
        'Xavi', 'Andres Iniesta', 'Sergio Busquets', 'Pedri',
        'Cesc Fabregas', 'Cesar Azpilicueta', 'Fernando Torres', 'Pedro',
        'Sergio Ramos', 'Fabian Ruiz',
      ],
      playerHeadshots: {},
    },
    solution: {
      cells: {
        'Brazil,BAR': ['Ronaldinho', 'Neymar', 'Dani Alves', 'Rivaldo'],
        'Brazil,CHE': ['Thiago Silva', 'David Luiz', 'Willian', 'Oscar'],
        'Brazil,PSG': ['Neymar', 'Marquinhos', 'Thiago Silva'],
        'France,BAR': ['Thierry Henry', 'Ousmane Dembele', 'Jules Kounde'],
        'France,CHE': ['N Golo Kante', 'Claude Makelele'],
        'France,PSG': ['Kylian Mbappe', 'Blaise Matuidi', 'Presnel Kimpembe'],
        'Spain,BAR': ['Xavi', 'Andres Iniesta', 'Sergio Busquets', 'Pedri'],
        'Spain,CHE': ['Cesc Fabregas', 'Cesar Azpilicueta', 'Fernando Torres', 'Pedro'],
        'Spain,PSG': ['Sergio Ramos', 'Fabian Ruiz'],
      },
    },
  },
  {
    payload: {
      rows: ['Argentina', 'Portugal', 'Netherlands'],
      cols: ['MUN', 'INT', 'JUV'],
      teamMeta: {
        MUN: { name: 'Manchester United', crest: '' },
        INT: { name: 'Inter Milan', crest: '' },
        JUV: { name: 'Juventus', crest: '' },
      },
      playerPool: [
        'Lisandro Martinez', 'Angel Di Maria', 'Carlos Tevez',
        'Lautaro Martinez', 'Javier Zanetti', 'Diego Milito',
        'Paulo Dybala', 'Gonzalo Higuain',
        'Cristiano Ronaldo', 'Bruno Fernandes', 'Nani',
        'Luis Figo', 'Joao Mario', 'Joao Cancelo',
        'Robin van Persie', 'Ruud van Nistelrooy', 'Edwin van der Sar',
        'Wesley Sneijder', 'Denzel Dumfries', 'Stefan de Vrij',
        'Matthijs de Ligt', 'Edgar Davids',
      ],
      playerHeadshots: {},
    },
    solution: {
      cells: {
        'Argentina,MUN': ['Lisandro Martinez', 'Angel Di Maria', 'Carlos Tevez'],
        'Argentina,INT': ['Lautaro Martinez', 'Javier Zanetti', 'Diego Milito'],
        'Argentina,JUV': ['Paulo Dybala', 'Carlos Tevez', 'Gonzalo Higuain', 'Angel Di Maria'],
        'Portugal,MUN': ['Cristiano Ronaldo', 'Bruno Fernandes', 'Nani'],
        'Portugal,INT': ['Luis Figo', 'Joao Mario'],
        'Portugal,JUV': ['Cristiano Ronaldo', 'Joao Cancelo'],
        'Netherlands,MUN': ['Robin van Persie', 'Ruud van Nistelrooy', 'Edwin van der Sar'],
        'Netherlands,INT': ['Wesley Sneijder', 'Denzel Dumfries', 'Stefan de Vrij'],
        'Netherlands,JUV': ['Matthijs de Ligt', 'Edgar Davids'],
      },
    },
  },
];

let lastGridFallbackIndex = -1;

function pickGridFallback(): { payload: GridPayload; solution: GridSolution } {
  if (GRID_FALLBACKS.length === 1) return GRID_FALLBACKS[0];

  let index = Math.floor(Math.random() * GRID_FALLBACKS.length);
  if (index === lastGridFallbackIndex) {
    index = (index + 1) % GRID_FALLBACKS.length;
  }
  lastGridFallbackIndex = index;
  return GRID_FALLBACKS[index];
}

export async function generateGrid(): Promise<{ payload: GridPayload; solution: GridSolution }> {
  try {
    // Pick one team from each of 3 random leagues as column headers
    const competitionCodes = pick([...SUPPORTED_COMPETITIONS], 3) as LeagueCode[];
    const colTeams: Awaited<ReturnType<typeof getLeagueTeams>> = [];
    for (const code of competitionCodes) {
      const teams = await getLeagueTeams(code);
      if (teams.length > 0) colTeams.push(pickOne(teams));
    }
    if (colTeams.length < 3) throw new Error('Not enough teams');

    // Fetch current squad for each column team
    const squads = new Map<string, Awaited<ReturnType<typeof getTeamSquad>>>();
    for (const team of colTeams) {
      squads.set(team.idTeam, await getTeamSquad(team.idTeam));
    }

    // Find nationalities that appear in at least 2 of the 3 squads
    const natCounts = new Map<string, number>();
    for (const squad of squads.values()) {
      const seen = new Set(squad.map((p) => p.strNationality).filter((n) => n && n.length > 1));
      for (const nat of seen) natCounts.set(nat, (natCounts.get(nat) ?? 0) + 1);
    }
    const candidates = [...natCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([nat]) => nat);
    if (candidates.length < 3) throw new Error('Not enough shared nationalities');
    const rowNats = pick(candidates, 3);

    // Build unique column keys
    const usedKeys = new Set<string>();
    const colKeys: string[] = colTeams.map((t) => {
      let key = teamKey(t);
      if (usedKeys.has(key)) {
        const base = t.strTeam.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
        let suffix = 2;
        key = base;
        while (usedKeys.has(key)) key = base.slice(0, 2) + suffix++;
      }
      usedKeys.add(key);
      return key;
    });

    const teamMeta: GridPayload['teamMeta'] = {};
    colTeams.forEach((t, i) => {
      teamMeta[colKeys[i]] = { name: t.strTeam, crest: t.strBadge };
    });

    // Build cells: key = "nationality,teamKey", value = matching player names
    const cells: GridSolution['cells'] = {};
    const playerPool = new Set<string>();
    const playerHeadshots: Record<string, string> = {};
    for (const nat of rowNats) {
      for (let i = 0; i < colTeams.length; i++) {
        const team = colTeams[i];
        const key = colKeys[i];
        const squad = squads.get(team.idTeam) ?? [];
        const matchingPlayers = squad.filter((p) => p.strNationality === nat && Boolean(p.strPlayer));
        const matching = matchingPlayers
          .map((p) => p.strPlayer)
          .filter(Boolean);

        matchingPlayers.forEach((player) => {
          const name = player.strPlayer;
          if (!name) return;
          playerPool.add(name);
          const image = (player.strCutout ?? player.strThumb ?? player.strRender ?? '').trim();
          if (image && !playerHeadshots[name]) {
            playerHeadshots[name] = image;
          }
        });

        cells[`${nat},${key}`] = matching.length > 0 ? matching : ['?'];
      }
    }

    return {
      payload: {
        rows: rowNats,
        cols: colKeys,
        teamMeta,
        playerPool: [...playerPool].sort(),
        playerHeadshots,
      },
      solution: { cells },
    };
  } catch {
    return pickGridFallback();
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

function playerLastName(fullName: string): string {
  return fullName.trim().split(/\s+/).pop() ?? fullName;
}

async function buildConnectionsFromApi(): Promise<ConnectionsGroup[]> {
  const colors: ConnectionsGroup['color'][] = ['yellow', 'green', 'blue', 'purple'];
  const codes = pick([...SUPPORTED_COMPETITIONS], 4) as LeagueCode[];
  const groups: ConnectionsGroup[] = [];

  // First 2 groups: 4 teams from a league each
  for (let i = 0; i < 2; i++) {
    const teams = await getLeagueTeams(codes[i]);
    if (teams.length < 4) throw new Error('Not enough teams');
    const picked = pick(teams, 4);
    groups.push({
      category: `${LEAGUE_DISPLAY_NAMES[codes[i]]} clubs`,
      color: colors[i],
      items: picked.map((t) => t.strTeam),
    });
  }

  // Last 2 groups: 4 player surnames from a single club each
  for (let i = 2; i < 4; i++) {
    const teams = await getLeagueTeams(codes[i]);
    const team = pickOne(teams);
    const squad = await getTeamSquad(team.idTeam);
    const surnames = [...new Set(
      squad
        .map((p) => playerLastName(p.strPlayer))
        .filter((n) => n.length >= 4 && /^[A-Za-zÀ-ÿ\-']+$/.test(n))
    )];
    if (surnames.length < 4) throw new Error('Not enough players');
    groups.push({
      category: `${team.strTeam} players`,
      color: colors[i],
      items: pick(surnames, 4),
    });
  }

  return groups;
}

export async function generateConnections(): Promise<{ payload: ConnectionsPayload; solution: ConnectionsSolution }> {
  try {
    const groups = await buildConnectionsFromApi();
    const items = pick(groups.flatMap((g) => g.items), 16);
    return { payload: { items }, solution: { groups } };
  } catch {
    // Fall back to static pool when API is unavailable
    const groups = pick(ALL_CONNECTIONS_GROUPS, 4) as ConnectionsGroup[];
    const items = pick(groups.flatMap((g) => g.items), 16);
    return { payload: { items }, solution: { groups } };
  }
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

// Filter to only 5-6 letter words for Wordle-style play (static fallback)
const VALID_WORDLE = WORDLE_WORDS.filter((w) => w.word.length >= 5 && w.word.length <= 6);

async function wordleFromApi(): Promise<{ word: string; hint: string }> {
  const code = pickOne([...SUPPORTED_COMPETITIONS] as LeagueCode[]);
  const teams = await getLeagueTeams(code);
  const team = pickOne(teams);
  const squad = await getTeamSquad(team.idTeam);

  const candidates = squad
    .map((p) => {
      const surname = playerLastName(p.strPlayer);
      const word = surname.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');
      return { word, player: p, club: team.strTeam };
    })
    .filter(({ word }) => word.length >= 5 && word.length <= 6);

  if (candidates.length === 0) throw new Error('No valid surnames found');

  const { word, player, club } = pickOne(candidates);
  const hint = `${player.strNationality} ${player.strPosition.toLowerCase()}, ${club}`;
  return { word, hint };
}

export async function generateWordle(): Promise<{ payload: WordlePayload; solution: WordleSolution }> {
  try {
    const { word, hint } = await wordleFromApi();
    return {
      payload: { length: word.length, maxAttempts: 6, hint },
      solution: { answer: word },
    };
  } catch {
    const entry = pickOne(VALID_WORDLE);
    return {
      payload: { length: entry.word.length, maxAttempts: 6, hint: entry.hint },
      solution: { answer: entry.word },
    };
  }
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
  // Query MongoDB only when connected; fall back to hardcoded pool otherwise
  const dbPlayers = mongoose.connection.readyState === 1
    ? await HigherLowerPlayer.find().lean().catch(() => [])
    : [];
  const pool = dbPlayers.length >= ROUNDS
    ? dbPlayers.map((p) => ({ name: p.name, club: p.club, nationality: p.nationality, position: p.position, valueMEur: p.valueMEur }))
    : HIGHER_LOWER_POOL;

  const players = pick(pool, ROUNDS);

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
