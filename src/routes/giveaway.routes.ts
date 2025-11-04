import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireEmailVerification } from '../middleware/emailVerification.mw';
import { GiveawayController } from '../controllers/giveaway.controller';

const router = Router();
const giveawayController = new GiveawayController();

router.get('/spin/status', verifyToken, requireEmailVerification, giveawayController.spinStatus);
router.post('/spin', verifyToken, requireEmailVerification, giveawayController.spin);

export default router;