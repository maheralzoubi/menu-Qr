import { Request, Response, NextFunction } from 'express';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { MenuItem } from '../models/MenuItem';
import { Review } from '../models/Review';
import { Reservation } from '../models/Reservation';
import { Category } from '../models/Category';

// ── Helpers ────────────────────────────────────────────────────────────────────

const isSuperAdmin = (req: Request) => (req as AuthRequest).user?.role === 'superadmin';
const callerId = (req: Request) => (req as AuthRequest).user?.id;

// Returns the Mongoose filter for "restaurants this caller may see"
const ownerFilter = (req: Request) =>
  isSuperAdmin(req) ? {} : { ownerId: callerId(req) };

// Checks ownership; returns true if the caller may manage this restaurant
const canManage = (req: Request, ownerId: any) =>
  isSuperAdmin(req) || String(ownerId) === callerId(req);

const PLAN_LIMITS: Record<string, number> = { starter: 1, pro: 5, enterprise: Infinity };

// ── Restaurant management ──────────────────────────────────────────────────────

export const getRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await Restaurant.find(ownerFilter(req)).sort({ createdAt: -1 });
    const results = await Promise.all(restaurants.map(async (r) => {
      const [orders, customers] = await Promise.all([
        Order.find({ restaurantId: r._id }),
        Customer.countDocuments({ restaurantId: r._id }),
      ]);
      const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
      return { ...r.toJSON(), totalOrders: orders.length, totalRevenue, totalCustomers: customers };
    }));
    res.json(results);
  } catch (e) { next(e); }
};

export const createRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, logo, contactEmail, contactPhone, address, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !adminEmail || !adminPassword || !adminName) {
      res.status(400).json({ message: 'name, adminName, adminEmail, adminPassword are required' });
      return;
    }

    // Enforce plan limits for non-superadmin owners
    if (!isSuperAdmin(req)) {
      const owner = await User.findById(callerId(req));
      const limit = PLAN_LIMITS[owner?.plan ?? 'starter'] ?? 1;
      const count = await Restaurant.countDocuments({ ownerId: callerId(req) });
      if (count >= limit) {
        const limitLabel = limit === Infinity ? 'unlimited' : String(limit);
        res.status(403).json({
          message: `Your ${owner?.plan ?? 'Starter'} plan allows up to ${limitLabel} restaurant(s). Upgrade your plan to add more.`,
        });
        return;
      }
    }

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) { res.status(409).json({ message: 'Admin email already registered' }); return; }

    const restaurant = await Restaurant.create({
      name, logo, contactEmail, contactPhone, address,
      adminId: '000000000000000000000000',
      ownerId: isSuperAdmin(req) ? undefined : callerId(req),
    });
    const admin = await User.create({
      name: adminName, email: adminEmail, password: adminPassword,
      role: 'admin', restaurantId: restaurant._id,
    });
    restaurant.adminId = admin._id as any;
    await restaurant.save();

    res.status(201).json({ restaurant: restaurant.toJSON(), admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (e) { next(e); }
};

export const getRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (!canManage(req, r.ownerId)) { res.status(403).json({ message: 'Access denied.' }); return; }
    const admin = await User.findById(r.adminId).select('-password');
    const [orders, customers, totalMenuItems, totalReviews, totalReservations] = await Promise.all([
      Order.find({ restaurantId: r._id }),
      Customer.countDocuments({ restaurantId: r._id }),
      MenuItem.countDocuments({ restaurantId: r._id }),
      Review.countDocuments({ restaurantId: r._id }),
      Reservation.countDocuments({ restaurantId: r._id }),
    ]);
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    res.json({
      ...r.toJSON(), admin,
      stats: { totalOrders: orders.length, totalRevenue, totalCustomers: customers, totalMenuItems, totalReviews, totalReservations },
    });
  } catch (e) { next(e); }
};

export const updateRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (!canManage(req, r.ownerId)) { res.status(403).json({ message: 'Access denied.' }); return; }
    const { name, logo, contactEmail, contactPhone, address } = req.body;
    const updated = await Restaurant.findByIdAndUpdate(
      req.params.id, { name, logo, contactEmail, contactPhone, address }, { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (e) { next(e); }
};

export const updateRestaurantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (!canManage(req, r.ownerId)) { res.status(403).json({ message: 'Access denied.' }); return; }
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      res.status(400).json({ message: 'status must be active or inactive' }); return;
    }
    const updated = await Restaurant.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updated);
  } catch (e) { next(e); }
};

