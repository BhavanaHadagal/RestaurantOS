const { SEED_PREFIX, pick, randInt, randFloat, randomDateInRange, sixMonthsAgo, batchRun } = require('./helpers');

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'CARD', 'WALLET', 'BANK_TRANSFER'];

async function seedTransactions(prisma, ctx) {
  console.log('→ Transactions (1000 orders, bills, payments)');

  const { menuItemList, tables, customers, usersByRole } = ctx;
  const waiters = usersByRole.waiters;
  const start = sixMonthsAgo();

  const existingCount = await prisma.order.count({
    where: { orderNumber: { startsWith: `${SEED_PREFIX}-ORD-` } },
  });

  if (existingCount >= 1000) {
    console.log('  Skipped — demo orders already seeded');
    return { orderCount: existingCount };
  }

  if (existingCount > 0) {
    await clearDemoOrders(prisma);
  }

  const popularItems = menuItemList.slice(0, 15);
  let paymentCount = 0;

  await batchRun(1000, 25, async (from, to) => {
    for (let i = from; i < to; i++) {
      const orderNumber = `${SEED_PREFIX}-ORD-${String(i + 1).padStart(5, '0')}`;
      const createdAt = randomDateInRange(start);
      const statusRoll = Math.random();
      const status = statusRoll < 0.05 ? 'CANCELLED'
        : statusRoll < 0.08 ? pick(['PENDING', 'CONFIRMED', 'PREPARING', 'READY'])
          : statusRoll < 0.12 ? 'SERVED'
            : 'COMPLETED';

      const type = pick(ORDER_TYPES);
      const itemCount = randInt(1, 5);
      const selected = [];
      for (let j = 0; j < itemCount; j++) {
        selected.push(Math.random() < 0.55 ? pick(popularItems) : pick(menuItemList));
      }

      const items = selected.map((mi) => {
        const qty = randInt(1, 4);
        const price = Number(mi.price);
        return {
          menuItemId: mi.id,
          quantity: qty,
          unitPrice: price,
          total: price * qty,
          status,
        };
      });

      const subtotal = items.reduce((s, it) => s + Number(it.total), 0);
      const discount = Math.random() < 0.15 ? randFloat(20, subtotal * 0.15) : 0;
      const taxable = subtotal - discount;
      const tax = Number((taxable * 0.05).toFixed(2));
      const total = Number((taxable + tax).toFixed(2));

      const order = await prisma.order.create({
        data: {
          orderNumber,
          status,
          type,
          tableId: type === 'DINE_IN' ? pick(tables).id : null,
          customerId: Math.random() < 0.7 ? pick(customers).id : null,
          waiterId: pick(waiters).id,
          subtotal,
          tax,
          discount,
          total,
          notes: i % 20 === 0 ? 'Extra spicy, no onion' : null,
          createdAt,
          items: { create: items },
        },
      });

      if (['COMPLETED', 'SERVED'].includes(status)) {
        const refund = Math.random() < 0.03;
        const bill = await prisma.bill.create({
          data: {
            billNumber: `${SEED_PREFIX}-BILL-${String(i + 1).padStart(5, '0')}`,
            orderId: order.id,
            customerId: order.customerId,
            subtotal,
            tax,
            discount,
            total,
            status: refund ? 'REFUNDED' : 'PAID',
            createdAt,
          },
        });

        if (!refund) {
          const method = pick(PAYMENT_METHODS);
          await prisma.payment.create({
            data: {
              billId: bill.id,
              amount: total,
              method,
              transactionId: method === 'CASH' ? null : `${SEED_PREFIX}-TXN-${i + 1}`,
              createdAt,
            },
          });
          paymentCount++;

          if (Math.random() < 0.08) {
            await prisma.payment.create({
              data: {
                billId: bill.id,
                amount: randFloat(50, total * 0.3),
                method: pick(PAYMENT_METHODS),
                transactionId: `${SEED_PREFIX}-TXN-SPLIT-${i + 1}`,
                notes: 'Split payment',
                createdAt,
              },
            });
            paymentCount++;
          }
        }
      } else if (Math.random() < 0.1 && status !== 'CANCELLED') {
        await prisma.bill.create({
          data: {
            billNumber: `${SEED_PREFIX}-BILL-${String(i + 1).padStart(5, '0')}`,
            orderId: order.id,
            subtotal,
            tax,
            discount,
            total,
            status: 'UNPAID',
            createdAt,
          },
        });
      }
    }
  });

  console.log(`  Created 1000 orders, ~${paymentCount} payments`);
  return { orderCount: 1000, paymentCount };
}

async function clearDemoOrders(prisma) {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: `${SEED_PREFIX}-ORD-` } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (!orderIds.length) return;

  const bills = await prisma.bill.findMany({
    where: { orderId: { in: orderIds } },
    select: { id: true },
  });
  const billIds = bills.map((b) => b.id);

  if (billIds.length) {
    await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
  }
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
}

module.exports = { seedTransactions, clearDemoOrders };
