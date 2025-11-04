import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { requireEmailVerification } from '../middleware/emailVerification.mw';
import { CommunityController } from '../controllers/community.controller';

const router = Router();
const communityController = new CommunityController();

router.get('/messages', verifyToken, requireEmailVerification, communityController.listMessages);
router.post('/messages', verifyToken, requireEmailVerification, communityController.postMessage);
router.post('/messages/:id/like', verifyToken, requireEmailVerification, communityController.likeMessage);

export default router;