/**
 * server/src/routes/profile.ts
 * Hugo's routes: Profile · Leaderboard · Admin UI endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import User from "../models/User";
import GameResult from "../models/GameResult";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eloRankLabel(elo: number): string {
  if (elo >= 1800) return "Diamond";
  if (elo >= 1600) return "Platinum";
  if (elo >= 1450) return "Gold I";
  if (elo >= 1300) return "Gold II";
  if (elo >= 1150) return "Silver";
  return "Bronze";
}

// ─── GET /api/profile/me ─────────────────────────────────────────────────────
// Returns the authenticated user's profile with stats aggregated from GameResults.

router.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const user = await User.findById(userId).select("-passwordHash -refreshTokens").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Aggregate game history
    const results = await GameResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const totalPlayed = results.length;
    const completedResults = results.filter((r) => r.completed);
    const winRate = totalPlayed > 0 ? Math.round((completedResults.length / totalPlayed) * 100) : 0;

    const wordleResults = results.filter((r) => r.wordleGuesses != null && r.wordleGuesses > 0);
    const avgWordle =
      wordleResults.length > 0
        ? wordleResults.reduce((a, r) => a + (r.wordleGuesses ?? 0), 0) / wordleResults.length
        : null;

    res.json({
      username: user.username,
      joinedDate: user.createdAt,
      currentStreak: user.currentStreak ?? 0,
      maxStreak: user.maxStreak ?? 0,
      eloRating: user.eloRating ?? 1000,
      eloRank: eloRankLabel(user.eloRating ?? 1000),
      totalPlayed,
      winRate,
      avgWordle: avgWordle ? Math.round(avgWordle * 10) / 10 : null,
      recentGames: results.slice(0, 7).map((r) => ({
        date: r.createdAt,
        puzzleNum: r.puzzleNum,
        gridScore: r.gridScore ?? null,
        connectionsScore: r.connectionsScore ?? null,
        wordleGuesses: r.wordleGuesses ?? null,
        completed: r.completed,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/profile/:username ──────────────────────────────────────────────
// Public profile (no private data).

router.get("/:username", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("username createdAt currentStreak maxStreak eloRating")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      username: user.username,
      joinedDate: user.createdAt,
      currentStreak: user.currentStreak ?? 0,
      maxStreak: user.maxStreak ?? 0,
      eloRating: user.eloRating ?? 1000,
      eloRank: eloRankLabel(user.eloRating ?? 1000),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/leaderboard ────────────────────────────────────────────────────
// Query params: type=global|weekly, limit=25, page=1

router.get("/leaderboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const type = (req.query.type as string) || "global";

    let pipeline: object[];

    if (type === "weekly") {
      // Weekly score = sum of points from the last 7 days' GameResults
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      pipeline = [
        { $match: { createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: "$userId",
            weeklyScore: {
              $sum: {
                $add: [
                  { $ifNull: ["$gridScore", 0] },
                  { $multiply: [{ $ifNull: ["$connectionsScore", 0] }, 10] },
                  { $multiply: [{ $max: [{ $subtract: [7, { $ifNull: ["$wordleGuesses", 7] }] }, 0] }, 5] },
                ],
              },
            },
          },
        },
        { $sort: { weeklyScore: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            username: "$user.username",
            eloRating: "$user.eloRating",
            currentStreak: "$user.currentStreak",
            weeklyScore: 1,
          },
        },
      ];

      const rows = await (GameResult as any).aggregate(pipeline);
      return res.json({
        type: "weekly",
        page,
        entries: rows.map((r: any, i: number) => ({
          rank: skip + i + 1,
          username: r.username,
          eloRating: r.eloRating ?? 1000,
          eloRank: eloRankLabel(r.eloRating ?? 1000),
          streak: r.currentStreak ?? 0,
          weeklyScore: r.weeklyScore,
        })),
      });
    }

    // Global — sorted by ELO
    const users = await User.find({ isBanned: { $ne: true } })
      .sort({ eloRating: -1 })
      .skip(skip)
      .limit(limit)
      .select("username eloRating currentStreak")
      .lean();

    res.json({
      type: "global",
      page,
      entries: users.map((u, i) => ({
        rank: skip + i + 1,
        username: u.username,
        eloRating: u.eloRating ?? 1000,
        eloRank: eloRankLabel(u.eloRating ?? 1000),
        streak: u.currentStreak ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get("/admin/users", requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const search = (req.query.search as string) || "";

    const filter = search
      ? { username: { $regex: search, $options: "i" } }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("username email role isBanned createdAt eloRating")
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      total,
      page,
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role ?? "user",
        status: u.isBanned ? "banned" : "active",
        joined: u.createdAt,
        eloRating: u.eloRating ?? 1000,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/ban
router.patch("/admin/users/:id/ban", requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { banned } = req.body as { banned: boolean };
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: banned },
      { new: true }
    ).select("username isBanned");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ username: user.username, status: user.isBanned ? "banned" : "active" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/admin/users/:id/role", requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body as { role: "user" | "admin" };
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("username role");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ username: user.username, role: user.role });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats  — platform-level KPIs
router.get("/admin/stats", requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newToday,
      playsToday,
      weeklyActive,
      bannedCount,
    ] = await Promise.all([
      User.countDocuments({ isBanned: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: today } }),
      GameResult.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ lastPlayedAt: { $gte: weekAgo } }),
      User.countDocuments({ isBanned: true }),
    ]);

    const completionAgg = await GameResult.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: ["$completed", 1, 0] } } } },
    ]);
    const compRow = completionAgg[0] ?? { total: 1, completed: 0 };

    res.json({
      totalUsers,
      newToday,
      playsToday,
      weeklyActive,
      bannedCount,
      completionRate: compRow.total > 0 ? Math.round((compRow.completed / compRow.total) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
