import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/requireAuth';
import { adminRegeneratePuzzles } from '../controllers/puzzleController';
import { adminBanUser, adminListUsers } from '../controllers/adminController';

const router = Router();

router.use(requireAuth, requireAdmin);

router.post('/puzzles/regenerate', adminRegeneratePuzzles);
router.get('/users', adminListUsers);
router.patch('/users/:id/ban', adminBanUser);

export default router;
