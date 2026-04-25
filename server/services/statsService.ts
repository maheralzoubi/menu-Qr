import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { MenuItem } from '../models/MenuItem';
import { Reservation } from '../models/Reservation';

export async function getStats(restaurantId: string) {
  const [orders, reviews, totalMenuItems, totalReservations] = await Promise.all([
    Order.find({ restaurantId }).sort({ createdAt: -1 }),
    Review.find({ restaurantId }).sort({ createdAt: -1 }),
    MenuItem.countDocuments({ restaurantId }),
    Reservation.countDocuments({ restaurantId }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const averageRating =
    reviews.length > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0;

  // Daily revenue for the last 7 days
  const dailyRevenue = buildDailyRevenue(orders, 7);

  // Top 5 menu items by how often they appear in orders
  const topItems = buildTopItems(orders, 5);

  return {
    totalOrders: orders.length,
    totalRevenue,
    averageRating,
    totalReviews: reviews.length,
    totalMenuItems,
    totalReservations,
    recentOrders: orders.slice(0, 5),
    recentReviews: reviews.slice(0, 3),
    dailyRevenue,
    topItems,
  };
}

function buildDailyRevenue(orders: any[], days: number) {
  const result: { name: string; value: number }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    const dayName = dayNames[date.getDay()];

    const dayRevenue = orders
      .filter(o => new Date(o.createdAt).toDateString() === dateStr)
      .reduce((sum, o) => sum + o.total, 0);

    result.push({ name: dayName, value: dayRevenue });
  }
  return result;
}

function buildTopItems(orders: any[], limit: number) {
  const counts: Record<string, { name: string; orders: number }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      if (!counts[item.name]) counts[item.name] = { name: item.name, orders: 0 };
      counts[item.name].orders += item.quantity;
    }
  }

  return Object.values(counts)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}
