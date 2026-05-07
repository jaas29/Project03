import { env } from '../config/env';

const BASE = env.footballDataBase;
const KEY = env.footballDataKey;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': KEY },
  });
  if (!res.ok) {
    throw Object.assign(new Error(`football-data.org error: ${res.status} ${path}`), { status: 502 });
  }
  return res.json() as Promise<T>;
}

export interface FdPlayer {
  id: number;
  name: string;
  position: string;
  nationality: string;
  dateOfBirth: string;
  marketValue?: number;
}

export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  area: { name: string };
}

export interface FdSquadResponse {
  team: FdTeam & { squad: FdPlayer[] };
}

export interface FdCompetitionTeamsResponse {
  teams: FdTeam[];
}

export async function getTeamSquad(teamId: number): Promise<FdSquadResponse> {
  return get<FdSquadResponse>(`/teams/${teamId}`);
}

export async function getCompetitionTeams(competitionCode: string): Promise<FdCompetitionTeamsResponse> {
  return get<FdCompetitionTeamsResponse>(`/competitions/${competitionCode}/teams`);
}

// Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), Ligue 1 (FL1)
export const SUPPORTED_COMPETITIONS = ['PL', 'PD', 'BL1', 'SA', 'FL1'] as const;
