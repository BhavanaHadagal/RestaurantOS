const { AsyncLocalStorage } = require('async_hooks');
const prisma = require('../config/database');
const logger = require('../config/logger');

const DEMO_SLUG = 'spice-route-demo';
const DEMO_EMAIL_SUFFIX = '@restaurantos.com';

const tenantStorage = new AsyncLocalStorage();

const TENANT_MODELS = [
  'table',
  'reservation',
  'menuCategory',
  'menuItem',
  'ingredient',
  'supplier',
  'customer',
  'order',
  'bill',
  'productCategory',
  'product',
  'warehouse',
  'purchaseOrder',
  'expenseCategory',
  'expense',
  'supplierInvoice',
  'stockMovement',
];

function runWithTenant(restaurantId, callback) {
  return tenantStorage.run({ restaurantId }, callback);
}

function getRestaurantId() {
  return tenantStorage.getStore()?.restaurantId ?? null;
}

function tenantWhere(where = {}) {
  const restaurantId = getRestaurantId();
  if (!restaurantId) return where;
  return { ...where, restaurantId };
}

function isDemoEmail(email) {
  return String(email || '').toLowerCase().endsWith(DEMO_EMAIL_SUFFIX);
}

async function getOrCreateDemoRestaurant() {
  let demo = await prisma.restaurant.findUnique({ where: { slug: DEMO_SLUG } });
  if (!demo) {
    demo = await prisma.restaurant.create({
      data: {
        name: 'Spice Route Kitchen (Demo)',
        slug: DEMO_SLUG,
        isDemo: true,
      },
    });
    logger.info('Created demo restaurant tenant', { id: demo.id });
  }
  return demo;
}

async function createPersonalRestaurant(user) {
  const baseSlug = String(user.email || user.id)
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';

  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return prisma.restaurant.create({
    data: {
      name: user.restaurantName?.trim() || `${user.firstName}'s Restaurant`,
      slug,
      isDemo: false,
    },
  });
}

async function ensureUserRestaurant(user) {
  const demo = await getOrCreateDemoRestaurant();

  if (isDemoEmail(user.email)) {
    if (user.restaurantId !== demo.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { restaurantId: demo.id },
      });
      user.restaurantId = demo.id;
    }
    return demo.id;
  }

  if (!user.restaurantId || user.restaurantId === demo.id) {
    const restaurant = await createPersonalRestaurant(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { restaurantId: restaurant.id },
    });
    user.restaurantId = restaurant.id;
    logger.info('Assigned personal restaurant workspace', {
      userId: user.id,
      email: user.email,
      restaurantId: restaurant.id,
    });
  }

  return user.restaurantId;
}

async function ensureDemoDataBackfill() {
  const demo = await getOrCreateDemoRestaurant();

  for (const model of TENANT_MODELS) {
    const result = await prisma[model].updateMany({
      where: { restaurantId: null },
      data: { restaurantId: demo.id },
    });
    if (result.count > 0) {
      logger.info('Backfilled demo tenant data', { model, count: result.count });
    }
  }

  const users = await prisma.user.updateMany({
    where: {
      email: { endsWith: DEMO_EMAIL_SUFFIX },
      NOT: { restaurantId: demo.id },
    },
    data: { restaurantId: demo.id },
  });
  if (users.count > 0) {
    logger.info('Linked demo users to demo restaurant', { count: users.count });
  }
}

module.exports = {
  DEMO_SLUG,
  DEMO_EMAIL_SUFFIX,
  runWithTenant,
  getRestaurantId,
  tenantWhere,
  isDemoEmail,
  getOrCreateDemoRestaurant,
  createPersonalRestaurant,
  ensureUserRestaurant,
  ensureDemoDataBackfill,
};
