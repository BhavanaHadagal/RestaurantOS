const ExcelJS = require('exceljs');
const prisma = require('../config/database');

const formatCurrency = (value) => Number(value || 0).toFixed(2);

/** Inclusive local-day range for YYYY-MM-DD date inputs from the UI. */
const parseReportDateRange = (startDate, endDate) => {
  const parse = (value, endOfDay) => {
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  };
  return { start: parse(startDate, false), end: parse(endDate, true) };
};

const generateSalesReport = async (startDate, endDate) => {
  const { start, end } = parseReportDateRange(startDate, endDate);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: { in: ['COMPLETED', 'SERVED'] },
    },
    include: {
      items: { include: { menuItem: true } },
      table: true,
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = Math.round(orders.reduce((sum, o) => sum + Number(o.total), 0) * 100) / 100;
  const totalOrders = orders.length;
  const averageOrder = totalOrders ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  return {
    summary: { totalRevenue, totalOrders, averageOrder },
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt,
      type: o.type,
      table: o.table?.number,
      customer: o.customer?.name,
      subtotal: Number(o.subtotal),
      tax: Number(o.tax),
      total: Number(o.total),
      items: o.items.length,
    })),
  };
};

const generateExpenseReport = async (startDate, endDate) => {
  const { start, end } = parseReportDateRange(startDate, endDate);
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },    include: { category: true, supplier: true },
    orderBy: { date: 'desc' },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const byCategory = {};
  expenses.forEach((e) => {
    const cat = e.category.name;
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
  });

  return {
    summary: { total, count: expenses.length, byCategory },
    expenses: expenses.map((e) => ({
      title: e.title,
      amount: Number(e.amount),
      date: e.date,
      category: e.category.name,
      supplier: e.supplier?.name,
    })),
  };
};

const generateInventoryReport = async () => {
  const [products, ingredients, movements] = await Promise.all([
    prisma.stockItem.findMany({
      include: { product: { include: { category: true } }, warehouse: true },
    }),
    prisma.ingredient.findMany({ include: { supplier: true } }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      include: { product: true, warehouse: true },
    }),
  ]);

  const lowStock = [
    ...products.filter((p) => Number(p.quantity) <= Number(p.product.minStock)),
    ...ingredients.filter((i) => Number(i.currentStock) <= Number(i.minStock)),
  ];

  return {
    summary: {
      totalProducts: products.length,
      totalIngredients: ingredients.length,
      lowStockCount: lowStock.length,
    },
    products: products.map((p) => ({
      name: p.product.name,
      sku: p.product.sku,
      warehouse: p.warehouse.name,
      quantity: Number(p.quantity),
      minStock: Number(p.product.minStock),
    })),
    ingredients: ingredients.map((i) => ({
      name: i.name,
      currentStock: Number(i.currentStock),
      minStock: Number(i.minStock),
      unit: i.unit,
      supplier: i.supplier?.name,
    })),
    recentMovements: movements.slice(0, 50),
  };
};

const generateSupplierReport = async () => {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchaseOrders: { where: { status: { not: 'CANCELLED' } } },
      invoices: true,
      _count: { select: { ingredients: true } },
    },
  });

  return suppliers.map((s) => ({
    name: s.name,
    email: s.email,
    phone: s.phone,
    gstNumber: s.gstNumber,
    ingredientCount: s._count.ingredients,
    totalPurchases: s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
    invoiceCount: s.invoices.length,
    isActive: s.isActive,
  }));
};

const generateProfitReport = async (startDate, endDate) => {
  const { start, end } = parseReportDateRange(startDate, endDate);
  const [revenue, expenses, purchases] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ['COMPLETED', 'SERVED'] },
      },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        orderDate: { gte: start, lte: end },        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const totalRevenue = Number(revenue._sum.total || 0);
  const totalExpenses = Number(expenses._sum.amount || 0);
  const totalPurchases = Number(purchases._sum.totalAmount || 0);
  const profit = totalRevenue - totalExpenses - totalPurchases;

  return {
    revenue: totalRevenue,
    expenses: totalExpenses,
    purchases: totalPurchases,
    profit,
    profitMargin: totalRevenue ? ((profit / totalRevenue) * 100).toFixed(2) : 0,
  };
};

const exportToExcel = async (reportType, data) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(reportType);

  if (reportType === 'sales') {
    sheet.columns = [
      { header: 'Order #', key: 'orderNumber', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
    ];
    data.orders.forEach((o) => sheet.addRow(o));
    sheet.addRow({});
    sheet.addRow({ orderNumber: 'Total Revenue', total: data.summary.totalRevenue });
  } else if (reportType === 'expenses') {
    sheet.columns = [
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
    ];
    data.expenses.forEach((e) => sheet.addRow(e));
    sheet.addRow({});
    sheet.addRow({ title: 'Total', amount: data.summary.total });
  } else if (reportType === 'expense-register') {
    sheet.columns = [
      { header: 'Supplier', key: 'supplier', width: 25 },
      { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Item', key: 'item', width: 25 },
      { header: 'Qty', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Tax', key: 'tax', width: 10 },
      { header: 'Total', key: 'total', width: 12 },
    ];
    data.forEach((row) => sheet.addRow(row));
  }

  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
};

const exportToCSV = (headers, rows) => {
  const csvHeaders = headers.join(',');
  const csvRows = rows.map((row) =>
    headers.map((h) => `"${row[h] ?? ''}"`).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
};

module.exports = {
  generateSalesReport,
  generateExpenseReport,
  generateInventoryReport,
  generateSupplierReport,
  generateProfitReport,
  exportToExcel,
  exportToCSV,
  formatCurrency,
};
