import { Router } from 'express';
import { requireOwnerAccess, requireSuperAdmin } from '../middleware/auth';
import {
  getRestaurants, createRestaurant, getRestaurant,
  updateRestaurant, updateRestaurantStatus, deleteRestaurant,
  getOwnerAnalytics,
  getSubscribers, updateCustomerStatus, deleteCustomer,
  updateCustomerPlan,
  getSubscription, checkoutSubscription,
} from '../controllers/ownerController';
import { getAdminPlans, updatePlan } from '../controllers/planController';

const router = Router();
router.use(requireOwnerAccess);

// Restaurant management
router.get('/restaurants', getRestaurants);
router.post('/restaurants', createRestaurant);
router.get('/restaurants/:id', getRestaurant);
router.patch('/restaurants/:id', updateRestaurant);
router.patch('/restaurants/:id/status', updateRestaurantStatus);
router.delete('/restaurants/:id', deleteRestaurant);

// Analytics
router.get('/analytics', getOwnerAnalytics);

// Platform subscriber management
router.get('/customers', getSubscribers);
router.patch('/customers/:id/status', updateCustomerStatus);
router.delete('/customers/:id', deleteCustomer);

// Plan management — superAdmin only (enforced in controller)
router.patch('/customers/:id/plan', updateCustomerPlan);

// Subscription (current user's plan)
router.get('/subscription', getSubscription);
router.post('/subscription/checkout', checkoutSubscription);

// Plan config management — superadmin only
router.get('/plans', requireSuperAdmin, getAdminPlans);
router.patch('/plans/:key', requireSuperAdmin, updatePlan);

export default router;
