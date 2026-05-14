import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken, type AccessPayload } from '../services/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

// Attaches req.user if a valid token is present, but never rejects the request.
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice('Bearer '.length).trim());
    } catch {
      // invalid / expired token — continue as anonymous
    }
  }
  next();
};
