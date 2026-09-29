import { Router } from 'express';
import { requestCode, verifyCode, getMe, updateMe, getMyOrders } from '../controllers/appUserController';
import { requireAppUser } from '../middleware/appUserAuth';

// Menu Go customer app accounts (email code sign-in, platform-wide).
const router = Router();

router.post('/auth/request-code', requestCode);
router.post('/auth/verify', verifyCode);
router.get('/me', requireAppUser, getMe);
router.patch('/me', requireAppUser, updateMe);
router.get('/orders', requireAppUser, getMyOrders);

export default router;
