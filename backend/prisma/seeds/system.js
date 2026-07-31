const { SEED_PREFIX, pick, randInt, randFloat, randomDateInRange, sixMonthsAgo } = require('./helpers');

const DASHBOARD_TARGETS = {
  revenue: 2200000,
  expenses: 550000,
  purchases: 1100000,
};

const NOTIFICATION_TEMPLATES = [
  { title: 'Low Stock Alert', message: '{item} is below minimum stock level', type: 'STOCK', link: '/inventory' },
  { title: 'Order Ready', message: 'Order {order} is ready for service', type: 'ORDER', link: '/kitchen' },
  { title: 'Payment Received', message: '₹{amount} received via {method}', type: 'SUCCESS', link: '/billing' },
  { title: 'Invoice Uploaded', message: 'Supplier invoice {inv} processed via OCR', type: 'INFO', link: '/invoices' },
  { title: 'PO Approved', message: 'Purchase order {po} has been approved', type: 'SUCCESS', link: '/inventory' },
  { title: 'Table Reserved', message: 'Table {table} reserved for {time}', type: 'INFO', link: '/tables' },
  { title: 'High Waste Detected', message: 'Unusual waste recorded for {item}', type: 'WARNING', link: '/ai' },
  { title: 'Shift Reminder', message: 'Your shift starts in 30 minutes', type: 'INFO', link: '/dashboard' },
];

const ACTIVITY_ACTIONS = [
  { action: 'USER_LOGIN', module: 'auth' },
  { action: 'ORDER_CREATED', module: 'orders' },
  { action: 'ORDER_UPDATED', module: 'orders' },
  { action: 'MENU_UPDATED', module: 'menu' },
  { action: 'INVOICE_PROCESSED', module: 'invoices' },
  { action: 'STOCK_UPDATED', module: 'inventory' },
  { action: 'PAYMENT_COMPLETED', module: 'billing' },
  { action: 'PO_APPROVED', module: 'purchases' },
  { action: 'EXPENSE_RECORDED', module: 'expenses' },
  { action: 'STAFF_UPDATED', module: 'staff' },
  { action: 'TABLE_STATUS_CHANGED', module: 'tables' },
  { action: 'RESERVATION_CREATED', module: 'reservations' },
];

async function seedSystem(prisma, ctx) {
  console.log('→ System (notifications & activity logs)');

  const { usersByRole, ingredientList, menuItemList } = ctx;
  const allUsers = usersByRole.all;
  const start = sixMonthsAgo();

  const notifCount = await prisma.notification.count({
    where: { title: { startsWith: '[Demo]' } },
  });

  if (notifCount < 150) {
    await prisma.notification.deleteMany({ where: { title: { startsWith: '[Demo]' } } });
    const notifications = [];
    for (let i = 0; i < 150; i++) {
      const tpl = pick(NOTIFICATION_TEMPLATES);
      const msg = tpl.message
        .replace('{item}', pick(ingredientList).name)
        .replace('{order}', `${SEED_PREFIX}-ORD-${randInt(1, 999)}`)
        .replace('{amount}', randInt(200, 5000))
        .replace('{method}', pick(['UPI', 'Cash', 'Card']))
        .replace('{inv}', `${SEED_PREFIX}-INV-${randInt(1, 99)}`)
        .replace('{po}', `${SEED_PREFIX}-PO-${randInt(1, 99)}`)
        .replace('{table}', randInt(1, 40))
        .replace('{time}', `${randInt(11, 21)}:00`);

      notifications.push({
        userId: pick(allUsers).id,
        title: `[Demo] ${tpl.title}`,
        message: msg,
        type: tpl.type,
        isRead: Math.random() < 0.6,
        link: tpl.link,
        createdAt: randomDateInRange(start),
      });
    }
    for (let i = 0; i < notifications.length; i += 50) {
      await prisma.notification.createMany({ data: notifications.slice(i, i + 50) });
    }
  }

  const logCount = await prisma.activityLog.count({
    where: { module: { startsWith: 'demo' } },
  });

  if (logCount < 1000) {
    await prisma.activityLog.deleteMany({ where: { module: { startsWith: 'demo' } } });
    const logs = [];
    for (let i = 0; i < 1000; i++) {
      const act = pick(ACTIVITY_ACTIONS);
      const user = pick(allUsers);
      logs.push({
        userId: user.id,
        action: act.action,
        module: `demo_${act.module}`,
        details: {
          userEmail: user.email,
          entity: act.module,
          reference: `${SEED_PREFIX}-LOG-${i + 1}`,
          menuItem: Math.random() < 0.3 ? pick(menuItemList).name : undefined,
        },
        ipAddress: `103.${randInt(10, 250)}.${randInt(0, 255)}.${randInt(1, 254)}`,
        createdAt: randomDateInRange(start),
      });
    }
    for (let i = 0; i < logs.length; i += 100) {
      await prisma.activityLog.createMany({ data: logs.slice(i, i + 100) });
    }
  }

  console.log('  Notifications & activity logs ready');
}

