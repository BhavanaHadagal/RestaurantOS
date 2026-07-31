const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { buildPagination, buildPaginatedResponse, buildSort, buildSearchFilter } = require('../utils/pagination');

const generateOrderNumber = () => {
  const date = new Date();
  const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${random}`;
};

const orderService = {
  async getAll(query = {}) {
    const { page, limit, sortBy, sortOrder, search, status, type } = query;
    const pagination = buildPagination(page, limit);
    const where = {
      ...buildSearchFilter(search, ['orderNumber']),
      ...(status && { status }),
      ...(type && { type }),
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildSort(sortBy, sortOrder),
        include: {
          table: true,
          customer: true,
          waiter: { select: { id: true, firstName: true, lastName: true } },
          items: { include: { menuItem: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, pagination.page, pagination.limit);
  },

  async getById(id) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        customer: true,
        waiter: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { menuItem: true } },
        bill: { include: { payments: true } },
      },
    });
    if (!order) throw new AppError('Order not found', 404);
    return order;
  },

  async create(data, waiterId) {
    const { items, ...orderData } = data;
    let subtotal = 0;

    const orderItems = [];
    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem) throw new AppError(`Menu item ${item.menuItemId} not found`, 404);
      const total = Number(menuItem.price) * item.quantity;
      subtotal += total;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total,
        notes: item.notes,
      });
    }

    const tax = subtotal * 0.05;
    const total = subtotal + tax - (orderData.discount || 0);

    const order = await prisma.order.create({
      data: {
        ...orderData,
        orderNumber: generateOrderNumber(),
        waiterId,
        subtotal,
        tax,
        total,
        items: { create: orderItems },
      },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
      },
    });

    if (order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return order;
  },

  async updateStatus(id, status) {
    const order = await this.getById(id);
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    if (status === 'COMPLETED' && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  },

  async updateItemStatus(orderId, itemId, status) {
    return prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { menuItem: true },
    });
  },

  async getKitchenQueue() {
    return prisma.order.findMany({
      where: { status: { in: ['CONFIRMED', 'PREPARING'] } },
      include: {
        items: {
          where: { status: { in: ['CONFIRMED', 'PREPARING', 'PENDING'] } },
          include: { menuItem: true },
        },
        table: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};

module.exports = orderService;
