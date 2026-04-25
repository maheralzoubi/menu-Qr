import { Router } from 'express';
import * as menuController from '../controllers/menuController';
import * as reviewsController from '../controllers/reviewsController';
import * as ordersController from '../controllers/ordersController';
import * as statsController from '../controllers/statsController';
import * as analyticsController from '../controllers/analyticsController';
import { uploadImage } from '../controllers/uploadController';
import * as reservationsController from '../controllers/reservationsController';
import * as categoriesController from '../controllers/categoriesController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menu.schema';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/order.schema';
import { createReservationSchema, updateReservationStatusSchema } from '../schemas/reservation.schema';
import { createReviewSchema } from '../schemas/review.schema';

const router = Router();

// Menu — public reads, admin writes
router.get('/menu', menuController.getMenu);
router.get('/menu/:id', menuController.getMenuItem);
router.post('/menu', requireAuth, validate(createMenuItemSchema), menuController.postMenuItem);
router.patch('/menu/:id', requireAuth, validate(updateMenuItemSchema), menuController.patchMenuItem);
router.delete('/menu/:id', requireAuth, menuController.deleteMenuItem);

// Categories — public reads, admin writes
router.get('/categories', categoriesController.getCategories);
router.post('/categories', requireAuth, validate(createCategorySchema), categoriesController.postCategory);
router.patch('/categories/:id', requireAuth, validate(updateCategorySchema), categoriesController.patchCategory);
router.delete('/categories/:id', requireAuth, categoriesController.deleteCategory);

// Reviews — public reads + create, admin delete
router.get('/reviews', reviewsController.getReviews);
router.post('/reviews', validate(createReviewSchema), reviewsController.postReview);
router.delete('/reviews/:id', requireAuth, reviewsController.deleteReview);

// Orders — public create + single read, admin list + manage
router.post('/orders', validate(createOrderSchema), ordersController.postOrder);
router.get('/orders/:id', ordersController.getOrder);
router.get('/orders', requireAuth, ordersController.getOrders);
router.patch('/orders/:id/status', requireAuth, validate(updateOrderStatusSchema), ordersController.updateStatus);
router.delete('/orders/:id', requireAuth, ordersController.deleteOrder);

// Stats — admin only
router.get('/stats', requireAuth, statsController.getStats);

// Analytics — admin only
router.get('/analytics', requireAuth, analyticsController.getAnalyticsData);

// Image upload — admin only
router.post('/upload', requireAuth, uploadImage);

// Reservations — public create, admin list + manage
router.post('/reservations', validate(createReservationSchema), reservationsController.postReservation);
router.get('/reservations', requireAuth, reservationsController.getReservations);
router.patch('/reservations/:id/status', requireAuth, validate(updateReservationStatusSchema), reservationsController.updateStatus);
router.delete('/reservations/:id', requireAuth, reservationsController.deleteReservation);

export default router;
