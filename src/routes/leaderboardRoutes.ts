import { Router } from 'express';
import { getUserRank, getTopUsers, getUserPosition } from '../controllers/leaderboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/rank', authenticate, getUserRank);
router.get('/top', authenticate, getTopUsers);
router.get('/user-position', authenticate, getUserPosition);

export default router;