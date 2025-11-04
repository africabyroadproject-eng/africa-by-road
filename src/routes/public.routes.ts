import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';

const router = Router();
const publicController = new PublicController();

router.get('/landing-page', publicController.getLandingPage);
router.get('/payment-gateway-options', publicController.getPaymentGatewayOptions);

export default router;