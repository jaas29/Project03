import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only'),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
