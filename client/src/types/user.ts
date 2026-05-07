export type Role = 'user' | 'admin';

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  elo: number;
  streak: number;
}
