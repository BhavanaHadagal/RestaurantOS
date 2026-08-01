const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { tenantWhere, getRestaurantId } = require('../lib/tenant');

const generateBillNumber = () => {
  const date = new Date();
  return `BILL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

const billService = {
  async createFromOrder(orderId) {
    const order = await prisma.order.findFirst({
      where: tenantWhere({ id: orderId }),
      include: { bill: true },
    });
    if (!order) throw new AppError('Order not found', 404);
    if (order.bill) throw new AppError('Bill already exists for this order', 409);

    return prisma.bill.create({
      data: {
        restaurantId: getRestaurantId(),
        billNumber: generateBillNumber(),
        orderId,
        customerId: order.customerId,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
      },
      include: { order: true, customer: true },
    });
  },

  async getAll(query = {}, restaurantId) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where = tenantWhere(status ? { status } : {}, restaurantId);

    const [data, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          order: { include: { items: { include: { menuItem: true } } } },
          customer: true,
          payments: true,
        },
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    };
  },

  async getById(id) {
    const bill = await prisma.bill.findFirst({
      where: tenantWhere({ id }),
      include: {
        order: { include: { items: { include: { menuItem: true } } } },
        customer: true,
        payments: true,
      },
    });
    if (!bill) throw new AppError('Bill not found', 404);
    return bill;
  },
};

const paymentService = {
  async create(data) {
    const bill = await prisma.bill.findUnique({ where: { id: data.billId } });
    if (!bill) throw new AppError('Bill not found', 404);

    const payment = await prisma.payment.create({ data });

    const payments = await prisma.payment.aggregate({
      where: { billId: data.billId },
      _sum: { amount: true },
    });

    const totalPaid = Number(payments._sum.amount || 0);
    let status = 'UNPAID';
    if (totalPaid >= Number(bill.total)) status = 'PAID';
    else if (totalPaid > 0) status = 'PARTIAL';

    await prisma.bill.update({
      where: { id: data.billId },
      data: { status },
    });

    return payment;
  },

  async getAll(query = {}, restaurantId) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const billScope = tenantWhere({}, restaurantId);

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where: { bill: billScope },
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { bill: { include: { order: true } } },
      }),
      prisma.payment.count({ where: { bill: billScope } }),
    ]);

    return { data, pagination: { total, page: Number(page), limit: Number(limit) } };
  },
};

module.exports = { billService, paymentService };
