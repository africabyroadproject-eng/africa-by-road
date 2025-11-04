import { Router } from 'express';
import { verifyToken } from '../middleware/auth.mw';
import { AppController } from '../controllers/app.controller';

const router = Router();
const appController = new AppController();

router.get('/dashboard', verifyToken, appController.getDashboard);

export default router;