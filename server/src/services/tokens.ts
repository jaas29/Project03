import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessPayload {
  sub: string;        // user id
  role: 'user' | 'admin';
}

export interface RefreshPayload {
  sub: string;
  tokenVersion?: number;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl } as SignOptions);
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshTtl } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshPayload;
}
