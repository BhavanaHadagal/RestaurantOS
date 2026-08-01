const config = require('./index');

function parseAllowedOrigins() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin) {
  if (!origin) return true;

  if (parseAllowedOrigins().includes(origin)) return true;

  if (config.nodeEnv === 'production') {
    try {
      const { hostname } = new URL(origin);
      if (hostname.endsWith('.vercel.app')) return true;
    } catch {
      return false;
    }
  }

  return false;
}

function corsOrigin(origin, callback) {
  callback(null, isOriginAllowed(origin));
}

module.exports = {
  parseAllowedOrigins,
  isOriginAllowed,
  corsOrigin,
};
