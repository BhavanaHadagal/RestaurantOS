const { AsyncLocalStorage } = require('async_hooks');
const prisma = require('../config/database');
const logger = require('../config/logger');

const DEMO_SLUG = 'spice-route-demo';
const DEMO_ACCOUNT_EMAILS = new Set([
  'owner@restaurantos.com',
  'manager@restaurantos.com',
  'chef@restaurantos.com',
  'waiter@restaurantos.com',
  'cashier@restaurantos.com',
  'manager2@demo.restaurantos.in',
  'chef2@demo.restaurantos.in',
  'chef3@demo.restaurantos.in',
  'chef4@demo.restaurantos.in',
  'waiter2@demo.restaurantos.in',
  'waiter3@demo.restaurantos.in',
  'waiter4@demo.restaurantos.in',
  'waiter5@demo.restaurantos.in',
  'waiter6@demo.restaurantos.in',
  'cashier2@demo.restaurantos.in',
  'cashier3@demo.restaurantos.in',
]);

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

const IMPOSSIBLE_RESTAURANT_ID = '00000000-0000-0000-0000-000000000000';

function getRestaurantId(explicitId) {
  if (explicitId) return explicitId;
  return tenantStorage.getStore()?.restaurantId ?? null;
}

function tenantWhere(where = {}, explicitRestaurantId) {
  const restaurantId = getRestaurantId(explicitRestaurantId);
  if (!restaurantId) {
    return { ...where, restaurantId: IMPOSSIBLE_RESTAURANT_ID };
  }
  return { ...where, restaurantId };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isDemoEmail(email) {
  return DEMO_ACCOUNT_EMAILS.has(normalizeEmail(email));
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

  const currentRestaurant = user.restaurantId
    ? await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { id: true, isDemo: true },
    })
    : null;

  const needsPersonalWorkspace =
    !user.restaurantId
    || user.restaurantId === demo.id
    || currentRestaurant?.isDemo;

  if (needsPersonalWorkspace) {
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

async function repairMisplacedUsers(demo) {
  const demoEmails = [...DEMO_ACCOUNT_EMAILS];
  const misplaced = await prisma.user.findMany({
    where: {
      restaurantId: demo.id,
      NOT: { email: { in: demoEmails } },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      restaurantName: true,
    },
  });

  for (const user of misplaced) {
    const restaurant = await createPersonalRestaurant(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { restaurantId: restaurant.id },
    });
    logger.info('Moved signup user off demo workspace', {
      userId: user.id,
      email: user.email,
      restaurantId: restaurant.id,
    });
  }

  return misplaced.length;
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
      email: { in: [...DEMO_ACCOUNT_EMAILS] },
      NOT: { restaurantId: demo.id },
    },
    data: { restaurantId: demo.id },
  });
  if (users.count > 0) {
    logger.info('Linked demo users to demo restaurant', { count: users.count });
  }

  const repaired = await repairMisplacedUsers(demo);
  if (repaired > 0) {
    logger.info('Repaired non-demo users assigned to demo workspace', { count: repaired });
  }
}

function attachWorkspaceMeta(user) {
  return {
    ...user,
    isDemoWorkspace: isDemoEmail(user.email),
  };
}

module.exports = {
  DEMO_SLUG,
  DEMO_ACCOUNT_EMAILS,
  IMPOSSIBLE_RESTAURANT_ID,
  runWithTenant,
  getRestaurantId,
  tenantWhere,
  isDemoEmail,
  normalizeEmail,
  getOrCreateDemoRestaurant,
  createPersonalRestaurant,
  ensureUserRestaurant,
  ensureDemoDataBackfill,
  repairMisplacedUsers,
  attachWorkspaceMeta,
};
