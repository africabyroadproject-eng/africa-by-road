/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *
 * /api/profile/personal:
 *   put:
 *     summary: Update personal info
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *               nationality:
 *                 type: string
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *               residentialAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *
 * /api/profile/status:
 *   get:
 *     summary: Get registration status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registration status
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireCompleteRegistration } from '../middleware/registration.mw';
import { ProfileController } from '../controllers/profile.controller';

const router = Router();
const profileController = new ProfileController();

router.get('/', verifyToken, profileController.getProfile);
router.put('/personal', verifyToken, profileController.updatePersonalInfo);
router.put('/social', verifyToken, profileController.updateSocialMedia);
router.put('/documents', verifyToken, profileController.uploadDocuments);
router.get('/status', verifyToken, profileController.getRegistrationStatus);

export default router;