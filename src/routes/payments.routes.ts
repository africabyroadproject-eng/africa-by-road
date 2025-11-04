import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';

const router = Router();
const controller = new PaymentsController();

// Public (email must be verified, but route itself is public)
router.post('/checkout', controller.createCheckout);

// Gateway webhook (public endpoint; secure with gateway signature in real impl.)
router.post('/webhook', controller.webhook);

export default router;