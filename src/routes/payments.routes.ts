/**
 * @swagger
 * /api/payments/checkout:
 *   post:
 *     summary: Create payment checkout with MeCash
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout created
 *
 * /api/payments/verify:
 *   post:
 *     summary: Verify payment status
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verification result
 *
 * /api/payments/key:
 *   get:
 *     summary: Get payment public key
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Public key for frontend
 *
 * /api/payments/webhook:
 *   post:
 *     summary: Payment gateway webhook
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */

import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';

const router = Router();
const controller = new PaymentsController();

router.post('/checkout', controller.createCheckout);
router.post('/verify', controller.verifyPayment);
router.get('/key', controller.getPublicKey);
router.post('/webhook', controller.webhook);

export default router;