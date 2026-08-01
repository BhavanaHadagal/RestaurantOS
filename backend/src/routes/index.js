const express = require('express');
const { body } = require('express-validator');
const { createCrudService } = require('../utils/crudFactory');
const { createCrudRoutes, createCrudController } = require('../utils/crudRoutes');
const { authenticate, authorize, authorizeRoles, authorizeOwnerOnly } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const orderService = require('../services/orderService');
const { billService, paymentService } = require('../services/billingService');
const { stockService, purchaseOrderService } = require('../services/inventoryService');
const { getDashboardStats, getChartData } = require('../services/dashboardService');
const reportService = require('../services/reportService');
const { aiService, invoiceService } = require('../services/aiService');
const { staffService, notificationService, menuService } = require('../services/staffService');
const upload = require('../middleware/upload');
const prisma = require('../config/database');
const { serializeForJson, sendJson } = require('../utils/serialize');

const router = express.Router();

// Dashboard
router.get('/dashboard/stats', authenticate, authorize('dashboard.view'), asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  res.json({ success: true, data: stats });
}));

router.get('/dashboard/charts', authenticate, authorize('dashboard.analytics.full', 'dashboard.analytics.limited'), asyncHandler(async (req, res) => {
  const charts = await getChartData(req.query.period);
  res.json({ success: true, data: charts });
}));

// Generic CRUD modules
const modules = [
  { path: 'tables', model: 'table', permission: 'tables', searchFields: ['location'], uniqueField: null },
  { path: 'menu-categories', model: 'menuCategory', permission: 'menu' },
  { path: 'customers', model: 'customer', permission: 'customers' },
  { path: 'suppliers', model: 'supplier', permission: 'suppliers' },
  { path: 'ingredients', model: 'ingredient', permission: 'ingredients' },
  { path: 'product-categories', model: 'productCategory', permission: 'inventory' },
  { path: 'products', model: 'product', permission: 'inventory', searchFields: ['name', 'sku'], uniqueField: 'sku' },
  { path: 'warehouses', model: 'warehouse', permission: 'inventory' },
  { path: 'expense-categories', model: 'expenseCategory', permission: 'expenses' },
  { path: 'expenses', model: 'expense', permission: 'expenses', include: { category: true, supplier: true } },
];

modules.forEach(({ path, model, permission, searchFields, uniqueField, include }) => {
  const service = createCrudService(model, { searchFields, uniqueField, include });
  const controller = createCrudController(service);
  const moduleRouter = express.Router();
  createCrudRoutes(moduleRouter, {
    controller,
    permission,
    createRules: [body('name').optional().notEmpty()],
  });
  router.use(`/${path}`, moduleRouter);
});

// Reservations
const reservationService = createCrudService('reservation', {
  searchFields: ['customerName', 'customerPhone'],
  include: { table: true, createdBy: { select: { firstName: true, lastName: true } } },
});
const reservationController = createCrudController(reservationService);
const reservationRouter = express.Router();
createCrudRoutes(reservationRouter, {
  controller: reservationController,
  permission: 'reservations',
  createRules: [
    body('customerName').notEmpty(),
    body('customerPhone').notEmpty(),
    body('partySize').isInt({ min: 1 }),
    body('date').isISO8601(),
    body('time').notEmpty(),
  ],
});
router.use('/reservations', reservationRouter);

