/**
 * @swagger
 * /api/payments/checkout:
 *   post:
 *     summary: Create payment checkout
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
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout created
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
router.post('/webhook', controller.webhook);

export default router;