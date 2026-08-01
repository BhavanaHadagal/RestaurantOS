const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('../config');
const logger = require('../config/logger');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { exportToExcel } = require('./reportService');
const { fetchInventoryAnalysisContext } = require('../lib/ingredientUsage');

const aiClient = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 180000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE']);

const postWithRetry = async (url, data, options = {}, maxAttempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await aiClient.post(url, data, options);
    } catch (error) {
      lastError = error;
      const retryable = RETRYABLE_CODES.has(error.code) || error.response?.status >= 502;
      if (!retryable || attempt === maxAttempts) throw error;
      logger.warn(`AI request retry ${attempt}/${maxAttempts - 1}`, { url, code: error.code });
      await sleep(2000 * attempt);
    }
  }
  throw lastError;
};

const friendlyAiError = (error) => {
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    return 'AI service is not reachable. Set AI_SERVICE_URL on the backend (e.g. https://restaurantos-ai.onrender.com).';
  }
  if (error.code === 'ETIMEDOUT') {
    return 'Invoice processing timed out. First upload can take up to 2 minutes while OCR loads.';
  }
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || d.message).join(', ');
  return error.response?.data?.message || error.message || 'AI service unavailable';
};

const callAI = async (endpoint, data, timeout = 120000) => {
  try {
    logger.info('AI request', { endpoint });
    const response = await aiClient.post(endpoint, data, { timeout });
    return response.data;
  } catch (error) {
    logger.error('AI service error', { endpoint, message: error.message, detail: error.response?.data });
    throw new AppError(friendlyAiError(error), error.response?.status || 503);
  }
};

const processInvoiceFile = async (filePath, originalName) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: originalName });

  try {
    const response = await postWithRetry('/ai/invoice/process', form, {
      headers: form.getHeaders(),
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return response.data?.data || response.data;
  } catch (error) {
    const message = friendlyAiError(error);
    logger.error('OCR processing failed', { message, code: error.code });
    throw new AppError(message, error.response?.status || 503);
  }
};

const matchSupplier = async (supplierName, gstNumber) => {
  if (!supplierName && !gstNumber) return null;
  const supplier = await prisma.supplier.findFirst({
    where: {
      OR: [
        ...(gstNumber ? [{ gstNumber }] : []),
        ...(supplierName ? [{ name: { contains: supplierName.split(' ')[0], mode: 'insensitive' } }] : []),
      ],
    },
  });
  return supplier;
};

const aiService = {
  async predictShortage() {
    const [{ enrichedIngredients, metrics }, activeOrders] = await Promise.all([
      fetchInventoryAnalysisContext(prisma),
      prisma.order.count({
        where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
      }),
    ]);

    return callAI('/ai/predict-shortages', {
      ingredients: enrichedIngredients,
      orderCount: metrics.orderCount,
      activeOrders,
    });
  },

  async recommendReorder() {
    const [{ enrichedIngredients, metrics }, products] = await Promise.all([
      fetchInventoryAnalysisContext(prisma),
      prisma.stockItem.findMany({ include: { product: { include: { category: true } } } }),
    ]);
    const orderCount = metrics.orderCount;
    const salesTrend = orderCount > 50 ? 'up' : orderCount < 20 ? 'down' : 'stable';
    return callAI('/ai/recommend-stock', {
      ingredients: enrichedIngredients,
      products,
      salesTrend,
    });
  },

  async recommendPricing() {
    const menuItems = await prisma.menuItem.findMany({
      include: {
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
        orderItems: true,
      },
    });
    return callAI('/ai/menu-pricing', { menuItems, targetMargin: 0.52, wastePercentage: 0.05 });
  },

  async predictPrepTime(menuItemId) {
    const [menuItem, activeOrders] = await Promise.all([
      prisma.menuItem.findUnique({
        where: { id: menuItemId },
        include: {
          recipe: { include: { ingredients: { include: { ingredient: true } } } },
          orderItems: { take: 100, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.order.count({
        where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
      }),
    ]);
    if (!menuItem) throw new AppError('Menu item not found', 404);
    return callAI('/ai/preparation-time', {
      menuItem,
      kitchenLoad: 1 + activeOrders * 0.05,
      activeOrders,
    });
  },

  async analyzeWaste() {
    const movements = await prisma.stockMovement.findMany({
      where: { type: { in: ['EXPIRED', 'DAMAGED'] } },
      include: { product: true, ingredient: true },
    });
    return callAI('/ai/waste-analysis', { movements });
  },

  async getBusinessInsights() {
    const [orders, expenses, inventory, menuItems] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        include: { items: { include: { menuItem: true } } },
      }),
      prisma.expense.findMany({
        where: { date: { gte: new Date(Date.now() - 90 * 86400000) } },
      }),
      prisma.ingredient.findMany(),
      prisma.menuItem.findMany({ include: { orderItems: true } }),
    ]);
    return callAI('/ai/analyze/insights', { orders, expenses, inventory, menuItems });
  },

  processInvoice: processInvoiceFile,
};

const parseSafeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1990 || year > 2035) return null;
  return d;
};