// Menu Items
router.get('/menu-items', authenticate, authorize('menu.view'), asyncHandler(async (req, res) => {
  const result = await menuService.getAll(req.query);
  res.json({ success: true, ...result });
}));
router.get('/menu-items/:id', authenticate, authorize('menu.view'), asyncHandler(async (req, res) => {
  const item = await menuService.getById(req.params.id);
  res.json({ success: true, data: item });
}));
router.post('/menu-items', authenticate, authorize('menu.create'), asyncHandler(async (req, res) => {
  const item = req.body.ingredients
    ? await menuService.createWithRecipe(req.body)
    : await menuService.create(req.body);
  res.status(201).json({ success: true, data: item });
}));
router.put('/menu-items/:id', authenticate, authorize('menu.update'), asyncHandler(async (req, res) => {
  const item = await menuService.update(req.params.id, req.body);
  res.json({ success: true, data: item });
}));
router.delete('/menu-items/:id', authenticate, authorizeRoles('Owner'), asyncHandler(async (req, res) => {
  await menuService.remove(req.params.id);
  res.json({ success: true, message: 'Deleted successfully' });
}));

// Orders
router.get('/orders', authenticate, authorize('orders.view'), asyncHandler(async (req, res) => {
  const result = await orderService.getAll(req.query);
  res.json({ success: true, ...result });
}));
router.get('/orders/kitchen', authenticate, authorize('kitchen.view'), asyncHandler(async (req, res) => {
  const queue = await orderService.getKitchenQueue();
  res.json({ success: true, data: queue });
}));
router.get('/orders/:id', authenticate, authorize('orders.view'), asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id);
  res.json({ success: true, data: order });
}));
router.post('/orders', authenticate, authorize('orders.create'), asyncHandler(async (req, res) => {
  const order = await orderService.create(req.body, req.user.id);
  req.app.get('io')?.emit('new-order', order);
  res.status(201).json({ success: true, data: order });
}));
router.patch('/orders/:id/status', authenticate, authorize('orders.update'), asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status);
  req.app.get('io')?.emit('order-update', order);
  res.json({ success: true, data: order });
}));
router.patch('/orders/:orderId/items/:itemId/status', authenticate, authorize('kitchen.update'), asyncHandler(async (req, res) => {
  const item = await orderService.updateItemStatus(req.params.orderId, req.params.itemId, req.body.status);
  req.app.get('io')?.emit('kitchen-update', item);
  res.json({ success: true, data: item });
}));

// Bills & Payments
router.get('/bills', authenticate, authorize('bills.view'), asyncHandler(async (req, res) => {
  const result = await billService.getAll(req.query);
  res.json({ success: true, ...result });
}));
router.get('/bills/:id', authenticate, authorize('bills.view'), asyncHandler(async (req, res) => {
  const bill = await billService.getById(req.params.id);
  res.json({ success: true, data: bill });
}));
router.post('/bills', authenticate, authorize('bills.create'), asyncHandler(async (req, res) => {
  const bill = await billService.createFromOrder(req.body.orderId);
  res.status(201).json({ success: true, data: bill });
}));
router.get('/payments', authenticate, authorize('payments.view'), asyncHandler(async (req, res) => {
  const result = await paymentService.getAll(req.query);
  res.json({ success: true, ...result });
}));
router.post('/payments', authenticate, authorize('payments.create'), asyncHandler(async (req, res) => {
  const payment = await paymentService.create(req.body);
  res.status(201).json({ success: true, data: payment });
}));

// Inventory
router.get('/stock', authenticate, authorize('inventory.view'), asyncHandler(async (req, res) => {
  const stock = await stockService.getStockLevels();
  res.json({ success: true, data: stock });
}));
router.post('/stock/in', authenticate, authorize('inventory.stock_in'), asyncHandler(async (req, res) => {
  const result = await stockService.stockIn(req.body);
  res.status(201).json({ success: true, data: result });
}));
router.post('/stock/out', authenticate, authorize('inventory.stock_out'), asyncHandler(async (req, res) => {
  const result = await stockService.stockOut(req.body);
  res.json({ success: true, data: result });
}));
router.post('/stock/expired', authenticate, authorize('inventory.update'), asyncHandler(async (req, res) => {
  const result = await stockService.recordExpired(req.body);
  res.status(201).json({ success: true, data: result });
}));
router.post('/stock/damaged', authenticate, authorize('inventory.update'), asyncHandler(async (req, res) => {
  const result = await stockService.recordDamaged(req.body);
  res.status(201).json({ success: true, data: result });
}));
router.get('/stock/movements', authenticate, authorize('inventory.view'), asyncHandler(async (req, res) => {
  const result = await stockService.getMovements(req.query);
  res.json({ success: true, ...result });
}));

