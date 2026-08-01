/**
 * Safe JSON serialization for Prisma models (Decimal, BigInt, etc.).
 */
function serializeForJson(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') return val.toString();
      if (val && typeof val === 'object' && val.constructor?.name === 'Decimal') {
        return Number(val);
      }
      return val;
    })
  );
}

module.exports = { serializeForJson };
