const {
  SEED_PREFIX, pick, pickN, randInt, randFloat, gstForIndex, phoneForIndex, menuImageUrl, withDemoTenant,
} = require('./helpers');
const {
  MENU_CATEGORIES, EXPENSE_CATEGORIES, PRODUCT_CATEGORIES, WAREHOUSES,
  INGREDIENT_BASES, MENU_ITEMS, SUPPLIER_NAMES,
} = require('./constants');

async function seedCatalog(prisma, demoRestaurantId) {
  console.log('→ Catalog (suppliers, warehouses, ingredients, menu, products)');

  const supplierMap = {};
  for (let i = 0; i < SUPPLIER_NAMES.length; i++) {
    const name = SUPPLIER_NAMES[i];
    const existing = await prisma.supplier.findFirst({ where: { restaurantId: demoRestaurantId, name } });
    const saved = existing || await prisma.supplier.create({
      data: withDemoTenant(demoRestaurantId, {
        name,
        email: `orders@${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}.com`,
        phone: phoneForIndex(i),
        address: `${randInt(1, 200)} ${pick(['MG Road', 'Brigade Road', 'Indiranagar', 'Koramangala', 'Whitefield'])}, Bengaluru`,
        gstNumber: gstForIndex(i),
        isActive: i < 28,
      }),
    });
    supplierMap[name] = saved.id;
  }
  const supplierIds = Object.values(supplierMap);

  const warehouseMap = {};
  for (const wh of WAREHOUSES) {
    const existing = await prisma.warehouse.findFirst({
      where: { restaurantId: demoRestaurantId, name: wh.name },
    });
    const saved = existing || await prisma.warehouse.create({
      data: withDemoTenant(demoRestaurantId, wh),
    });
    warehouseMap[wh.name] = saved;
  }

  const units = ['kg', 'liter', 'g', 'ml', 'bunch', 'piece', 'pack', 'can'];
  const ingredientMap = {};
  for (let i = 0; i < INGREDIENT_BASES.length; i++) {
    const name = INGREDIENT_BASES[i];
    const minStock = randFloat(2, 20);
    const currentStock = randFloat(minStock * 0.5, minStock * 8);
    const existing = await prisma.ingredient.findFirst({
      where: { restaurantId: demoRestaurantId, name },
    });
    const saved = existing || await prisma.ingredient.create({
      data: withDemoTenant(demoRestaurantId, {
        name,
        unit: pick(units),
        costPerUnit: randFloat(10, 800),
        minStock,
        currentStock,
        supplierId: pick(supplierIds),
      }),
    });
    ingredientMap[name] = saved;
  }
  const ingredientList = Object.values(ingredientMap);

  const categoryMap = {};
  for (const cat of MENU_CATEGORIES) {
    const existing = await prisma.menuCategory.findFirst({
      where: { restaurantId: demoRestaurantId, name: cat.name },
    });
    const saved = existing || await prisma.menuCategory.create({
      data: withDemoTenant(demoRestaurantId, cat),
    });
    categoryMap[cat.name] = saved.id;
  }

  const menuItemMap = {};
  const menuItemList = [];
  for (const item of MENU_ITEMS) {
    const image = menuImageUrl(item.name, item.category);
    const existing = await prisma.menuItem.findFirst({
      where: { restaurantId: demoRestaurantId, name: item.name },
    });
    const saved = existing
      ? await prisma.menuItem.update({
          where: { id: existing.id },
          data: { image, description: `${item.desc} | ~${randInt(180, 650)} cal | GST 5%` },
        })
      : await prisma.menuItem.create({
          data: withDemoTenant(demoRestaurantId, {
            name: item.name,
            description: `${item.desc} | ~${randInt(180, 650)} cal | GST 5%`,
            price: item.price,
            prepTimeMinutes: item.prep,
            categoryId: categoryMap[item.category],
            image,
            isAvailable: Math.random() > 0.08,
          }),
        });
    menuItemMap[item.name] = saved;
    menuItemList.push(saved);
  }

  for (const item of menuItemList) {
    const existing = await prisma.recipe.findUnique({ where: { menuItemId: item.id } });
    if (existing) continue;

    const ings = pickN(ingredientList, randInt(3, 6));
    await prisma.recipe.create({
      data: {
        menuItemId: item.id,
        instructions: `1. Prep ingredients.\n2. Cook ${item.name} per standard recipe.\n3. Plate and garnish.\nEst. time: ${item.prepTimeMinutes} min.`,
        ingredients: {
          create: ings.map((ing) => ({
            ingredientId: ing.id,
            quantity: randFloat(0.01, 0.5),
          })),
        },
      },
    });
  }

  const expCatMap = {};
  for (const name of EXPENSE_CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { restaurantId: demoRestaurantId, name },
    });
    const saved = existing || await prisma.expenseCategory.create({
      data: withDemoTenant(demoRestaurantId, { name, description: `${name} expenses` }),
    });
    expCatMap[name] = saved.id;
  }

  const prodCatMap = {};
  for (const name of PRODUCT_CATEGORIES) {
    const existing = await prisma.productCategory.findFirst({
      where: { restaurantId: demoRestaurantId, name },
    });
    const saved = existing || await prisma.productCategory.create({
      data: withDemoTenant(demoRestaurantId, { name }),
    });
    prodCatMap[name] = saved.id;
  }

  const productList = [];
  const productCategories = Object.keys(prodCatMap);
  const warehouseIds = Object.values(warehouseMap);

  for (let i = 1; i <= 200; i++) {
    const sku = `${SEED_PREFIX}-PRD-${String(i).padStart(4, '0')}`;
    const catName = productCategories[i % productCategories.length];
    const cost = randFloat(20, 5000);
    const minStock = randFloat(5, 50);
    let quantity = randFloat(minStock, minStock * 10);

    if (i <= 20) quantity = randFloat(0.5, minStock * 0.8);

    const existing = await prisma.product.findFirst({
      where: { restaurantId: demoRestaurantId, sku },
    });
    const saved = existing || await prisma.product.create({
      data: withDemoTenant(demoRestaurantId, {
        name: `${pick(['Premium', 'Standard', 'Bulk', 'Fresh', 'Organic'])} ${pick(['Supply', 'Stock', 'Item', 'Pack'])} ${i}`,
        sku,
        description: `Inventory product #${i} for RestaurantOS Demo`,
        unit: pick(['kg', 'pack', 'can', 'box', 'liter', 'piece']),
        costPrice: cost,
        sellingPrice: Number((cost * randFloat(1.1, 1.8)).toFixed(2)),
        minStock,
        categoryId: prodCatMap[catName],
      }),
    });

    const wh = warehouseIds[i % warehouseIds.length];
    await prisma.stockItem.upsert({
      where: { productId_warehouseId: { productId: saved.id, warehouseId: wh.id } },
      update: { quantity },
      create: { productId: saved.id, warehouseId: wh.id, quantity },
    });
    productList.push({ ...saved, quantity, warehouseId: wh.id });
  }

  const lowStockIngredients = pickN(ingredientList, 15);
  for (const ing of lowStockIngredients) {
    await prisma.ingredient.update({
      where: { id: ing.id },
      data: { currentStock: randFloat(0.5, Number(ing.minStock) * 0.9) },
    });
  }

  return {
    supplierMap,
    supplierIds,
    warehouseMap,
    ingredientMap,
    ingredientList,
    categoryMap,
    menuItemMap,
    menuItemList,
    expCatMap,
    prodCatMap,
    productList,
  };
}

module.exports = { seedCatalog };
