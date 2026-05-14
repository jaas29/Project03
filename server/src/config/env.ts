import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function splitOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGODB_URI'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  clientOrigins: splitOrigins(process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'),
};

export function isAllowedOrigin(origin?: string): boolean {
  return !origin || env.clientOrigins.includes(origin);
}
