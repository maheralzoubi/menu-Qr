import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { User } from '../models/User';

// ── Restaurant Admin management ───────────────────────────────────────────────

export const getAdmins = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'staff'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (e) { next(e); }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: 'name, email and password are required' });
      return;
    }
    if (!['admin', 'staff'].includes(role)) {
      res.status(400).json({ message: 'role must be admin or staff' });
      return;
    }
    const existing = await User.findOne({ email });
    if (existing) { res.status(409).json({ message: 'Email already registered' }); return; }
    const user = await User.create({ name, email, password, role });
    const { password: _, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (e) { next(e); }
};

export const deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ message: 'Admin not found' }); return; }
    if (user.role === 'superadmin') { res.status(403).json({ message: 'Cannot delete superadmin' }); return; }
    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: 'name, email and password are required' });
      return;
    }
    const existing = await Customer.findOne({ email });
    if (existing) { res.status(409).json({ message: 'Email already registered' }); return; }
    const customer = await Customer.create({ name, email, password, phone });
    const { password: _, ...safe } = customer.toObject();
    res.status(201).json(safe);
  } catch (e) { next(e); }
};

export const getCustomers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find().select('-password').sort({ createdAt: -1 });

    // Attach order count to each customer
    const orderCounts = await Order.aggregate([
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    orderCounts.forEach(o => { countMap[o._id?.toString()] = o.count; });

    const result = customers.map(c => ({
      ...c.toJSON(),
      orderCount: countMap[c._id.toString()] ?? 0,
    }));
    res.json(result);
  } catch (e) { next(e); }
};

export const updateCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active', 'locked'].includes(status)) {
      res.status(400).json({ message: 'Status must be active or locked' });
      return;
    }
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');
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

export const getPlatformAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      activeCustomers,
      lockedCustomers,
      newToday,
      newThisWeek,
      newThisMonth,
      orders,
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Customer.countDocuments({ status: 'locked' }),
      Customer.countDocuments({ createdAt: { $gte: todayStart } }),
      Customer.countDocuments({ createdAt: { $gte: weekStart } }),
      Customer.countDocuments({ createdAt: { $gte: monthStart } }),
      Order.find().sort({ createdAt: -1 }),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    // Customers joined per day — last 7 days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const customersPerDay: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = await Customer.countDocuments({ createdAt: { $gte: d, $lt: next } });
      customersPerDay.push({ name: dayNames[d.getDay()], value: count });
    }

    res.json({
      totalCustomers,
      activeCustomers,
      lockedCustomers,
      newToday,
      newThisWeek,
      newThisMonth,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      customersPerDay,
    });
  } catch (e) { next(e); }
};
