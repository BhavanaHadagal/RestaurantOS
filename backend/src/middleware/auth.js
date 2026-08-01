const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, isOwner } = require('../config/permissions');
const { ensureUserRestaurant, runWithTenant } = require('../lib/tenant');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  if (decoded.role && user.role.name !== decoded.role) {
    throw new AppError('Token role mismatch. Please login again', 401);
  }

  req.user = user;
  req.role = user.role.name;
  req.permissions = user.role.permissions.map((rp) => rp.permission.name);
  req.restaurantId = await ensureUserRestaurant(user);

  runWithTenant(req.restaurantId, () => next());
});

const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.permissions) {
      return next(new AppError('Authentication required', 401));
    }

    if (isOwner(req.role)) return next();

    const hasPermission = requiredPermissions.some((p) => req.permissions.includes(p));
    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.role) {
      return next(new AppError('Authentication required', 401));
    }

    if (isOwner(req.role)) return next();

    if (!allowedRoles.includes(req.role)) {
      return next(new AppError('Access denied for your role', 403));
    }
    next();
  };
};

const authorizeOwnerOnly = (req, res, next) => {
  if (req.role !== ROLES.OWNER) {
    return next(new AppError('Only the Owner can perform this action', 403));
  }
  next();
};

const bindTenant = (req, res, next) => {
  if (!req.restaurantId) {
    return next(new AppError('Restaurant workspace not configured', 403));
  }
  runWithTenant(req.restaurantId, () => next());
};

module.exports = {
  authenticate,
  bindTenant,
  authorize,
  authorizeRoles,
  authorizeOwnerOnly,
};
