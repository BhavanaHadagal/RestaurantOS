const MS_DAY = 86400000;

/**
 * Derives per-ingredient daily usage from completed orders × recipe quantities,
 * with stock-out movements as a fallback when recipe usage is unavailable.
 */
function computeIngredientUsageMetrics(orders, recipes, stockMovements = [], periodDays = 30) {
  const recipeByMenuItem = new Map();
  for (const recipe of recipes) {
    recipeByMenuItem.set(recipe.menuItemId, recipe.ingredients || []);
  }

  const usageTotals = new Map();
  let minDate = null;
  let maxDate = null;

  for (const order of orders) {
    const created = new Date(order.createdAt);
    if (!minDate || created < minDate) minDate = created;
    if (!maxDate || created > maxDate) maxDate = created;

    for (const item of order.items || []) {
      const recipeIngs = recipeByMenuItem.get(item.menuItemId) || [];
      const sold = Number(item.quantity) || 0;
      for (const ri of recipeIngs) {
        const perServing = Number(ri.quantity) || 0;
        const id = ri.ingredientId;
        usageTotals.set(id, (usageTotals.get(id) || 0) + perServing * sold);
      }
    }
  }

  const stockOutTotals = new Map();
  for (const move of stockMovements) {
    if (!move.ingredientId) continue;
    const qty = Number(move.quantity) || 0;
    stockOutTotals.set(
      move.ingredientId,
      (stockOutTotals.get(move.ingredientId) || 0) + qty
    );
  }

  const spanDays =
    minDate && maxDate ? Math.max(1, (maxDate - minDate) / MS_DAY) : periodDays;

  const dailyByIngredient = new Map();
  const sourceByIngredient = new Map();

  for (const [id, total] of usageTotals) {
    if (total > 0) {
      dailyByIngredient.set(id, total / spanDays);
      sourceByIngredient.set(id, 'orders_recipes');
    }
  }

  for (const [id, total] of stockOutTotals) {
    if (!dailyByIngredient.has(id) || dailyByIngredient.get(id) === 0) {
      if (total > 0) {
        dailyByIngredient.set(id, total / spanDays);
        sourceByIngredient.set(id, 'stock_movements');
      }
    }
  }

  return {
    dailyByIngredient,
    sourceByIngredient,
    spanDays: Math.round(spanDays),
    orderCount: orders.length,
  };
}

function enrichIngredientsForAI(ingredients, metrics) {
  const { dailyByIngredient, sourceByIngredient, spanDays, orderCount } = metrics;

  return ingredients.map((ing) => {
    const daily = dailyByIngredient.get(ing.id) || 0;
    const source = sourceByIngredient.get(ing.id) || 'insufficient_sales_data';

    return {
      ...ing,
      currentStock: Number(ing.currentStock),
      minStock: Number(ing.minStock),
      costPerUnit: Number(ing.costPerUnit),
      dailyConsumption: daily > 0 ? Number(daily.toFixed(4)) : undefined,
      usageDataDays: spanDays,
      usageOrderCount: orderCount,
      usageSource: source,
    };
  });
}

module.exports = {
  computeIngredientUsageMetrics,
  enrichIngredientsForAI,
  fetchInventoryAnalysisContext,
};

async function fetchInventoryAnalysisContext(prisma, days = 30) {
  const { tenantWhere } = require('./tenant');
  const since = new Date(Date.now() - days * MS_DAY);
  const [ingredients, orders, recipes, stockMovements] = await Promise.all([
    prisma.ingredient.findMany({
      where: tenantWhere(),
      include: { supplier: { select: { id: true, name: true } } },
    }),
    prisma.order.findMany({
      where: tenantWhere({
        createdAt: { gte: since },
        status: { in: ['COMPLETED', 'SERVED'] },
      }),
      select: {
        createdAt: true,
        items: { select: { menuItemId: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 800,
    }),
    prisma.recipe.findMany({
      where: { menuItem: tenantWhere() },
      include: { ingredients: true },
    }),
    prisma.stockMovement.findMany({
      where: tenantWhere({
        createdAt: { gte: since },
        type: 'STOCK_OUT',
        ingredientId: { not: null },
      }),
      take: 500,
    }),
  ]);

  const metrics = computeIngredientUsageMetrics(orders, recipes, stockMovements, days);
  return {
    enrichedIngredients: enrichIngredientsForAI(ingredients, metrics),
    metrics,
  };
}
