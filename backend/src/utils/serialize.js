/**
 * Safe JSON serialization for Prisma models (Decimal, BigInt, circular refs).
 */
function serializeForJson(value) {
  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') return val.toString();
      if (val && typeof val === 'object') {
        if (seen.has(val)) return undefined;
        seen.add(val);
        if (val.constructor?.name === 'Decimal') return Number(val);
      }
      return val;
    })
  );
}

function sendJson(res, payload, statusCode = 200) {
  res.status(statusCode).json(serializeForJson(payload));
}

module.exports = { serializeForJson, sendJson };