async function tuneAiData(prisma, ctx) {
  console.log('→ AI analysis tuning');

  const { ingredientList, warehouseMap, productList } = ctx;
  const warehouseIds = Object.values(warehouseMap).map((w) => w.id);

  const aiWasteRef = `${SEED_PREFIX}-AI-WASTE`;
  await prisma.stockMovement.deleteMany({ where: { reference: aiWasteRef } });

  const wasteItems = ingredientList.slice(0, 12);
  for (const ing of wasteItems) {
    await prisma.stockMovement.create({
      data: {
        type: Math.random() > 0.5 ? 'EXPIRED' : 'DAMAGED',
        ingredientId: ing.id,
        warehouseId: pick(warehouseIds),
        quantity: randInt(1, 15),
        reason: 'AI demo — waste analysis sample',
        reference: aiWasteRef,
        createdAt: randomDateInRange(sixMonthsAgo()),
      },
    });
  }

  for (let i = 0; i < 20 && i < productList.length; i++) {
    const prod = productList[i];
    await prisma.stockItem.updateMany({
      where: { productId: prod.id },
      data: { quantity: randInt(1, 5) },
    });
  }

  for (const ing of ingredientList.slice(12, 27)) {
    await prisma.ingredient.update({
      where: { id: ing.id },
      data: { currentStock: Number(ing.minStock) * 0.4 },
    });
  }
}

async function clearDemoDashOrders(prisma) {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: `${SEED_PREFIX}-DASH-ORD-` } },
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

const randomDateInCurrentMonth = (reference = new Date()) => {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return randomDateInRange(start, end);
};

