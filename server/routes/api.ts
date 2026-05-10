import { Router, Request, Response, NextFunction } from 'express';
import * as menuController from '../controllers/menuController';
import * as reviewsController from '../controllers/reviewsController';
import * as ordersController from '../controllers/ordersController';
import * as statsController from '../controllers/statsController';
import * as analyticsController from '../controllers/analyticsController';
import { uploadImage } from '../controllers/uploadController';
import * as reservationsController from '../controllers/reservationsController';
import * as categoriesController from '../controllers/categoriesController';
import * as tablesController from '../controllers/tablesController';
import * as promoCodeController from '../controllers/promoCodeController';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menu.schema';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/order.schema';
import { createReservationSchema, updateReservationStatusSchema } from '../schemas/reservation.schema';
import { createReviewSchema } from '../schemas/review.schema';
import { createPromoCodeSchema, validatePromoCodeSchema } from '../schemas/promoCode.schema';
import { Restaurant } from '../models/Restaurant';
import { Review } from '../models/Review';
import { getIO } from '../socket/index';

const router = Router();

// All restaurants — public (for restaurant discovery list)
router.get('/restaurants/public', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await Restaurant.find().select('name logo address status').sort({ name: 1 });

    const results = await Promise.all(restaurants.map(async (r) => {
      const reviews = await Review.find({ restaurantId: r._id }).select('rating');
      const averageRating = reviews.length > 0
        ? parseFloat((reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length).toFixed(1))
        : 0;
      return { _id: r._id, name: r.name, logo: r.logo, address: r.address, status: r.status, averageRating };
    }));

    res.json(results);
  } catch (e) { next(e); }
});

// Restaurant info — public (for customer app)
router.get('/restaurants/:id/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id).select('name logo status primaryColor');
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (r.status === 'inactive') { res.status(403).json({ message: 'Restaurant is currently unavailable.' }); return; }
    res.json({ name: r.name, logo: r.logo, status: r.status, primaryColor: r.primaryColor ?? '#9b3f25' });
  } catch (e) { next(e); }
});

// Restaurant branding — admin reads and updates their own restaurant
router.get('/settings/restaurant', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = (req as AuthRequest).user!;
    if (!restaurantId) { res.status(403).json({ message: 'No restaurant linked to this account' }); return; }
    const r = await Restaurant.findById(restaurantId).select('name logo primaryColor address contactEmail contactPhone');
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    res.json(r);
  } catch (e) { next(e); }
});

router.patch('/settings/restaurant', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = (req as AuthRequest).user!;
    if (!restaurantId) { res.status(403).json({ message: 'No restaurant linked to this account' }); return; }
    const allowed = ['logo', 'primaryColor', 'name', 'address', 'contactEmail', 'contactPhone'];
    const update: Record<string, string> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const r = await Restaurant.findByIdAndUpdate(restaurantId, update, { returnDocument: 'after' });
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (update.primaryColor || update.logo) {
      getIO().to(`restaurant:${restaurantId}`).emit('branding:updated', {
        primaryColor: r.primaryColor,
        logo: r.logo,
      });
    }
    res.json(r);
  } catch (e) { next(e); }
});

// Menu — public reads (optionalAuth so admin JWT is decoded too), admin writes
router.get('/menu', optionalAuth, menuController.getMenu);
router.get('/menu/:id', menuController.getMenuItem);
router.post('/menu', requireAuth, validate(createMenuItemSchema), menuController.postMenuItem);
router.patch('/menu/:id', requireAuth, validate(updateMenuItemSchema), menuController.patchMenuItem);
router.delete('/menu/:id', requireAuth, menuController.deleteMenuItem);

// Categories — public reads (optionalAuth), admin writes
router.get('/categories', optionalAuth, categoriesController.getCategories);
router.post('/categories', requireAuth, validate(createCategorySchema), categoriesController.postCategory);
router.patch('/categories/:id', requireAuth, validate(updateCategorySchema), categoriesController.patchCategory);
router.delete('/categories/:id', requireAuth, categoriesController.deleteCategory);

// Reviews — public reads (optionalAuth), public create, admin delete
router.get('/reviews', optionalAuth, reviewsController.getReviews);
router.post('/reviews', validate(createReviewSchema), reviewsController.postReview);
router.delete('/reviews/:id', requireAuth, reviewsController.deleteReview);

// Orders — public create + single read, admin list + manage
router.post('/orders', validate(createOrderSchema), ordersController.postOrder);
router.get('/orders/archived', requireAuth, ordersController.getArchivedOrders);
router.post('/orders/archive-today', requireAuth, ordersController.archiveToday);
router.get('/orders/:id', ordersController.getOrder);
router.get('/orders', requireAuth, ordersController.getOrders);
router.patch('/orders/:id/status', requireAuth, validate(updateOrderStatusSchema), ordersController.updateStatus);
router.delete('/orders/:id', requireAuth, ordersController.deleteOrder);

// Tables — public read (customer app), admin write
router.get('/tables/public', tablesController.getTablesPublic);
router.get('/tables', requireAuth, tablesController.getTables);
router.post('/tables', requireAuth, tablesController.createTable);
router.delete('/tables/:id', requireAuth, tablesController.deleteTable);
router.patch('/tables/:id/status', requireAuth, tablesController.setManualStatus);

// Stats — admin only
router.get('/stats', requireAuth, statsController.getStats);

// Analytics — admin only
router.get('/analytics', requireAuth, analyticsController.getAnalyticsData);

// Image upload — admin only
router.post('/upload', requireAuth, uploadImage);

// Promo codes — public validate, admin CRUD
router.post('/promos/validate', validate(validatePromoCodeSchema), promoCodeController.validatePromoCode);
router.get('/promos', requireAuth, promoCodeController.getPromoCodes);
router.post('/promos', requireAuth, validate(createPromoCodeSchema), promoCodeController.createPromoCode);
router.patch('/promos/:id/toggle', requireAuth, promoCodeController.togglePromoCode);
router.delete('/promos/:id', requireAuth, promoCodeController.deletePromoCode);

// Reservations — public create, admin list + manage
router.post('/reservations', validate(createReservationSchema), reservationsController.postReservation);
router.get('/reservations', requireAuth, reservationsController.getReservations);
router.patch('/reservations/:id/status', requireAuth, validate(updateReservationStatusSchema), reservationsController.updateStatus);
router.delete('/reservations/:id', requireAuth, reservationsController.deleteReservation);

export default router;
