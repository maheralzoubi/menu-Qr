import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/auth';
import {
  getCustomers, createCustomer, updateCustomerStatus, deleteCustomer,
  getAdmins, createAdmin, deleteAdmin,
  getPlatformAnalytics,
} from '../controllers/superAdminController';

const router = Router();

router.use(requireSuperAdmin);

// Customers (app users)
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.patch('/customers/:id/status', updateCustomerStatus);
router.delete('/customers/:id', deleteCustomer);

// Restaurant admins (dashboard users)
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deleteAdmin);

// Analytics
router.get('/analytics', getPlatformAnalytics);

export default router;