async function tuneDashboardProfit(prisma, ctx) {
  console.log('→ Dashboard profit tuning');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { menuItemList, tables, customers, usersByRole } = ctx;
  const waiters = usersByRole.waiters;

  const allPos = await prisma.purchaseOrder.findMany({
    where: { poNumber: { startsWith: `${SEED_PREFIX}-PO-` } },
    select: { id: true, orderDate: true },
  });
  for (const po of allPos) {
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { createdAt: po.orderDate },
    });
  }

  const monthPOs = await prisma.purchaseOrder.findMany({
    where: {
      poNumber: { startsWith: `${SEED_PREFIX}-PO-` },
      orderDate: { gte: startOfMonth },
      status: { not: 'CANCELLED' },
    },
  });

  let purchaseTotal = monthPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);

  if (purchaseTotal === 0) {
    const recentPOs = await prisma.purchaseOrder.findMany({
      where: { poNumber: { startsWith: `${SEED_PREFIX}-PO-` }, status: { not: 'CANCELLED' } },
      take: 12,
      orderBy: { orderDate: 'desc' },
    });
    const share = DASHBOARD_TARGETS.purchases / Math.max(recentPOs.length, 1);
    for (const po of recentPOs) {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          orderDate: randomDateInCurrentMonth(now),
          totalAmount: Number(share.toFixed(2)),
        },
      });
    }
    purchaseTotal = share * recentPOs.length;
  } else if (purchaseTotal > DASHBOARD_TARGETS.purchases) {
    const factor = DASHBOARD_TARGETS.purchases / purchaseTotal;
    for (const po of monthPOs) {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { totalAmount: Number((Number(po.totalAmount) * factor).toFixed(2)) },
      });
    }
    purchaseTotal = DASHBOARD_TARGETS.purchases;
  }

  const monthExpenses = await prisma.expense.findMany({
    where: {
      title: { startsWith: `${SEED_PREFIX}-EXP-` },
      date: { gte: startOfMonth },
    },
    orderBy: { amount: 'desc' },
  });

  let expenseTotal = monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (expenseTotal === 0) {
    const recentExpenses = await prisma.expense.findMany({
      where: { title: { startsWith: `${SEED_PREFIX}-EXP-` } },
      take: 20,
      orderBy: { amount: 'desc' },
    });
    const share = DASHBOARD_TARGETS.expenses / Math.max(recentExpenses.length, 1);
    for (const exp of recentExpenses) {
      await prisma.expense.update({
        where: { id: exp.id },
        data: { date: randomDateInCurrentMonth(now), amount: Number(share.toFixed(2)) },
      });
    }
    expenseTotal = share * recentExpenses.length;
  } else if (expenseTotal > DASHBOARD_TARGETS.expenses) {
    let excess = expenseTotal - DASHBOARD_TARGETS.expenses;
    for (const exp of monthExpenses) {
      if (excess <= 0) break;
      const prev = new Date(startOfMonth);
      prev.setDate(prev.getDate() - randInt(3, 25));
      await prisma.expense.update({ where: { id: exp.id }, data: { date: prev } });
      excess -= Number(exp.amount);
      expenseTotal -= Number(exp.amount);
    }
  }

  await clearDemoDashOrders(prisma);

  const revAgg = await prisma.order.aggregate({
    where: {
      createdAt: { gte: startOfMonth },
      status: { in: ['COMPLETED', 'SERVED'] },
    },
    _sum: { total: true },
  });
  let revenueTotal = Number(revAgg._sum.total || 0);
  const revenueGap = DASHBOARD_TARGETS.revenue - revenueTotal;

  if (revenueGap > 10000 && menuItemList.length && waiters.length) {
    const popularItems = menuItemList.slice(0, 20);
    const avgTicket = 1150;
    const ordersNeeded = Math.ceil(revenueGap / avgTicket);

    for (let i = 0; i < ordersNeeded; i++) {
      const createdAt = randomDateInCurrentMonth(now);
      const itemCount = randInt(2, 4);
      const selected = [];
      for (let j = 0; j < itemCount; j++) {
        selected.push(pick(popularItems));
      }

      const items = selected.map((mi) => {
        const qty = randInt(1, 3);
        const price = Number(mi.price);
        return {
          menuItemId: mi.id,
          quantity: qty,
          unitPrice: price,
          total: price * qty,
          status: 'COMPLETED',
        };
      });

      const subtotal = items.reduce((sum, it) => sum + Number(it.total), 0);
      const discount = Math.random() < 0.1 ? randFloat(20, subtotal * 0.08) : 0;
      const taxable = subtotal - discount;
      const tax = Number((taxable * 0.05).toFixed(2));
      const total = Number((taxable + tax).toFixed(2));

      const order = await prisma.order.create({
        data: {
          orderNumber: `${SEED_PREFIX}-DASH-ORD-${String(i + 1).padStart(4, '0')}`,
          status: 'COMPLETED',
          type: pick(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
          tableId: Math.random() < 0.6 ? pick(tables).id : null,
          customerId: Math.random() < 0.65 ? pick(customers).id : null,
          waiterId: pick(waiters).id,
          subtotal,
          tax,
          discount,
          total,
          createdAt,
          items: { create: items },
        },
      });

      await prisma.bill.create({
        data: {
          billNumber: `${SEED_PREFIX}-DASH-BILL-${String(i + 1).padStart(4, '0')}`,
          orderId: order.id,
          customerId: order.customerId,
          subtotal,
          tax,
          discount,
          total,
          status: 'PAID',
          createdAt,
        },
      });

      revenueTotal += total;
    }
  }

  const profit = revenueTotal - expenseTotal - purchaseTotal;
  console.log(
    `  Month snapshot — revenue ₹${Math.round(revenueTotal).toLocaleString('en-IN')}, ` +
    `expenses ₹${Math.round(expenseTotal).toLocaleString('en-IN')}, ` +
    `purchases ₹${Math.round(purchaseTotal).toLocaleString('en-IN')}, ` +
    `profit ₹${Math.round(profit).toLocaleString('en-IN')}`
  );
}

module.exports = { seedSystem, tuneAiData, tuneDashboardProfit };
