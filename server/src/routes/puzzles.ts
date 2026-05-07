import { Router } from 'express';
import { getTodayPuzzles, getPuzzleById, submitPuzzle } from '../controllers/puzzleController';

const router = Router();

router.get('/today', getTodayPuzzles);
router.get('/:id', getPuzzleById);
router.post('/:id/submit', submitPuzzle);

export default router;
