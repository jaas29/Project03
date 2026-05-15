// TheSportsDB — free, no API key required for v1 endpoints
const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

type DailyCacheEntry<T> = {
  day: string;
  value: T;
};

const dailyCache = new Map<string, DailyCacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function utcDayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getWithDailyCache<T>(cacheKey: string, loader: () => Promise<T>): Promise<T> {
  const today = utcDayStamp();
  const cached = dailyCache.get(cacheKey);
  if (cached && cached.day === today) {
    return cached.value as T;
  }

  const pending = inflight.get(cacheKey);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = loader()
    .then((value) => {
      dailyCache.set(cacheKey, { day: today, value });
      return value;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, request as Promise<unknown>);
  return request;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw Object.assign(new Error(`TheSportsDB error: ${res.status} ${path}`), { status: 502 });
  }
  return res.json() as Promise<T>;
}

export interface ApiTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort: string;
  strBadge: string;
}

export interface ApiPlayer {
  strPlayer: string;
  strPosition: string;
  strNationality: string;
  strCutout?: string;
  strThumb?: string;
  strRender?: string;
}

const LEAGUE_NAMES: Record<string, string> = {
  PL:  'English Premier League',
  PD:  'Spanish La Liga',
  BL1: 'German Bundesliga',
  SA:  'Italian Serie A',
  FL1: 'French Ligue 1',
};

export const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  PL:  'Premier League',
  PD:  'La Liga',
  BL1: 'Bundesliga',
  SA:  'Serie A',
  FL1: 'Ligue 1',
};

export type LeagueCode = keyof typeof LEAGUE_NAMES;
export const SUPPORTED_COMPETITIONS = Object.keys(LEAGUE_NAMES) as LeagueCode[];

export async function getLeagueTeams(leagueCode: LeagueCode): Promise<ApiTeam[]> {
  return getWithDailyCache(`teams:${leagueCode}`, async () => {
    const name = encodeURIComponent(LEAGUE_NAMES[leagueCode]);
    const data = await get<{ teams: ApiTeam[] | null }>(`/search_all_teams.php?l=${name}`);
    return data.teams ?? [];
  });
}

export async function getTeamSquad(teamId: string): Promise<ApiPlayer[]> {
  return getWithDailyCache(`squad:${teamId}`, async () => {
    const data = await get<{ player: ApiPlayer[] | null }>(`/lookup_all_players.php?id=${teamId}`);
    return data.player ?? [];
  });
}

export async function getTeamById(teamId: string): Promise<ApiTeam | null> {
  return getWithDailyCache(`team:${teamId}`, async () => {
    const data = await get<{ teams: ApiTeam[] | null }>(`/lookupteam.php?id=${teamId}`);
    return data.teams?.[0] ?? null;
  });
}
