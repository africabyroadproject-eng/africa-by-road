/**
 * @swagger
 * /api/app/dashboard:
 *   get:
 *     summary: Get user dashboard
 *     tags: [App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireCompleteRegistration } from '../middleware/registration.mw';
import { requirePayment } from '../middleware/registration.mw';
import { AppController } from '../controllers/app.controller';

const router = Router();
const appController = new AppController();

router.get('/dashboard', verifyToken, requireCompleteRegistration, appController.getDashboard);

export default router;