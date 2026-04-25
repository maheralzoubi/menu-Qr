import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/customerController';
import { requireCustomer } from '../middleware/customerAuth';
import { validate } from '../middleware/validate';
import { customerRegisterSchema, customerLoginSchema, customerUpdateSchema } from '../schemas/customer.schema';

const router = Router();

router.post('/register', validate(customerRegisterSchema), register);
router.post('/login', validate(customerLoginSchema), login);
router.get('/me', requireCustomer, getMe);
router.patch('/me', requireCustomer, validate(customerUpdateSchema), updateMe);

export default router;