export const deleteRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    if (!canManage(req, r.ownerId)) { res.status(403).json({ message: 'Access denied.' }); return; }
    const rid = r._id;
    await Promise.all([
      User.deleteMany({ restaurantId: rid }),
      Customer.deleteMany({ restaurantId: rid }),
      Order.deleteMany({ restaurantId: rid }),
      MenuItem.deleteMany({ restaurantId: rid }),
      Category.deleteMany({ restaurantId: rid }),
      Review.deleteMany({ restaurantId: rid }),
      Reservation.deleteMany({ restaurantId: rid }),
      Restaurant.findByIdAndDelete(rid),
    ]);
    res.status(204).send();
  } catch (e) { next(e); }
};

// ── Platform analytics ─────────────────────────────────────────────────────────

export const getOwnerAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const filter = ownerFilter(req);
    const [totalRestaurants, activeRestaurants, restaurants] = await Promise.all([
      Restaurant.countDocuments(filter),
      Restaurant.countDocuments({ ...filter, status: 'active' }),
      Restaurant.find(filter).sort({ createdAt: -1 }),
    ]);
    const restaurantIds = restaurants.map(r => r._id);
    // For non-superAdmin with no restaurants yet, use $in:[] to guarantee 0 — never fall back to {}
    const ridFilter = restaurantIds.length
      ? { restaurantId: { $in: restaurantIds } }
      : (isSuperAdmin(req) ? {} : { restaurantId: { $in: [] as any[] } });
    const [totalCustomers, totalOrders, orders] = await Promise.all([
      Customer.countDocuments(ridFilter),
      Order.countDocuments(ridFilter),
      Order.find(ridFilter),
    ]);
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    const restaurantsPerMonth = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
        const count = await Restaurant.countDocuments({ ...filter, createdAt: { $gte: d, $lt: end } });
        return { name: monthNames[d.getMonth()], value: count };
      })
    );

    const restaurantStats = await Promise.all(restaurants.map(async (r) => {
      const [rOrders, rCustomers] = await Promise.all([
        Order.find({ restaurantId: r._id }),
        Customer.countDocuments({ restaurantId: r._id }),
      ]);
      return {
        _id: r._id, name: r.name, status: r.status,
        totalOrders: rOrders.length,
        totalRevenue: rOrders.reduce((s, o) => s + o.total, 0),
        totalCustomers: rCustomers,
      };
    }));

    res.json({
      totalRestaurants, activeRestaurants, totalCustomers, totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      restaurantsPerMonth, restaurantStats,
    });
  } catch (e) { next(e); }
};

// ── Platform subscriber management ────────────────────────────────────────────
// "customers" here means restaurant owners who subscribed via the landing page (role: 'owner')

export const getSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isSuperAdmin(req)) {
      res.status(403).json({ message: 'Only the super admin can view subscribers.' });
      return;
    }
    const subscribers = await User.find({ role: 'owner' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (e) { next(e); }
};

export const updateCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active', 'locked'].includes(status)) {
      res.status(400).json({ message: 'Status must be active or locked' }); return;
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    if (!user) { res.status(404).json({ message: 'Subscriber not found' }); return; }
    res.json(user);
  } catch (e) { next(e); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Subscriber not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};

// Only callable by superadmin role
export const updateCustomerPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if ((req as any).user?.role !== 'superadmin') {
      res.status(403).json({ message: 'Only the super admin can update plans.' });
      return;
    }
    const { plan, billing } = req.body;
    const validPlans = ['starter', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({ message: 'Invalid plan.' });
      return;
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { plan, planBilling: billing ?? 'monthly', planActivatedAt: new Date() },
      { new: true }
    ).select('-password');
    if (!user) { res.status(404).json({ message: 'Subscriber not found' }); return; }
    res.json(user);
  } catch (e) { next(e); }
};

// ── Subscription ───────────────────────────────────────────────────────────────
// In-memory store — replace with a Subscription model + real payment provider (Stripe, etc.)
const subscriptions = new Map<string, { plan: string; billing: string; activatedAt: string }>();

export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id ?? 'owner';
    const sub = subscriptions.get(userId);
    res.json(sub ?? { plan: null });
  } catch (e) { next(e); }
};

export const checkoutSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plan, billing, method, last4, brand } = req.body;
    const validPlans = ['starter', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({ message: 'Invalid plan.' });
      return;
    }
    // TODO: integrate payment provider (Stripe, etc.) here using method/last4/brand/apple_pay token
    const userId = (req as any).user?.id ?? 'owner';
    subscriptions.set(userId, { plan, billing: billing ?? 'monthly', activatedAt: new Date().toISOString() });
    res.json({ success: true, plan, billing, method, last4, brand });
  } catch (e) { next(e); }
};
