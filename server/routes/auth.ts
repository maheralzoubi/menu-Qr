import { Router } from 'express';
import { login, logout, getMe, updateMe, subscribe, verifyEmail, resendVerification, forgotPassword, resetPassword } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/auth.schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.post('/subscribe', subscribe);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
