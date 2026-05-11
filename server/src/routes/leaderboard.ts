import { Router } from 'express';
import { eloLeaderboard, dailyLeaderboard, allTimeLeaderboard } from '../controllers/leaderboardController';

const router = Router();

router.get('/elo', eloLeaderboard);
router.get('/daily', dailyLeaderboard);
router.get('/alltime', allTimeLeaderboard);

export default router;
