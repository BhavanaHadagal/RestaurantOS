const prisma = require('../config/database');
const { hashPassword } = require('./authService');
const AppError = require('../utils/AppError');
const { ROLES } = require('../config/permissions');
const { buildPagination, buildPaginatedResponse, buildSort, buildSearchFilter } = require('../utils/pagination');
const { createCrudService } = require('../utils/crudFactory');
const { tenantWhere, getRestaurantId } = require('../lib/tenant');

const protectOwnerAccount = async (targetUserId, actorRole) => {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });
  if (!target) throw new AppError('Staff member not found', 404);
  if (target.role.name === ROLES.OWNER && actorRole !== ROLES.OWNER) {
    throw new AppError('Cannot modify the Owner account', 403);
  }
  return target;
};

const staffService = {
  async getAll(query = {}, restaurantId) {
    const { page, limit, sortBy, sortOrder, search, roleId } = query;
    const pagination = buildPagination(page, limit);
    const where = tenantWhere({
      ...buildSearchFilter(search, ['firstName', 'lastName', 'email']),
      ...(roleId && { roleId }),
    }, restaurantId);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildSort(sortBy, sortOrder),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          roleId: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, pagination.page, pagination.limit);
  },

  async getById(id, restaurantId) {
    const user = await prisma.user.findFirst({
      where: tenantWhere({ id }, restaurantId),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        roleId: true,
        role: { include: { permissions: { include: { permission: true } } } },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new AppError('Staff member not found', 404);
    return user;
  },

  async create(data, actorRole, restaurantId) {
    if (actorRole !== ROLES.OWNER) {
      throw new AppError('Only the Owner can add staff', 403);
    }
    const ownerRole = await prisma.role.findUnique({ where: { name: ROLES.OWNER } });
    if (data.roleId === ownerRole?.id) {
      throw new AppError('Cannot assign Owner role through this endpoint', 403);
    }
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already in use', 409);

    const hashed = await hashPassword(data.password);
    return prisma.user.create({
      data: { ...data, password: hashed, restaurantId: getRestaurantId(restaurantId) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roleId: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async update(id, data, actorRole, restaurantId) {
    await protectOwnerAccount(id, actorRole);
    if (data.roleId) {
      const ownerRole = await prisma.role.findUnique({ where: { name: ROLES.OWNER } });
      if (data.roleId === ownerRole?.id && actorRole !== ROLES.OWNER) {
        throw new AppError('Cannot assign Owner role', 403);
      }
    }
    await this.getById(id, restaurantId);
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roleId: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  },

  async remove(id, actorRole, restaurantId) {
    await protectOwnerAccount(id, actorRole);
    await this.getById(id, restaurantId);
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },
};

const notificationService = {
  async getForUser(userId, query = {}) {
    const { page = 1, limit = 20, unreadOnly } = query;
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(unreadOnly === 'true' && { isRead: false }),
    };

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, pagination: { total, page: Number(page), limit: Number(limit) }, unreadCount };
  },

  async markAsRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async create(userId, data) {
    return prisma.notification.create({
      data: { userId, ...data },
    });
  },
};

const menuService = {
  ...createCrudService('menuItem', {
    searchFields: ['name', 'description'],
    include: { category: true, recipe: { include: { ingredients: { include: { ingredient: true } } } } },
  }),

  async createWithRecipe(data, restaurantId) {
    const { ingredients, instructions, ...menuData } = data;
    return prisma.menuItem.create({
      data: {
        ...menuData,
        restaurantId,
        recipe: {
          create: {
            instructions,
            ingredients: {
              create: ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: ing.quantity,
              })),
            },
          },
        },
      },
      include: {
        category: true,
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
      },
    });
  },
};

module.exports = { staffService, notificationService, menuService };
