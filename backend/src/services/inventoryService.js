const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { createCrudService } = require('../utils/crudFactory');

const stockService = {
  async stockIn(data) {
    const { productId, warehouseId, quantity, reason } = data;

    const stockItem = await prisma.stockItem.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: { quantity: { increment: quantity } },
      create: { productId, warehouseId, quantity },
    });

    await prisma.stockMovement.create({
      data: {
        type: 'STOCK_IN',
        productId,
        warehouseId,
        quantity,
        reason,
      },
    });

    return stockItem;
  },

  async stockOut(data) {
    const { productId, warehouseId, quantity, reason } = data;

    const stockItem = await prisma.stockItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!stockItem || Number(stockItem.quantity) < quantity) {
      throw new AppError('Insufficient stock', 400);
    }

    const updated = await prisma.stockItem.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantity: { decrement: quantity } },
    });

    await prisma.stockMovement.create({
      data: {
        type: 'STOCK_OUT',
        productId,
        warehouseId,
        quantity,
        reason,
      },
    });

    return updated;
  },

  async recordExpired(data) {
    const movement = await prisma.stockMovement.create({
      data: { ...data, type: 'EXPIRED' },
    });

    if (data.productId) {
      await prisma.stockItem.updateMany({
        where: { productId: data.productId, warehouseId: data.warehouseId },
        data: { quantity: { decrement: data.quantity } },
      });
    }

    return movement;
  },

  async recordDamaged(data) {
    const movement = await prisma.stockMovement.create({
      data: { ...data, type: 'DAMAGED' },
    });

    if (data.productId) {
      await prisma.stockItem.updateMany({
        where: { productId: data.productId, warehouseId: data.warehouseId },
        data: { quantity: { decrement: data.quantity } },
      });
    }

    return movement;
  },

  async getMovements(query = {}) {
    const { page = 1, limit = 20, type } = query;
    const skip = (page - 1) * limit;
    const where = type ? { type } : {};

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { product: true, ingredient: true, warehouse: true },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { data, pagination: { total, page: Number(page), limit: Number(limit) } };
  },

  async getStockLevels() {
    return prisma.stockItem.findMany({
      include: { product: true, warehouse: true },
      orderBy: { quantity: 'asc' },
    });
  },
};

const purchaseOrderService = {
  ...createCrudService('purchaseOrder', {
    searchFields: ['poNumber'],
    include: {
      supplier: true,
      items: { include: { product: true, ingredient: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  }),

  async create(data, userId) {
    const poNumber = `PO-${Date.now()}`;
    const { items, ...poData } = data;

    let totalAmount = 0;
    const purchaseItems = items.map((item) => {
      const total = Number(item.quantity) * Number(item.unitPrice);
      totalAmount += total;
      return { ...item, total };
    });

    return prisma.purchaseOrder.create({
      data: {
        ...poData,
        poNumber,
        totalAmount,
        createdById: userId,
        items: { create: purchaseItems },
      },
      include: {
        supplier: true,
        items: { include: { product: true, ingredient: true } },
      },
    });
  },

  async updateStatus(id, status) {
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    if (status === 'RECEIVED') {
      for (const item of po.items) {
        if (item.productId) {
          const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
          if (warehouse) {
            await stockService.stockIn({
              productId: item.productId,
              warehouseId: warehouse.id,
              quantity: Number(item.quantity),
              reason: `PO ${po.poNumber} received`,
            });
          }
        }
        if (item.ingredientId) {
          await prisma.ingredient.update({
            where: { id: item.ingredientId },
            data: { currentStock: { increment: Number(item.quantity) } },
          });
        }
      }
    }

    return po;
  },
};

module.exports = { stockService, purchaseOrderService };
