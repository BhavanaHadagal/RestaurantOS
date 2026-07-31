const MENU_ITEM_PHOTOS = require('../../../shared/menuFoodPhotos.json');

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

const matchFoodPhotoId = (name = '', category = '') => {
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
};

const menuImageUrl = (name, category = '') => {
  const id = matchFoodPhotoId(name, category);
  return `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&q=80`;
};

module.exports = { menuImageUrl, matchFoodPhotoId, MENU_ITEM_PHOTOS };
