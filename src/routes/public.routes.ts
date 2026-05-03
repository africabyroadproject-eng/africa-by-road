/**
 * @swagger
 * /api/public/landing-page:
 *   get:
 *     summary: Get landing page content
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Landing page content
 *
 * /api/public/payment-gateway-options:
 *   get:
 *     summary: Get available payment gateways
 *     tags: [Public]
 *     parameters:
 *       - name: country
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment gateway options
 */

import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';

const router = Router();
const publicController = new PublicController();

router.get('/landing-page', publicController.getLandingPage);
router.get('/payment-gateway-options', publicController.getPaymentGatewayOptions);

export default router;