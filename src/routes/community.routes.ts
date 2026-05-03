/**
 * @swagger
 * /api/community/messages:
 *   get:
 *     summary: List community messages
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 *   post:
 *     summary: Post a new message
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     url:
 *                       type: string
 *     responses:
 *       201:
 *         description: Message posted
 *
 * /api/community/messages/{id}/like:
 *   post:
 *     summary: Like/unlike a message
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 *
 * /api/community/messages/{id}/replies:
 *   get:
 *     summary: List replies to a message
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of replies
 *   post:
 *     summary: Post a reply
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply posted
 *
 * /api/community/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireCompleteRegistration } from '../middleware/registration.mw';
import { requirePayment } from '../middleware/registration.mw';
import { CommunityController } from '../controllers/community.controller';

const router = Router();
const communityController = new CommunityController();

router.get('/messages', verifyToken, requireCompleteRegistration, requirePayment, communityController.listMessages);
router.get('/messages/search', verifyToken, requireCompleteRegistration, requirePayment, communityController.searchMessages);
router.post('/messages', verifyToken, requireCompleteRegistration, requirePayment, communityController.postMessage);
router.post('/messages/:id/like', verifyToken, requireCompleteRegistration, requirePayment, communityController.likeMessage);
router.get('/messages/:id/replies', verifyToken, requireCompleteRegistration, requirePayment, communityController.listReplies);
router.post('/messages/:id/replies', verifyToken, requireCompleteRegistration, requirePayment, communityController.postReply);
router.post('/replies/:id/like', verifyToken, requireCompleteRegistration, requirePayment, communityController.likeReply);

export default router;