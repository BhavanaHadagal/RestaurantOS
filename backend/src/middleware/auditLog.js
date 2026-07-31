const prisma = require('../config/database');
const logger = require('../config/logger');

const auditLog = (action, module) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode < 400 && req.user) {
        prisma.activityLog
          .create({
            data: {
              userId: req.user.id,
              action,
              module,
              details: {
                method: req.method,
                path: req.originalUrl,
                role: req.role,
              },
              ipAddress: req.ip,
            },
          })
          .catch((err) => logger.error('Audit log failed', { message: err.message }));
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = auditLog;
