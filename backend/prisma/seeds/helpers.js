const SEED_PREFIX = 'ROS';
const DEMO_DOMAIN = 'demo.restaurantos.in';
const DEFAULT_PASSWORD = 'Password@123';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));

const monthsAgo = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59), 0);
  return d;
};

const randomDateInRange = (start, end = new Date()) => {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return new Date(startMs + Math.random() * (endMs - startMs));
};

const sixMonthsAgo = () => monthsAgo(6);

const avatarUrl = (seed) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

const { menuImageUrl } = require('./foodImages');

const productImageUrl = (sku) =>
  `https://placehold.co/300x300/16213e/0f3460?text=${encodeURIComponent(sku)}`;

const gstForIndex = (i) => {
  const state = String(29 + (i % 10)).padStart(2, '0');
  return `${state}AABCR${String(1000 + i).slice(-4)}F1Z${i % 10}`;
};

const phoneForIndex = (i) => `+91 ${80 + (i % 10)}${String(10000000 + i).slice(-8)}`;

const batchRun = async (total, batchSize, fn) => {
  for (let i = 0; i < total; i += batchSize) {
    const end = Math.min(i + batchSize, total);
    await fn(i, end);
    if (end % 200 === 0 || end === total) {
      process.stdout.write(`  ${end}/${total}\r`);
    }
  }
  process.stdout.write('\n');
};

/** Attach demo restaurant id — seed data is for demo credentials only. */
function withDemoTenant(demoRestaurantId, data) {
  return { ...data, restaurantId: demoRestaurantId };
}

module.exports = {
  SEED_PREFIX,
  DEMO_DOMAIN,
  DEFAULT_PASSWORD,
  pick,
  pickN,
  randInt,
  randFloat,
  monthsAgo,
  randomDateInRange,
  sixMonthsAgo,
  avatarUrl,
  menuImageUrl,
  productImageUrl,
  gstForIndex,
  phoneForIndex,
  batchRun,
  withDemoTenant,
};
