import { Router } from 'express';
import { login, logout, getMe, updateMe, subscribe } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/auth.schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.post('/subscribe', subscribe);

export default router;
