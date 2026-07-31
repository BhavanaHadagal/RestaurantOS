import MENU_ITEM_PHOTOS from '../../../shared/menuFoodPhotos.json';

const FOOD_PHOTOS = {
  pizza: '1565299624946-b28f40a0ae38',
  pasta: '1563379926898-05f4575a45d8',
  indianCurry: '1710091691780-c7eb0dc50cf8',
  biryaniRice: '1772469597765-ff29d5616fb7',
  asian: '1559339352-11d035aa65de',
  soup: '1547592166-23ac45744acd',
  salad: '1546069901-ba9599a7e63c',
  grilled: '1546833999-b9f581a1996d',
  dessert: '1551024506-0bccd828d307',
  beverage: '1414235077428-338989a2e8c0',
  burger: '1555939594-58d7cb561ad1',
  spread: '1504674900247-0877df9cc836',
};

const FOOD_PHOTO_POOL = Object.values(FOOD_PHOTOS);

const FOOD_RULES = [
  { match: /\b(pizza|margherita)\b/i, photo: FOOD_PHOTOS.pizza },
  { match: /\b(pasta|penne|alfredo|lasagna|risotto|arrabiata|fettuccine|minestrone)\b/i, photo: FOOD_PHOTOS.pasta },
  { match: /\b(biryani|pulao|jeera rice|coconut rice|fried rice|schezwan|idli|sambar)\b/i, photo: FOOD_PHOTOS.biryaniRice },
  { match: /\b(dosa|vada|medu|pav bhaji|bhaji|bhature|chole|butter chicken|paneer|dal|curry|rogan|kofta|palak|masala|raita|pickle|papad|achar|thali|naan|roti)\b/i, photo: FOOD_PHOTOS.indianCurry },
  { match: /\b(tandoori|kebab|tikka|steak|grilled|tempura|prawn|fish)\b/i, photo: FOOD_PHOTOS.grilled },
  { match: /\b(soup|tom yum|manchow)\b/i, photo: FOOD_PHOTOS.soup },
  { match: /\b(salad|kachumber)\b/i, photo: FOOD_PHOTOS.salad },
  { match: /\b(noodle|hakka|dim sum|manchurian|chilli chicken|kung pao|chinese)\b/i, photo: FOOD_PHOTOS.asian },
  { match: /\b(brownie|gulab|jamun|ice cream|sundae|rasmalai|tiramisu|cheesecake|affogato|dessert)\b/i, photo: FOOD_PHOTOS.dessert },
  { match: /\b(coffee|chai|lassi|mojito|tea|soda|colada|beverage|juice|mocktail)\b/i, photo: FOOD_PHOTOS.beverage },
  { match: /\b(burger|sandwich|wrap|club)\b/i, photo: FOOD_PHOTOS.burger },
  { match: /\b(samosa|spring roll|corn|starter|platter|brunch|combo|meal|lunch box)\b/i, photo: FOOD_PHOTOS.spread },
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

function unsplashUrl(photoId, width, height, extra = '') {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&h=${height}&fit=crop&q=80${extra}`;
}

function matchFoodPhotoId(name = '', category = '') {
  if (MENU_ITEM_PHOTOS[name]) return MENU_ITEM_PHOTOS[name];

  const text = `${name} ${category}`.toLowerCase();

  for (const rule of FOOD_RULES) {
    if (rule.match.test(text)) return rule.photo;
  }

  const cat = category.toLowerCase();
  if (cat.includes('indian')) return FOOD_PHOTOS.indianCurry;
  if (cat.includes('chinese')) return FOOD_PHOTOS.asian;
  if (cat.includes('italian')) return FOOD_PHOTOS.pasta;
  if (cat.includes('soup')) return FOOD_PHOTOS.soup;
  if (cat.includes('salad')) return FOOD_PHOTOS.salad;
  if (cat.includes('beverage')) return FOOD_PHOTOS.beverage;
  if (cat.includes('dessert')) return FOOD_PHOTOS.dessert;
  if (cat.includes('combo')) return FOOD_PHOTOS.spread;
  if (cat.includes('starter')) return FOOD_PHOTOS.spread;
  if (cat.includes('main')) return FOOD_PHOTOS.grilled;

  return FOOD_PHOTO_POOL[hashString(name) % FOOD_PHOTO_POOL.length];
}

export function getMenuImageUrl(name = 'dish', category = '', width = 400, height = 300) {
  const photoId = matchFoodPhotoId(name, category);
  return unsplashUrl(photoId, width, height);
}

export function resolveMenuImageUrl(name, category, storedUrl, width = 400, height = 300) {
  if (storedUrl && !storedUrl.includes('unsplash.com') && !storedUrl.includes('picsum.photos')) {
    return storedUrl;
  }
  return getMenuImageUrl(name, category, width, height);
}

export function getFoodImageUrl(name = 'dish', width = 400, height = 300) {
  return getMenuImageUrl(name, '', width, height);
}

export function getProductImageUrl(sku = 'product', width = 300, height = 300) {
  const photoId = FOOD_PHOTO_POOL[hashString(sku) % FOOD_PHOTO_POOL.length];
  return unsplashUrl(photoId, width, height, '&sat=-20');
}

/** Deterministic placeholder when remote food photos fail to load. */
export function getPlaceholderImageUrl(seed = 'food', width = 300, height = 300) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export function resolveImageUrl(src, fallbackName) {
  if (src) return src;
  return getFoodImageUrl(fallbackName);
}

export function getAvatarUrl(seed = 'user') {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function resolveImageFallbacks(src, fallbackName, width = 300, height = 300, category = '') {
  const primary = src || getMenuImageUrl(fallbackName, category, width, height);
  const alternate = getMenuImageUrl(`${fallbackName}-alt`, category, width, height);
  const placeholder = getPlaceholderImageUrl(fallbackName || 'food', width, height);
  return [...new Set([primary, alternate, placeholder])];
}
