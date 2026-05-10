import { Request, Response, NextFunction } from 'express';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { MenuItem } from '../models/MenuItem';
import { Review } from '../models/Review';
import { Reservation } from '../models/Reservation';
import { Category } from '../models/Category';

// ── Restaurant management ──────────────────────────────────────────────────────

export const getRestaurants = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
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
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) { res.status(409).json({ message: 'Admin email already registered' }); return; }

    // Create restaurant first with placeholder adminId
    const restaurant = await Restaurant.create({
      name, logo, contactEmail, contactPhone, address,
      adminId: '000000000000000000000000',
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
    const { name, logo, contactEmail, contactPhone, address } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id, { name, logo, contactEmail, contactPhone, address }, { new: true, runValidators: true }
    );
    if (!restaurant) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    res.json(restaurant);
  } catch (e) { next(e); }
};

export const updateRestaurantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      res.status(400).json({ message: 'status must be active or inactive' }); return;
    }
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!restaurant) { res.status(404).json({ message: 'Restaurant not found' }); return; }
    res.json(restaurant);
  } catch (e) { next(e); }
};

export const deleteRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) { res.status(404).json({ message: 'Restaurant not found' }); return; }
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

export const getOwnerAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [totalRestaurants, activeRestaurants, totalCustomers, totalOrders, orders, restaurants] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ status: 'active' }),
      Customer.countDocuments(),
      Order.countDocuments(),
      Order.find(),
      Restaurant.find().sort({ createdAt: -1 }),
    ]);
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    const restaurantsPerMonth = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
        const count = await Restaurant.countDocuments({ createdAt: { $gte: d, $lt: end } });
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

// ── Customer management ───────────────────────────────────────────────────────

export const getCustomers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find()
      .select('-password')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch (e) { next(e); }
};

export const updateCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active', 'locked'].includes(status)) {
      res.status(400).json({ message: 'Status must be active or locked' }); return;
    }
    const customer = await Customer.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' }).select('-password');
    if (!customer) { res.status(404).json({ message: 'Customer not found' }); return; }
    res.json(customer);
  } catch (e) { next(e); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Customer not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
};
