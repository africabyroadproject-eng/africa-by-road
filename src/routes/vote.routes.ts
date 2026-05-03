/**
 * @swagger
 * /api/vote/contestants:
 *   get:
 *     summary: List active contestants
 *     tags: [Vote]
 *     responses:
 *       200:
 *         description: List of contestants
 *
 * /api/vote/leaderboard:
 *   get:
 *     summary: Get vote leaderboard
 *     tags: [Vote]
 *     responses:
 *       200:
 *         description: Leaderboard standings
 *
 * /api/vote/favorite:
 *   post:
 *     summary: Vote for a contestant
 *     tags: [Vote]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contestantId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vote recorded
 *       403:
 *         description: Registration/payment required
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireCompleteRegistration } from '../middleware/registration.mw';
import { requirePayment } from '../middleware/registration.mw';
import { VoteController } from '../controllers/vote.controller';

const router = Router();
const voteController = new VoteController();

// Public
router.get('/contestants', voteController.listContestants);
router.get('/leaderboard', voteController.leaderboard);

// Protected - requires complete registration AND payment
router.post('/favorite', verifyToken, requireCompleteRegistration, requirePayment, voteController.voteFavorite);

export default router;