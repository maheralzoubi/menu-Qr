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
import { getPublicBanners } from '../controllers/bannerController';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menu.schema';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema';
import { createOrderSchema, updateOrderStatusSchema, confirmPaymentSchema } from '../schemas/order.schema';
import { createReservationSchema, updateReservationStatusSchema } from '../schemas/reservation.schema';
import { createReviewSchema } from '../schemas/review.schema';
import { createPromoCodeSchema, validatePromoCodeSchema } from '../schemas/promoCode.schema';
import { Restaurant } from '../models/Restaurant';
import { Review } from '../models/Review';
import { getIO } from '../socket/index';
import Anthropic from '@anthropic-ai/sdk';
import { ApiError as GeminiApiError } from '@google/genai';
import { chatSchema } from '../schemas/chat.schema';
import { runChat, chatEnabled } from '../services/chatService';

const router = Router();

// Whether a restaurant is accepting orders right now, in its own timezone.
function isRestaurantOpen(r: { status: string; openTime?: string; closeTime?: string; timezone?: string }): boolean {
  if (r.status !== 'active') return false;
  if (!r.openTime || !r.closeTime) return true;
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const now = new Date();
  let nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  try {
    const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: r.timezone || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    nowMins = toMins(localTime);
  } catch { /* invalid timezone — fall back to UTC */ }
  const open = toMins(r.openTime), close = toMins(r.closeTime);
  // Hours that cross midnight (e.g. 11:00 – 01:00)
  return close < open ? nowMins >= open || nowMins <= close : nowMins >= open && nowMins <= close;
}

async function reviewStats(restaurantId: unknown) {
  const reviews = await Review.find({ restaurantId }).select('rating');
  const averageRating = reviews.length > 0
    ? parseFloat((reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length).toFixed(1))
    : 0;
  return { averageRating, reviewCount: reviews.length };
}

// All restaurants — public (for restaurant discovery list)
router.get('/restaurants/public', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await Restaurant.find().select('name logo address status cuisine currency openTime closeTime prepTime timezone primaryColor').sort({ name: 1 });

    const results = await Promise.all(restaurants.map(async (r) => {
      const { averageRating, reviewCount } = await reviewStats(r._id);
      return { _id: r._id, name: r.name, logo: r.logo, address: r.address, status: r.status, cuisine: r.cuisine ?? [], currency: r.currency ?? 'USD', isOpen: isRestaurantOpen(r), prepTime: r.prepTime ?? null, openTime: r.openTime ?? null, closeTime: r.closeTime ?? null, timezone: r.timezone ?? 'UTC', primaryColor: r.primaryColor ?? '#fe5722', averageRating, reviewCount };
    }));

    res.json(results);
  } catch (e) { next(e); }
});

// Restaurant info — public (for customer app)
router.get('/restaurants/:id/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id).select('name logo status primaryColor currency address contactPhone cuisine openTime closeTime prepTime timezone');
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (r.status === 'inactive') { res.status(403).json({ message: 'Restaurant is currently unavailable.' }); return; }
    const { averageRating, reviewCount } = await reviewStats(r._id);
    res.json({
      name: r.name, logo: r.logo, status: r.status, primaryColor: r.primaryColor ?? '#fe5722', currency: r.currency ?? 'USD',
      address: r.address ?? '', contactPhone: r.contactPhone ?? '', cuisine: r.cuisine ?? [],
      openTime: r.openTime ?? null, closeTime: r.closeTime ?? null, prepTime: r.prepTime ?? null,
      isOpen: isRestaurantOpen(r), averageRating, reviewCount, chatEnabled: chatEnabled(),
    });
  } catch (e) { next(e); }
});

// Chat assistant — public. Each message is a paid model call, so cap it per client.
const chatHits = new Map<string, number[]>();
function chatRateLimited(req: Request): boolean {
  const key = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  const recent = (chatHits.get(key) ?? []).filter(t => now - t < 60_000);
  recent.push(now);
  chatHits.set(key, recent);
  if (chatHits.size > 5000) for (const [k, v] of chatHits) if (v.every(t => now - t >= 60_000)) chatHits.delete(k);
  return recent.length > 15;
}

router.post('/restaurants/:id/chat', validate(chatSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!chatEnabled()) { res.status(503).json({ message: 'Chat is not available.' }); return; }
    if (chatRateLimited(req)) { res.status(429).json({ message: 'Too many messages — please wait a moment.' }); return; }
    const r = await Restaurant.findById(req.params.id).select('name status cuisine currency address openTime closeTime prepTime timezone');
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (r.status === 'inactive') { res.status(403).json({ message: 'Restaurant is currently unavailable.' }); return; }
    const result = await runChat({
      restaurantId: r._id.toString(),
      restaurant: { name: r.name, cuisine: r.cuisine ?? [], currency: r.currency ?? 'USD', address: r.address, openTime: r.openTime, closeTime: r.closeTime, prepTime: r.prepTime },
      isOpen: isRestaurantOpen(r),
      lang: req.body.lang,
      table: req.body.table,
      history: req.body.messages,
      cart: req.body.cart,
    });
    res.json(result);
  } catch (e) {
    if (e instanceof GeminiApiError) {
      console.error('Chat API error', e.status, e.message);
      if (e.status === 429) { res.status(429).json({ message: 'The assistant is busy — please try again in a moment.' }); return; }
      res.status(502).json({ message: 'The assistant is unavailable right now.' }); return;
    }
    if (e instanceof Error && e.name === 'AbortError') { console.error('Chat API timeout'); res.status(504).json({ message: 'The assistant took too long to answer — please try again.' }); return; }
    if (e instanceof Anthropic.RateLimitError) { res.status(429).json({ message: 'The assistant is busy — please try again in a moment.' }); return; }
    if (e instanceof Anthropic.APIError) { console.error('Chat API error', e.status, e.message); res.status(502).json({ message: 'The assistant is unavailable right now.' }); return; }
    next(e);
  }
});

// Restaurant branding — admin reads and updates their own restaurant
router.get('/settings/restaurant', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = (req as AuthRequest).user!;
    if (!restaurantId) { res.status(403).json({ message: 'No restaurant linked to this account' }); return; }
    const r = await Restaurant.findById(restaurantId).select('name logo primaryColor address contactEmail contactPhone currency openTime closeTime prepTime timezone');
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    res.json(r);
  } catch (e) { next(e); }
});

router.patch('/settings/restaurant', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = (req as AuthRequest).user!;
    if (!restaurantId) { res.status(403).json({ message: 'No restaurant linked to this account' }); return; }
    const allowed = ['logo', 'primaryColor', 'name', 'address', 'contactEmail', 'contactPhone', 'currency', 'openTime', 'closeTime', 'prepTime', 'timezone'];
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
router.patch('/orders/:id/payment', requireAuth, validate(confirmPaymentSchema), ordersController.confirmPayment);
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

// Banners — public read
router.get('/banners/public', getPublicBanners);

export default router;
