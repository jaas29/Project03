import { Router } from 'express';
import { checkPuzzle, getTodayPuzzles, getPuzzleById, submitPuzzle } from '../controllers/puzzleController';

const router = Router();

router.get('/today', getTodayPuzzles);
router.get('/:id', getPuzzleById);
router.post('/:id/check', checkPuzzle);
router.post('/:id/submit', submitPuzzle);

export default router;
