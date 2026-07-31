const {
  SEED_PREFIX, pick, randInt, randFloat, randomDateInRange, sixMonthsAgo, batchRun,
} = require('./helpers');
const { FIRST_NAMES, LAST_NAMES } = require('./constants');

async function seedOperations(prisma, ctx) {
  console.log('→ Operations (tables, customers, reservations, POs, stock movements)');

  const { supplierIds, warehouseMap, productList, ingredientList, usersByRole, owner } = ctx;
  const warehouseIds = Object.values(warehouseMap).map((w) => w.id);
  const start = sixMonthsAgo();

  const tableStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];
  const capacities = [2, 2, 4, 4, 4, 6, 6, 8, 8];
  const locations = ['Indoor', 'Indoor', 'Indoor', 'Outdoor', 'Outdoor', 'Private Room', 'Bar Area'];

  const tables = [];
  for (let i = 1; i <= 40; i++) {
    const saved = await prisma.table.upsert({
      where: { number: i },
      update: {
        status: pick(tableStatuses),
        capacity: capacities[i % capacities.length],
      },
      create: {
        number: i,
        capacity: capacities[i % capacities.length],
        status: pick(tableStatuses),
        location: pick(locations),
      },
    });
    tables.push(saved);
  }

  const customers = [];
  for (let i = 1; i <= 300; i++) {
    const email = `customer${String(i).padStart(3, '0')}@demo.restaurantos.in`;
    const visits = randInt(1, 50);
    const loyalty = visits * randInt(10, 50);
    const saved = await prisma.customer.upsert({
      where: { email },
      update: {},
      create: {
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        email,
        phone: `+91 9${String(100000000 + i).slice(-9)}`,
        address: `${randInt(1, 500)} ${pick(['Koramangala', 'HSR Layout', 'Jayanagar', 'Malleshwaram'])}, Bengaluru`,
        notes: `Visit frequency: ${visits}x | Loyalty points: ${loyalty}`,
        createdAt: randomDateInRange(start),
      },
    });
    customers.push(saved);
  }

  const managers = usersByRole.managers;
  await prisma.reservation.deleteMany({ where: { customerEmail: { startsWith: 'res' } } });
  for (let i = 0; i < 40; i++) {
    const date = randomDateInRange(new Date(), new Date(Date.now() + 14 * 86400000));
    await prisma.reservation.create({
      data: {
        customerName: pick(customers).name,
        customerPhone: `+91 9${randInt(100000000, 999999999)}`,
        customerEmail: `res${i}@demo.restaurantos.in`,
        partySize: randInt(2, 10),
        date,
        time: `${randInt(11, 21)}:${pick(['00', '30'])}`,
        status: pick(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
        tableId: pick(tables).id,
        createdById: pick(managers).id,
        notes: i % 5 === 0 ? 'Birthday celebration — cake required' : null,
      },
    });
  }

  const poStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED'];
  const purchaseOrders = [];

  await batchRun(100, 10, async (from, to) => {
    for (let i = from; i < to; i++) {
      const poNumber = `${SEED_PREFIX}-PO-${String(i + 1).padStart(5, '0')}`;
      const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
      if (existing) {
        purchaseOrders.push(existing);
        continue;
      }

      const orderDate = randomDateInRange(start);

      const items = pickNProducts(productList, randInt(2, 5));
      let total = 0;
      const itemData = items.map((p) => {
        const qty = randFloat(1, 15);
        const price = Number(p.costPrice);
        const line = qty * price;
        total += line;
        return {
          productId: p.id,
          quantity: qty,
          unitPrice: price,
          total: Number(line.toFixed(2)),
        };
      });

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: pick(supplierIds),
          status: pick(poStatuses),
          totalAmount: Number(total.toFixed(2)),
          orderDate,
          expectedDate: randomDateInRange(new Date(), new Date(Date.now() + 30 * 86400000)),
          createdAt: orderDate,
          createdById: owner.id,
          notes: i % 10 === 0 ? 'Urgent — low stock replenishment' : null,
          items: { create: itemData },
        },
      });
      purchaseOrders.push(po);
    }
  });

  const movementTypes = ['STOCK_IN', 'STOCK_OUT', 'DAMAGED', 'EXPIRED', 'ADJUSTMENT'];
  const movementBatch = [];

  for (let i = 0; i < 500; i++) {
    const useProduct = Math.random() > 0.35;
    const type = pick(movementTypes);
    const createdAt = randomDateInRange(start);

    if (useProduct && productList.length) {
      const prod = pick(productList);
      movementBatch.push({
        type,
        productId: prod.id,
        warehouseId: prod.warehouseId || pick(warehouseIds),
        quantity: randFloat(0.5, 30),
        reason: `${type.replace('_', ' ').toLowerCase()} — ${pick(['Delivery', 'Kitchen usage', 'Audit', 'Spoilage', 'Transfer'])}`,
        reference: `${SEED_PREFIX}-SM-${String(i + 1).padStart(5, '0')}`,
        createdAt,
      });
    } else if (ingredientList.length) {
      const ing = pick(ingredientList);
      movementBatch.push({
        type,
        ingredientId: ing.id,
        warehouseId: pick(warehouseIds),
        quantity: randFloat(0.1, 15),
        reason: `${type.replace('_', ' ').toLowerCase()} — ${pick(['Prep waste', 'Expiry', 'Restock', 'Correction'])}`,
        reference: `${SEED_PREFIX}-SM-${String(i + 1).padStart(5, '0')}`,
        createdAt,
      });
    }
  }

  const existingMovements = await prisma.stockMovement.count({
    where: { reference: { startsWith: `${SEED_PREFIX}-SM-` } },
  });
  if (existingMovements < 500) {
    await prisma.stockMovement.deleteMany({ where: { reference: { startsWith: `${SEED_PREFIX}-SM-` } } });
    for (let i = 0; i < movementBatch.length; i += 50) {
      await prisma.stockMovement.createMany({ data: movementBatch.slice(i, i + 50) });
    }
  }

  return { tables, customers, purchaseOrders };
}

function pickNProducts(list, n) {
  const copy = [...list];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

module.exports = { seedOperations };