// Purchase Orders
router.get('/purchase-orders', authenticate, authorize('inventory.view'), asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.getAll(req.query);
  res.json({ success: true, ...result });
}));
router.post('/purchase-orders', authenticate, authorize('inventory.create'), asyncHandler(async (req, res) => {
  const po = await purchaseOrderService.create(req.body, req.user.id);
  res.status(201).json({ success: true, data: po });
}));
router.patch('/purchase-orders/:id/status', authenticate, authorize('inventory.update'), asyncHandler(async (req, res) => {
  const po = await purchaseOrderService.updateStatus(req.params.id, req.body.status);
  res.json({ success: true, data: po });
}));

// Staff
router.get('/staff', authenticate, authorize('staff.view'), asyncHandler(async (req, res) => {
  const result = await staffService.getAll(req.query);
  res.json({ success: true, ...result });
}));
router.get('/staff/:id', authenticate, authorize('staff.view'), asyncHandler(async (req, res) => {
  const staff = await staffService.getById(req.params.id);
  res.json({ success: true, data: staff });
}));
router.post('/staff', authenticate, authorizeOwnerOnly, auditLog('CREATE_STAFF', 'staff'), asyncHandler(async (req, res) => {
  const staff = await staffService.create(req.body, req.role);
  res.status(201).json({ success: true, data: staff });
}));
router.put('/staff/:id', authenticate, authorizeOwnerOnly, auditLog('UPDATE_STAFF', 'staff'), asyncHandler(async (req, res) => {
  const staff = await staffService.update(req.params.id, req.body, req.role);
  res.json({ success: true, data: staff });
}));
router.delete('/staff/:id', authenticate, authorizeOwnerOnly, auditLog('DELETE_STAFF', 'staff'), asyncHandler(async (req, res) => {
  await staffService.remove(req.params.id, req.role);
  res.json({ success: true, message: 'Staff deactivated' });
}));

// Notifications
router.get('/notifications', authenticate, asyncHandler(async (req, res) => {
  const result = await notificationService.getForUser(req.user.id, req.query);
  res.json({ success: true, ...result });
}));
router.patch('/notifications/:id/read', authenticate, asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  res.json({ success: true });
}));
router.patch('/notifications/read-all', authenticate, asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ success: true });
}));

// Roles
router.get('/roles', authenticate, authorizeOwnerOnly, asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
  res.json({ success: true, data: roles });
}));

// Reports
router.get('/reports/sales', authenticate, authorize('reports.view', 'reports.sales'), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const report = await reportService.generateSalesReport(startDate, endDate);
  res.json({ success: true, data: report });
}));
router.get('/reports/expenses', authenticate, authorize('reports.view'), asyncHandler(async (req, res) => {
  const report = await reportService.generateExpenseReport(req.query.startDate, req.query.endDate);
  res.json({ success: true, data: report });
}));
router.get('/reports/inventory', authenticate, authorize('reports.view'), asyncHandler(async (req, res) => {
  const report = await reportService.generateInventoryReport();
  res.json({ success: true, data: report });
}));
router.get('/reports/suppliers', authenticate, authorize('reports.view'), asyncHandler(async (req, res) => {
  const report = await reportService.generateSupplierReport();
  res.json({ success: true, data: report });
}));
router.get('/reports/profit', authenticate, authorize('reports.profit'), asyncHandler(async (req, res) => {
  const report = await reportService.generateProfitReport(req.query.startDate, req.query.endDate);
  res.json({ success: true, data: report });
}));
router.get('/reports/:type/export', authenticate, authorize('reports.export'), asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { startDate, endDate, format = 'excel' } = req.query;
  let report;
  if (type === 'sales') report = await reportService.generateSalesReport(startDate, endDate);
  else if (type === 'expenses') report = await reportService.generateExpenseReport(startDate, endDate);
  else return res.status(400).json({ success: false, message: 'Invalid report type' });

  if (format === 'csv') {
    const headers = type === 'sales' ? ['orderNumber', 'date', 'type', 'total'] : ['title', 'amount', 'date', 'category'];
    const rows = type === 'sales' ? report.orders : report.expenses;
    const csv = reportService.exportToCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    return res.send(csv);
  }

  const buffer = await reportService.exportToExcel(type, report);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);
  res.send(buffer);
}));

