//auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.mw';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
// OTP verification endpoints
router.post('/verify-email/confirm-otp', authController.verifyEmailOtp);
router.post('/resend-verification', authController.resendVerification);
// Google Sign-In verification (frontend gets id_token)
router.post('/google/verify', authController.googleVerify);

router.get('/reset-password', authController.validateResetToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.post('/logout', verifyToken, authController.logout);

export default router;