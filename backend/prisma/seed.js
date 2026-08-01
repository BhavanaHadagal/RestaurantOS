const { PrismaClient } = require('@prisma/client');
const { getOrCreateDemoRestaurant, ensureDemoDataBackfill } = require('../src/lib/tenant');
const { seedFoundation } = require('./seeds/foundation');
const { seedCatalog } = require('./seeds/catalog');
const { seedOperations } = require('./seeds/operations');
const { seedTransactions } = require('./seeds/transactions');
const { seedFinance } = require('./seeds/finance');
const { seedSystem, tuneAiData, tuneDashboardProfit } = require('./seeds/system');
const { RESTAURANT, MENU_ITEMS } = require('./seeds/constants');
const { DEFAULT_PASSWORD } = require('./seeds/helpers');

const prisma = new PrismaClient();

async function printSummary() {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.table.count(),
    prisma.customer.count(),
    prisma.menuItem.count(),
    prisma.ingredient.count(),
    prisma.supplier.count(),
    prisma.product.count(),
    prisma.stockMovement.count(),
    prisma.purchaseOrder.count(),
    prisma.order.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.supplierInvoice.count(),
    prisma.notification.count(),
    prisma.activityLog.count(),
    prisma.recipe.count(),
  ]);

  const labels = [
    'Users', 'Tables', 'Customers', 'Menu Items', 'Ingredients', 'Suppliers',
    'Products', 'Stock Movements', 'Purchase Orders', 'Orders', 'Payments',
    'Expenses', 'Supplier Invoices', 'Notifications', 'Activity Logs', 'Recipes',
  ];

  console.log('\n══════════════════════════════════════════');
  console.log('  RestaurantOS Demo Seed — Summary');
  console.log('══════════════════════════════════════════');
  console.log(`  Restaurant : ${RESTAURANT.name}`);
  console.log(`  Location   : ${RESTAURANT.location}`);
  console.log(`  GST        : ${RESTAURANT.gstNumber}`);
  console.log(`  Phone      : ${RESTAURANT.phone}`);
  console.log(`  Email      : ${RESTAURANT.email}`);
  console.log(`  Hours      : ${RESTAURANT.businessHours}`);
  console.log('──────────────────────────────────────────');
  labels.forEach((label, i) => console.log(`  ${label.padEnd(20)} ${counts[i]}`));
  console.log(`  ${'Total Records'.padEnd(20)} ${counts.reduce((a, b) => a + b, 0)}`);
  console.log('══════════════════════════════════════════');
  console.log('\nDefault login credentials:');
  console.log('  Owner   : owner@restaurantos.com');
  console.log('  Manager : manager@restaurantos.com');
  console.log('  Chef    : chef@restaurantos.com');
  console.log('  Waiter  : waiter@restaurantos.com');
  console.log('  Cashier : cashier@restaurantos.com');
  console.log(`  Password: ${DEFAULT_PASSWORD}`);
  console.log(`\nMenu items seeded: ${MENU_ITEMS.length}+`);
  console.log('Re-run safely — idempotent via upserts & ROS- prefixes.\n');
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  RestaurantOS — Comprehensive Demo Seed  ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const startTime = Date.now();

  const demoRestaurant = await getOrCreateDemoRestaurant();
  const foundation = await seedFoundation(prisma, demoRestaurant.id);
  const catalog = await seedCatalog(prisma);
  const ctx = { ...foundation, ...catalog, demoRestaurantId: demoRestaurant.id };

  const ops = await seedOperations(prisma, ctx);
  Object.assign(ctx, ops);
  await seedTransactions(prisma, ctx);
  await seedFinance(prisma, ctx);
  await seedSystem(prisma, ctx);
  await tuneAiData(prisma, ctx);
  await tuneDashboardProfit(prisma, ctx);

  await ensureDemoDataBackfill();

  await printSummary();
  console.log(`Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
