import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireEmailVerification } from '../middleware/emailVerification.mw';
import { VoteController } from '../controllers/vote.controller';

const router = Router();
const voteController = new VoteController();

// Public
router.get('/contestants', voteController.listContestants);
router.get('/leaderboard', voteController.leaderboard);

// Protected
router.post('/favorite', verifyToken, requireEmailVerification, voteController.voteFavorite);

export default router;