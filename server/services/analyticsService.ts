import { Order } from '../models/Order';

export async function getAnalytics(restaurantId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [orders, allOrders] = await Promise.all([
    Order.find({ restaurantId, createdAt: { $gte: since } }).sort({ createdAt: 1 }),
    Order.find({ restaurantId }).sort({ createdAt: 1 }),
  ]);

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    summary: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
    },
    revenueByDay: buildRevenueByDay(orders, days),
    categoryStats: buildCategoryStats(orders),
    hourlyOrders: buildHourlyOrders(allOrders),
    topItems: buildTopItems(orders, 5),
  };
}

function buildRevenueByDay(orders: any[], days: number) {
  const map: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map[d.toDateString()] = 0;
  }

  for (const order of orders) {
    const key = new Date(order.createdAt).toDateString();
    if (key in map) map[key] += order.total;
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Object.entries(map).map(([dateStr, value]) => {
    const d = new Date(dateStr);
    return {
      name: days <= 7 ? dayNames[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
      value: parseFloat(value.toFixed(2)),
    };
  });
}

function buildCategoryStats(orders: any[]) {
  const map: Record<string, { name: string; value: number; revenue: number }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const cat = item.category || 'Other';
      if (!map[cat]) map[cat] = { name: cat, value: 0, revenue: 0 };
      map[cat].value += item.quantity;
      map[cat].revenue += item.price * item.quantity;
    }
  }

  const total = Object.values(map).reduce((s, c) => s + c.value, 0);
  const colors = ['#9b3f25', '#bb563b', '#d4735a', '#e8a080', '#f2c4a8', '#f5d5c0'];

  return Object.values(map)
    .sort((a, b) => b.value - a.value)
    .map((c, i) => ({
      ...c,
      percentage: total > 0 ? Math.round((c.value / total) * 100) : 0,
      color: colors[i % colors.length],
    }));
}

function buildHourlyOrders(orders: any[]) {
  const hours = [
    { time: '11am', hour: 11 }, { time: '1pm', hour: 13 }, { time: '3pm', hour: 15 },
    { time: '5pm', hour: 17 }, { time: '7pm', hour: 19 }, { time: '9pm', hour: 21 },
  ];

  const map: Record<number, number> = {};
  for (const order of orders) {
    const h = new Date(order.createdAt).getHours();
    map[h] = (map[h] || 0) + 1;
  }

  return hours.map(({ time, hour }) => ({
    time,
    val: map[hour] || 0,
  }));
}

function buildTopItems(orders: any[], limit: number) {
  const counts: Record<string, { name: string; orders: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (!counts[item.name]) counts[item.name] = { name: item.name, orders: 0 };
      counts[item.name].orders += item.quantity;
    }
  }
  return Object.values(counts).sort((a, b) => b.orders - a.orders).slice(0, limit);
}
