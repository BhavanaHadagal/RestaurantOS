const AppError = require('../utils/AppError');

const createRateLimiter = (maxRequests = 100, windowMs = 60 * 1000) => {
  const hits = new Map();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > maxRequests) {
      return next(new AppError('Too many requests. Please try again later', 429));
    }

    next();
  };
};

const authRateLimiter = createRateLimiter(20, 15 * 60 * 1000);

module.exports = { createRateLimiter, authRateLimiter };
