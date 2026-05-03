/**
 * @swagger
 * /api/giveaway/spin/status:
 *   get:
 *     summary: Get spin and trivia status
 *     tags: [Giveaway]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spin and trivia status
 *
 * /api/giveaway/spin:
 *   post:
 *     summary: Spin the wheel
 *     tags: [Giveaway]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spin result
 *
 * /api/giveaway/trivia/question:
 *   get:
 *     summary: Get trivia question
 *     tags: [Giveaway]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trivia question
 *
 * /api/giveaway/trivia/submit:
 *   post:
 *     summary: Submit trivia answer
 *     tags: [Giveaway]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               selectedAnswer:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Trivia result
 *
 * /api/giveaway/winners:
 *   get:
 *     summary: Get today's winners
 *     tags: [Giveaway]
 *     responses:
 *       200:
 *         description: Today's winners
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireCompleteRegistration } from '../middleware/registration.mw';
import { requirePayment } from '../middleware/registration.mw';
import { GiveawayController } from '../controllers/giveaway.controller';

const router = Router();
const giveawayController = new GiveawayController();

router.get('/spin/status', verifyToken, requireCompleteRegistration, requirePayment, giveawayController.spinStatus);
router.post('/spin', verifyToken, requireCompleteRegistration, requirePayment, giveawayController.spin);
router.get('/trivia/question', verifyToken, requireCompleteRegistration, requirePayment, giveawayController.getTriviaQuestion);
router.post('/trivia/submit', verifyToken, requireCompleteRegistration, requirePayment, giveawayController.submitTrivia);
router.get('/winners', giveawayController.getTodaysWinners);

export default router;