// AI Routes — GET (legacy) + POST (spec)
router.get('/ai/shortage', authenticate, authorize('ai.shortage', 'ai.stock'), asyncHandler(async (req, res) => {
  const result = await aiService.predictShortage();
  res.json({ success: true, data: result });
}));
router.post('/ai/predict-shortages', authenticate, authorize('ai.shortage', 'ai.stock'), asyncHandler(async (req, res) => {
  const result = await aiService.predictShortage();
  res.json({ success: true, data: result });
}));
router.get('/ai/reorder', authenticate, authorize('ai.stock'), asyncHandler(async (req, res) => {
  const result = await aiService.recommendReorder();
  res.json({ success: true, data: result });
}));
router.post('/ai/recommend-stock', authenticate, authorize('ai.stock'), asyncHandler(async (req, res) => {
  const result = await aiService.recommendReorder();
  res.json({ success: true, data: result });
}));
router.get('/ai/pricing', authenticate, authorize('ai.pricing'), asyncHandler(async (req, res) => {
  const result = await aiService.recommendPricing();
  res.json({ success: true, data: result });
}));
router.post('/ai/menu-pricing', authenticate, authorize('ai.pricing'), asyncHandler(async (req, res) => {
  const result = await aiService.recommendPricing();
  res.json({ success: true, data: result });
}));
router.get('/ai/prep-time/:menuItemId', authenticate, authorize('ai.prep'), asyncHandler(async (req, res) => {
  const result = await aiService.predictPrepTime(req.params.menuItemId);
  res.json({ success: true, data: result });
}));
router.post('/ai/preparation-time', authenticate, authorize('ai.prep'), asyncHandler(async (req, res) => {
  const menuItemId = req.body.menuItemId;
  if (!menuItemId) throw new AppError('menuItemId is required', 400);
  const result = await aiService.predictPrepTime(menuItemId);
  res.json({ success: true, data: result });
}));
router.get('/ai/waste', authenticate, authorize('ai.waste'), asyncHandler(async (req, res) => {
  const result = await aiService.analyzeWaste();
  res.json({ success: true, data: result });
}));
router.post('/ai/waste-analysis', authenticate, authorize('ai.waste'), asyncHandler(async (req, res) => {
  const result = await aiService.analyzeWaste();
  res.json({ success: true, data: result });
}));
router.get('/ai/insights', authenticate, authorize('ai.insights'), asyncHandler(async (req, res) => {
  const result = await aiService.getBusinessInsights();
  res.json({ success: true, data: result });
}));
router.get('/ai/invoices/dashboard', authenticate, authorize('invoices.view', 'ai.invoice'), asyncHandler(async (req, res) => {
  const stats = await invoiceService.getDashboardStats();
  res.json({ success: true, data: stats });
}));

const processUploadedInvoices = async (files, userId) => {
  const results = [];
  for (const file of files) {
    try {
      const ocrResult = await aiService.processInvoice(file.path, file.originalname);
      const invoice = await invoiceService.createFromOCR(ocrResult, file.path, userId);
      results.push({ success: true, data: invoice });
    } catch (err) {
      results.push({ success: false, filename: file.originalname, error: err.message });
    }
  }
  return results;
};

