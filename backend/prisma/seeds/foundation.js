const bcrypt = require('bcrypt');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../../src/config/permissions');
const {
  DEFAULT_PASSWORD, DEMO_DOMAIN, avatarUrl, phoneForIndex, pick, randInt, monthsAgo,
} = require('./helpers');
const { FIRST_NAMES, LAST_NAMES } = require('./constants');

async function seedFoundation(prisma, demoRestaurantId) {
  console.log('→ Foundation (RBAC & users)');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  const roleMap = {};
  for (const name of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
    roleMap[name] = role.id;
  }

  const allPermissions = await prisma.permission.findMany();
  const permMap = Object.fromEntries(allPermissions.map((p) => [p.name, p.id]));

  await prisma.rolePermission.deleteMany({});
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permName of perms) {
      const permissionId = permMap[permName];
      if (permissionId) {
        await prisma.rolePermission.create({
          data: { roleId: roleMap[roleName], permissionId },
        });
      }
    }
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  let nameIdx = 0;
  const nextName = () => {
    const fn = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(nameIdx / FIRST_NAMES.length) % LAST_NAMES.length];
    nameIdx++;
    return { firstName: fn, lastName: ln };
  };

  const userDefs = [
    { email: 'owner@restaurantos.com', role: ROLES.OWNER, ...nextName(), phone: '+91 9876543210' },
    { email: 'manager@restaurantos.com', role: ROLES.MANAGER, ...nextName(), phone: '+91 9876543211' },
    { email: `manager2@${DEMO_DOMAIN}`, role: ROLES.MANAGER, ...nextName(), phone: '+91 9876543212' },
    { email: 'chef@restaurantos.com', role: ROLES.CHEF, ...nextName(), phone: '+91 9876543213' },
    { email: `chef2@${DEMO_DOMAIN}`, role: ROLES.CHEF, ...nextName(), phone: '+91 9876543214' },
    { email: `chef3@${DEMO_DOMAIN}`, role: ROLES.CHEF, ...nextName(), phone: '+91 9876543215' },
    { email: `chef4@${DEMO_DOMAIN}`, role: ROLES.CHEF, ...nextName(), phone: '+91 9876543216' },
    { email: 'waiter@restaurantos.com', role: ROLES.WAITER, ...nextName(), phone: '+91 9876543217' },
    ...Array.from({ length: 7 }, (_, i) => ({
      email: `waiter${i + 2}@${DEMO_DOMAIN}`,
      role: ROLES.WAITER,
      ...nextName(),
      phone: phoneForIndex(20 + i),
    })),
    { email: 'cashier@restaurantos.com', role: ROLES.CASHIER, ...nextName(), phone: '+91 9876543225' },
    { email: `cashier2@${DEMO_DOMAIN}`, role: ROLES.CASHIER, ...nextName(), phone: '+91 9876543226' },
    { email: `cashier3@${DEMO_DOMAIN}`, role: ROLES.CASHIER, ...nextName(), phone: '+91 9876543227' },
  ];

  const users = {};
  for (const u of userDefs) {
    const joinDate = monthsAgo(randInt(3, 24));
    const saved = await prisma.user.upsert({
      where: { email: u.email },
      update: { isActive: true, restaurantId: demoRestaurantId },
      create: {
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        avatar: avatarUrl(u.email),
        roleId: roleMap[u.role],
        restaurantId: demoRestaurantId,
        isActive: u.email === 'owner@restaurantos.com' ? true : Math.random() > 0.05,
        createdAt: joinDate,
      },
    });
    users[u.email] = saved;
  }

  const usersByRole = {
    owners: Object.values(users).filter((u) => u.email === 'owner@restaurantos.com'),
    managers: Object.values(users).filter((u) => u.email.includes('manager')),
    chefs: Object.values(users).filter((u) => u.email.includes('chef')),
    waiters: Object.values(users).filter((u) => u.email.includes('waiter')),
    cashiers: Object.values(users).filter((u) => u.email.includes('cashier')),
    all: Object.values(users),
  };

  return { roleMap, users, usersByRole, owner: users['owner@restaurantos.com'], demoRestaurantId };
}

module.exports = { seedFoundation };