const invoiceService = {
  async createFromOCR(ocrData, filePath, userId) {
    const supplier = await matchSupplier(ocrData.supplierName, ocrData.gstNumber);

    const existing = ocrData.invoiceNumber
      ? await prisma.supplierInvoice.findFirst({ where: { invoiceNumber: ocrData.invoiceNumber } })
      : null;

    const status = ocrData.validationErrors?.length ? 'PENDING' : 'REVIEWED';

    const invoice = await prisma.supplierInvoice.create({
      data: {
        supplierName: ocrData.supplierName,
        supplierId: supplier?.id || ocrData.matchedSupplierId,
        supplierAddress: ocrData.supplierAddress,
        phoneNumber: ocrData.phoneNumber,
        email: ocrData.email,
        invoiceNumber: ocrData.invoiceNumber,
        invoiceDate: parseSafeDate(ocrData.invoiceDate),
        dueDate: parseSafeDate(ocrData.dueDate),
        gstNumber: ocrData.gstNumber,
        subtotal: ocrData.subtotal,
        tax: ocrData.tax,
        total: ocrData.total,
        currency: ocrData.currency || 'INR',
        paymentTerms: ocrData.paymentTerms,
        purchaseOrderNumber: ocrData.purchaseOrderNumber,
        notes: ocrData.notes,
        category: ocrData.category,
        invoiceType: ocrData.invoiceType,
        filePath,
        ocrData,
        ocrConfidence: ocrData.confidence,
        validationErrors: ocrData.validationErrors || [],
        isDuplicate: ocrData.isDuplicate || !!existing,
        processingTimeMs: ocrData.processingTimeMs,
        aiReasoning: ocrData.aiReasoning,
        status,
        createdById: userId,
        items: {
          create: (ocrData.items || []).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.taxAmount || item.tax,
            taxPercent: item.taxPercent,
            total: item.total,
            confidence: item.confidence,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    await prisma.ocrLog.create({
      data: {
        invoiceId: invoice.id,
        rawText: ocrData.rawText?.slice(0, 10000),
        structuredData: ocrData,
        ocrEngine: ocrData.ocrEngine,
        confidence: ocrData.averageConfidence,
        processingMs: ocrData.processingTimeMs,
        errors: ocrData.validationErrors,
      },
    });

    return invoice;
  },

  async update(id, data) {
    const { items, ...invoiceData } = data;

    if (items) {
      await prisma.supplierInvoiceItem.deleteMany({ where: { invoiceId: id } });
      await prisma.supplierInvoiceItem.createMany({
        data: items.map((item) => ({ ...item, invoiceId: id })),
      });
    }

    return prisma.supplierInvoice.update({
      where: { id },
      data: { ...invoiceData, status: invoiceData.status || 'REVIEWED' },
      include: { items: true, supplier: true, ocrLogs: true },
    });
  },

  async approve(id) {
    return prisma.supplierInvoice.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { items: true },
    });
  },

  async reject(id, reason) {
    return prisma.supplierInvoice.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason },
      include: { items: true },
    });
  },

  async remove(id) {
    await prisma.supplierInvoiceItem.deleteMany({ where: { invoiceId: id } });
    await prisma.ocrLog.deleteMany({ where: { invoiceId: id } });
    return prisma.supplierInvoice.delete({ where: { id } });
  },

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, pending, failed, approved, monthlyTotal, suppliers, avgConfidence] = await Promise.all([
      prisma.supplierInvoice.count(),
      prisma.supplierInvoice.count({ where: { status: { in: ['PENDING', 'REVIEWED', 'DRAFT'] } } }),
      prisma.supplierInvoice.count({ where: { status: 'FAILED' } }),
      prisma.supplierInvoice.count({ where: { status: { in: ['APPROVED', 'PAID'] } } }),
      prisma.supplierInvoice.aggregate({
        where: { invoiceDate: { gte: startOfMonth }, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { total: true },
      }),
      prisma.supplierInvoice.groupBy({
        by: ['supplierName'],
        _count: true,
        orderBy: { _count: { supplierName: 'desc' } },
        take: 5,
      }),
      prisma.ocrLog.aggregate({ _avg: { confidence: true, processingMs: true } }),
    ]);

    return {
      invoicesProcessed: total,
      pendingReview: pending,
      failedOcr: failed,
      approvedCount: approved,
      monthlyExpense: Number(monthlyTotal._sum.total || 0),
      topSuppliers: suppliers.map((s) => ({ name: s.supplierName, count: s._count })),
      ocrAccuracy: Math.round((avgConfidence._avg.confidence || 0) * 100),
      avgProcessingMs: Math.round(avgConfidence._avg.processingMs || 0),
    };
  },

  async generateExpenseRegister(startDate, endDate, statusFilter) {
    const statuses = statusFilter ? [statusFilter] : ['APPROVED', 'PAID'];
    const invoices = await prisma.supplierInvoice.findMany({
      where: {
        status: { in: statuses },
        ...(startDate && endDate && {
          invoiceDate: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
      },
      include: { items: true, supplier: true },
      orderBy: { invoiceDate: 'desc' },
    });

    const rows = invoices.map((inv) => ({
      invoiceNo: inv.invoiceNumber,
      supplier: inv.supplier?.name || inv.supplierName,
      invoiceDate: inv.invoiceDate,
      gst: inv.gstNumber,
      subtotal: Number(inv.subtotal || 0),
      tax: Number(inv.tax || 0),
      grandTotal: Number(inv.total || 0),
      status: inv.status,
      createdDate: inv.createdAt,
      category: inv.category,
    }));

    return exportToExcel('expense-register', rows);
  },

  async getAll(query = {}) {
    const { page = 1, limit = 10, status, search, supplierId } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { supplierName: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true, supplier: true },
      }),
      prisma.supplierInvoice.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id) {
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id },
      include: { items: true, supplier: true, ocrLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  },
};

module.exports = { aiService, invoiceService };
