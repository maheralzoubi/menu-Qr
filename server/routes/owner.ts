import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/auth';
import {
  getRestaurants, createRestaurant, getRestaurant,
  updateRestaurant, updateRestaurantStatus, deleteRestaurant,
  getOwnerAnalytics,
  getCustomers, updateCustomerStatus, deleteCustomer,
} from '../controllers/ownerController';

const router = Router();
router.use(requireSuperAdmin);

// Restaurant management
router.get('/restaurants', getRestaurants);
router.post('/restaurants', createRestaurant);
router.get('/restaurants/:id', getRestaurant);
router.patch('/restaurants/:id', updateRestaurant);
router.patch('/restaurants/:id/status', updateRestaurantStatus);
router.delete('/restaurants/:id', deleteRestaurant);

// Analytics
router.get('/analytics', getOwnerAnalytics);

// Customer management (platform-wide)
router.get('/customers', getCustomers);
router.patch('/customers/:id/status', updateCustomerStatus);
router.delete('/customers/:id', deleteCustomer);

export default router;
