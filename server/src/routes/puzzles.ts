import { Router } from 'express';
import { checkPuzzle, getTodayPuzzles, getPuzzleById, submitPuzzle } from '../controllers/puzzleController';
import { optionalAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/today', getTodayPuzzles);
router.get('/:id', getPuzzleById);
router.post('/:id/check', optionalAuth, checkPuzzle);
router.post('/:id/submit', optionalAuth, submitPuzzle);

export default router;
