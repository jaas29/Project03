import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

export async function adminListUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('username email role elo stats createdAt')
      .lean();
    const total = await User.countDocuments();
    res.json({ users, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function adminBanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.role === 'admin') {
      res.status(403).json({ error: 'Cannot ban another admin' });
      return;
    }
    // Mark banned by setting a sentinel role; extend User schema if needed
    await User.findByIdAndUpdate(req.params.id, { role: 'banned' as 'user' });
    res.json({ message: `User ${user.username} banned` });
  } catch (err) {
    next(err);
  }
}
