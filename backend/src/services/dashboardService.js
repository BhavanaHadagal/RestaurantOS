const prisma = require('../config/database');
const { tenantWhere } = require('../lib/tenant');

const getDashboardStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [
    todayOrders,
    activeOrders,
    tables,
    lowStockIngredients,
    monthlyExpenses,
    monthlyPurchases,
    monthlyRevenue,
    supplierCount,
  ] = await Promise.all([
    prisma.order.count({
      where: tenantWhere({
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['COMPLETED', 'SERVED'] },
      }),
    }),
    prisma.order.count({
      where: tenantWhere({ status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } }),
    }),
    prisma.table.findMany({ where: tenantWhere() }),
    prisma.ingredient.findMany({ where: tenantWhere() }),
    prisma.expense.aggregate({
      where: tenantWhere({ date: { gte: startOfMonth } }),
      _sum: { amount: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: tenantWhere({ orderDate: { gte: startOfMonth }, status: { not: 'CANCELLED' } }),
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: tenantWhere({
        createdAt: { gte: startOfMonth },
        status: { in: ['COMPLETED', 'SERVED'] },
      }),
      _sum: { total: true },
    }),
    prisma.supplier.count({ where: tenantWhere({ isActive: true }) }),
  ]);

  const lowStock = await prisma.ingredient.findMany({
    where: tenantWhere({ minStock: { gt: 0 } }),
  });
  const filteredLowStock = lowStock.filter(
    (i) => Number(i.currentStock) <= Number(i.minStock)
  );

  const revenue = Number(monthlyRevenue._sum.total || 0);
  const expenses = Number(monthlyExpenses._sum.amount || 0);
  const purchases = Number(monthlyPurchases._sum.totalAmount || 0);
  const profit = revenue - expenses - purchases;

  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const tableOccupancy = tables.length
    ? Math.round((occupiedTables / tables.length) * 100)
    : 0;

  return {
    salesOverview: {
      todayOrders,
      monthlyRevenue: revenue,
      profit,
    },
    activeOrders,
    tableOccupancy: {
      total: tables.length,
      occupied: occupiedTables,
      percentage: tableOccupancy,
    },
    lowStock: filteredLowStock.length,
    lowStockItems: filteredLowStock.slice(0, 5),
    monthlyExpenses: expenses,
    purchaseSummary: purchases,
    profit,
    supplierCount,
  };
};

const getChartData = async (period = 'month') => {
  const now = new Date();
  let startDate;
  let groupFormat;

  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    groupFormat = 'day';
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    groupFormat = 'month';
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setDate(startDate.getDate() - 29);
    groupFormat = 'day';
  }

  const [orders, expenses, purchases, orderItems] = await Promise.all([
    prisma.order.findMany({
      where: tenantWhere({
        createdAt: { gte: startDate },
        status: { in: ['COMPLETED', 'SERVED'] },
      }),
      select: { total: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: tenantWhere({ date: { gte: startDate } }),
      select: { amount: true, date: true },
    }),
    prisma.purchaseOrder.findMany({
      where: tenantWhere({ orderDate: { gte: startDate }, status: { not: 'CANCELLED' } }),
      select: { totalAmount: true, orderDate: true },
    }),
    prisma.orderItem.findMany({
      where: {
        createdAt: { gte: startDate },
        order: tenantWhere(),
      },
      include: { menuItem: { select: { name: true } } },
    }),
  ]);

  const groupByDate = (items, dateField, valueField) => {
    const grouped = {};
    items.forEach((item) => {
      const date = new Date(item[dateField]);
      const key =
        groupFormat === 'month'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + Number(item[valueField]);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  };

  const topSelling = {};
  orderItems.forEach((item) => {
    const name = item.menuItem.name;
    topSelling[name] = (topSelling[name] || 0) + item.quantity;
  });

  const topSellingMenu = Object.entries(topSelling)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, quantity]) => ({ name, quantity }));

  const revenue = groupByDate(orders, 'createdAt', 'total');
  const expenseData = groupByDate(expenses, 'date', 'amount');
  const purchaseData = groupByDate(purchases, 'orderDate', 'totalAmount');

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.date, r.value]));
  const revenueMap = toMap(revenue);
  const expenseMap = toMap(expenseData);
  const purchaseMap = toMap(purchaseData);
  const profitDates = [...new Set([
    ...Object.keys(revenueMap),
    ...Object.keys(expenseMap),
    ...Object.keys(purchaseMap),
  ])].sort();

  const profit = profitDates.map((date) => ({
    date,
    value: (revenueMap[date] || 0) - (expenseMap[date] || 0) - (purchaseMap[date] || 0),
  }));

  const ingredients = await prisma.ingredient.findMany({
    where: tenantWhere(),
    select: { name: true, currentStock: true, minStock: true },
  });

  return {
    revenue,
    orders: groupByDate(
      orders.map((o) => ({ ...o, count: 1 })),
      'createdAt',
      'count'
    ).map((o) => ({ ...o, value: o.value })),
    expenses: expenseData,
    profit,
    inventory: ingredients.map((i) => ({
      name: i.name,
      current: Number(i.currentStock),
      minimum: Number(i.minStock),
    })),
    topSellingMenu,
    purchaseTrend: purchaseData,
  };
};

module.exports = { getDashboardStats, getChartData };
