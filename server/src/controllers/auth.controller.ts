import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, toPublicUser } from '../models/User';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/tokens';
import type { LoginInput, RefreshInput, RegisterInput } from '../routes/auth.schemas';

const BCRYPT_ROUNDS = 12;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, username, password } = req.body as RegisterInput;

    const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, username, passwordHash });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });

    res.status(201).json({ user: toPublicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });

    res.json({ user: toPublicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as RefreshInput;
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!.sub);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