// Invoice OCR — spec paths under /ai/invoices
router.get('/ai/invoices/export/excel', authenticate, authorize('reports.export', 'invoices.view'), asyncHandler(async (req, res) => {
  const buffer = await invoiceService.generateExpenseRegister(
    req.query.startDate, req.query.endDate, req.query.status
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=expense-register.xlsx');
  res.send(buffer);
}));
router.get('/ai/invoices', authenticate, authorize('invoices.view'), asyncHandler(async (req, res) => {
  const result = await invoiceService.getAll(req.query);
  sendJson(res, { success: true, ...result });
}));
router.get('/ai/invoices/:id', authenticate, authorize('invoices.view'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  res.json(serializeForJson({ success: true, data: invoice }));
}));
router.post('/ai/invoice/upload', authenticate, authorize('ai.invoice', 'invoices.create'), upload.array('files', 10), auditLog('OCR_INVOICE', 'invoices'), asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : (req.file ? [req.file] : []);
  if (!files.length) throw new AppError('No files uploaded', 400);
  const results = await processUploadedInvoices(files, req.user.id);
  res.status(201).json({ success: true, data: results });
}));
router.post('/ai/invoice/process', authenticate, authorize('ai.invoice', 'invoices.create'), upload.single('file'), auditLog('OCR_INVOICE', 'invoices'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const ocrResult = await aiService.processInvoice(req.file.path, req.file.originalname);
  res.json({ success: true, data: ocrResult });
}));
router.put('/ai/invoices/:id', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.update(req.params.id, req.body);
  res.json({ success: true, data: invoice });
}));
router.delete('/ai/invoices/:id', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  await invoiceService.remove(req.params.id);
  res.json({ success: true, message: 'Invoice deleted' });
}));
router.patch('/ai/invoices/:id/approve', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.approve(req.params.id);
  res.json({ success: true, data: invoice });
}));
router.patch('/ai/invoices/:id/reject', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.reject(req.params.id, req.body.reason);
  res.json({ success: true, data: invoice });
}));

// Invoice OCR — legacy paths
router.get('/invoices', authenticate, authorize('invoices.view'), asyncHandler(async (req, res) => {
  const result = await invoiceService.getAll(req.query);
  sendJson(res, { success: true, ...result });
}));
router.get('/invoices/register/export', authenticate, authorize('reports.export'), asyncHandler(async (req, res) => {
  const buffer = await invoiceService.generateExpenseRegister(
    req.query.startDate, req.query.endDate, req.query.status
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=expense-register.xlsx');
  res.send(buffer);
}));
router.get('/invoices/:id', authenticate, authorize('invoices.view'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  res.json(serializeForJson({ success: true, data: invoice }));
}));
router.post('/invoices/upload', authenticate, authorize('ai.invoice', 'invoices.create'), upload.single('file'), auditLog('OCR_INVOICE', 'invoices'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  try {
    const ocrResult = await aiService.processInvoice(req.file.path, req.file.originalname);
    const invoice = await invoiceService.createFromOCR(ocrResult, req.file.path, req.user.id);
    sendJson(res, { success: true, data: invoice }, 201);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || 'Invoice OCR processing failed', 503);
  }
}));
router.put('/invoices/:id', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.update(req.params.id, req.body);
  res.json({ success: true, data: invoice });
}));
router.patch('/invoices/:id/approve', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.approve(req.params.id);
  res.json({ success: true, data: invoice });
}));
router.patch('/invoices/:id/reject', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.reject(req.params.id, req.body.reason);
  res.json({ success: true, data: invoice });
}));
router.delete('/invoices/:id', authenticate, authorize('invoices.update'), asyncHandler(async (req, res) => {
  await invoiceService.remove(req.params.id);
  res.json({ success: true, message: 'Invoice deleted' });
}));

module.exports = router;
