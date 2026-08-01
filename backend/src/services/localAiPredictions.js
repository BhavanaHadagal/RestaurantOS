function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function computeDailyUsage(ing) {
  const daily = toNum(ing.dailyConsumption);
  if (daily > 0) return daily;
  if (ing.weeklyConsumption) return toNum(ing.weeklyConsumption) / 7;
  const minimum = toNum(ing.minStock);
  if (minimum > 0) return Math.max(minimum * 0.02, 0.01);
  return 0.01;
}

function usageConfidence(ing, orderCount) {
  const source = ing.usageSource || '';
  const hasReal = (source === 'orders_recipes' || source === 'stock_movements') && toNum(ing.dailyConsumption) > 0;
  const orderFactor = Math.min(orderCount / 400, 0.12);
  if (hasReal) return Math.min(0.95, 0.65 + orderFactor + (source === 'orders_recipes' ? 0.1 : 0.05));
  return Math.min(0.55, 0.35 + orderFactor);
}

function predictShortages(ingredients, orderCount = 0) {
  const predictions = [];

  for (const ing of ingredients) {
    const current = toNum(ing.currentStock);
    const minimum = toNum(ing.minStock);
    const maximum = toNum(ing.maxStock) || minimum * 4 || 50;
    const daily = computeDailyUsage(ing);
    const leadTime = toNum(ing.leadTimeDays ?? ing.supplierDeliveryDays, 5);
    const daysRemaining = daily > 0 ? current / daily : 999;
    const effectiveDays = daysRemaining - leadTime;
    const source = ing.usageSource || '';

    if (source === 'insufficient_sales_data' && current > minimum) continue;

    let risk = 'low';
    if (effectiveDays < 3) risk = 'high';
    else if (effectiveDays < 7) risk = 'medium';

    const reorderQty = Math.max(maximum - current, minimum * 2 - current, minimum);
    const confidence = usageConfidence(ing, orderCount);

    if (daysRemaining >= 14) continue;

    const name = ing.name || 'Unknown';
    let dataNote = ' Limited sales history — review manually.';
    if (source === 'orders_recipes') {
      dataNote = ` Based on ${Math.round(toNum(ing.usageDataDays, 30))} days of orders and recipes.`;
    } else if (source === 'stock_movements') {
      dataNote = ' Based on recent stock-out movements.';
    }

    const recommendation =
      `${name} will likely run out in ${daysRemaining.toFixed(1)} days ` +
      `(lead time: ${leadTime.toFixed(0)} days). Recommended reorder: ${reorderQty.toFixed(1)} ${ing.unit || 'units'}.${dataNote}`;

    predictions.push({
      ingredientName: name,
      ingredient: name,
      currentStock: Math.round(current * 100) / 100,
      minStock: minimum,
      dailyUsage: Math.round(daily * 100) / 100,
      unit: ing.unit || 'units',
      daysRemaining: Math.round(daysRemaining * 10) / 10,
      riskLevel: risk,
      risk,
      confidence: Math.round(confidence * 100) / 100,
      usageSource: source,
      recommendedAction: risk === 'high' ? 'Reorder immediately' : 'Plan reorder',
      recommendation,
      recommendedReorderQty: Math.round(reorderQty * 100) / 100,
      recommendedOrder: Math.round(reorderQty * 100) / 100,
    });
  }

  predictions.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    success: true,
    predictions: predictions.slice(0, 20),
    generatedAt: new Date().toISOString(),
    aiReasoning: predictions.length
      ? `Identified ${predictions.length} ingredients that may run low within 14 days based on recent usage.`
      : 'No shortage risks detected in the next 14 days.',
  };
}

function recommendStock(ingredients, products, salesTrend = 'stable') {
  const recommendations = [];
  const trendFactor = salesTrend === 'up' ? 1.2 : salesTrend === 'down' ? 0.9 : 1;

  for (const ing of ingredients) {
    const current = toNum(ing.currentStock);
    const minimum = toNum(ing.minStock);
    const maximum = toNum(ing.maxStock) || minimum * 3;
    if (current > maximum * 0.4) continue;

    const qty = Math.round((maximum - current) * trendFactor * 100) / 100;
    const urgency = current <= minimum ? 'urgent' : 'normal';
    recommendations.push({
      type: 'ingredient',
      name: ing.name,
      currentStock: current,
      recommendedQuantity: qty,
      reorderQuantity: qty,
      urgency,
      priority: urgency,
      reason: current <= minimum
        ? 'Below minimum stock threshold'
        : `High ${salesTrend} demand expected — maintain buffer stock`,
      confidence: current <= minimum ? 0.82 : 0.68,
      estimatedCost: Math.round(qty * toNum(ing.costPerUnit) * 100) / 100,
      supplier: ing.supplier?.name || null,
    });
  }

  for (const stock of products) {
    const qty = toNum(stock.quantity);
    const product = stock.product || {};
    const minStock = toNum(product.minStock);
    const maxStock = toNum(product.maxStock) || minStock * 3;
    if (qty > minStock * 1.2) continue;

    const reorder = Math.round((maxStock - qty) * trendFactor * 100) / 100;
    recommendations.push({
      type: 'product',
      name: product.name,
      currentStock: qty,
      recommendedQuantity: reorder,
      reorderQuantity: reorder,
      urgency: qty <= minStock ? 'urgent' : 'normal',
      priority: qty <= minStock ? 'urgent' : 'normal',
      reason: qty <= minStock ? 'Below minimum stock' : 'Maintain buffer stock',
      confidence: 0.75,
    });
  }

  return {
    success: true,
    recommendations: recommendations.slice(0, 30),
    generatedAt: new Date().toISOString(),
  };
}

function recommendMenuPricing(menuItems, targetMargin = 0.52, wastePct = 0.05) {
  const recommendations = [];

  for (const item of menuItems) {
    const current = toNum(item.price);
    const recipe = item.recipe || {};
    let ingredientCost = 0;

    for (const ri of recipe.ingredients || []) {
      const ing = ri.ingredient || {};
      ingredientCost += toNum(ing.costPerUnit) * toNum(ri.quantity);
    }

    const prepCost = toNum(item.prepTimeMinutes, 15) * 2;
    const wasteCost = ingredientCost * wastePct;
    const totalCost = ingredientCost + prepCost + wasteCost;

    let suggested = totalCost > 0 ? totalCost / (1 - targetMargin) : current;
    const popularity = (item.orderItems || []).length;
    if (popularity > 50) suggested *= 1.05;
    else if (popularity < 10) suggested *= 0.97;

    const margin = suggested > 0 ? (1 - totalCost / suggested) * 100 : 0;
    const foodCostPct = suggested > 0 ? (totalCost / suggested) * 100 : 0;
    const change = current > 0 ? ((suggested - current) / current) * 100 : 0;

    let explanation =
      `Cost ₹${Math.round(totalCost)} (ingredients + prep + ${Math.round(wastePct * 100)}% waste). ` +
      `Suggested ₹${Math.round(suggested)} maintains ${Math.round(margin)}% margin.`;
    if (popularity > 30) explanation += ' Premium pricing applied for high demand.';

    recommendations.push({
      menuItem: item.name,
      name: item.name,
      currentPrice: current,
      suggestedPrice: Math.round(suggested * 100) / 100,
      ingredientCost: Math.round(totalCost * 100) / 100,
      profitMargin: Math.round(margin * 10) / 10,
      margin: Math.round(margin * 10) / 10,
      foodCostPercent: Math.round(foodCostPct * 10) / 10,
      pricingExplanation: explanation,
      reason: explanation,
      confidence: Math.min(0.92, 0.55 + popularity / 100),
      popularity,
      priceChangePercent: Math.round(change * 10) / 10,
      action: change > 5 ? 'increase' : change < -5 ? 'decrease' : 'maintain',
    });
  }

  return {
    success: true,
    recommendations: recommendations.sort((a, b) => b.popularity - a.popularity).slice(0, 30),
    generatedAt: new Date().toISOString(),
    source: 'local',
  };
}

function estimatePrepTime(menuItem, kitchenLoad = 1, activeOrders = 0) {
  const base = toNum(menuItem.prepTimeMinutes, 15);
  const recipe = menuItem.recipe || {};
  const stepCount = String(recipe.instructions || '').split('\n').filter(Boolean).length;
  const ingredientCount = (recipe.ingredients || []).length;

  const complexity = 1 + stepCount * 0.05 + ingredientCount * 0.03;
  let load = Math.max(kitchenLoad, 1 + activeOrders * 0.08);

  const hour = new Date().getHours();
  if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 22)) load *= 1.25;

  const estimated = Math.round(base * complexity * load);
  const difficulty = complexity > 1.4 ? 'hard' : complexity > 1.15 ? 'medium' : 'easy';
  const reason =
    `Base ${base} min × complexity ${complexity.toFixed(2)} × kitchen load ${load.toFixed(2)}. ` +
    `${activeOrders} active orders in queue.`;

  return {
    success: true,
    menuItem: menuItem.name,
    estimatedTimeMinutes: estimated,
    estimatedTime: estimated,
    predictedPrepTime: estimated,
    basePrepTime: base,
    difficulty,
    reason,
    reasoning: reason,
    confidence: Math.min(0.9, 0.5 + (menuItem.orderItems || []).length / 50),
    loadFactor: Math.round(load * 100) / 100,
    source: 'local',
  };
}

function generateBusinessInsights(orders, expenses, inventory, menuItems) {
  const totalRevenue = orders.reduce(
    (sum, order) => sum + toNum(order.totalAmount ?? order.total),
    0
  );
  const totalExpenses = expenses.reduce((sum, expense) => sum + toNum(expense.amount), 0);
  const lowStock = inventory.filter(
    (item) => toNum(item.currentStock) <= toNum(item.minStock) && toNum(item.minStock) > 0
  );

  const itemSales = {};
  for (const order of orders) {
    for (const item of order.items || []) {
      const name = item.menuItem?.name || item.name || 'Unknown';
      itemSales[name] = (itemSales[name] || 0) + toNum(item.quantity, 1);
    }
  }

  const topItems = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const insights = [];

  if (lowStock.length) {
    insights.push({
      title: `${lowStock.length} ingredients below minimum stock`,
      description: `Restock soon: ${lowStock.slice(0, 3).map((i) => i.name).join(', ')}.`,
      category: 'inventory',
      priority: 'high',
    });
  }

  if (totalRevenue > 0 && totalExpenses > 0) {
    const margin = ((totalRevenue - totalExpenses) / totalRevenue) * 100;
    insights.push({
      title: `Net margin approximately ${margin.toFixed(1)}%`,
      description: `Revenue ₹${Math.round(totalRevenue).toLocaleString('en-IN')} vs expenses ₹${Math.round(totalExpenses).toLocaleString('en-IN')} over the period.`,
      category: 'finance',
      priority: margin > 15 ? 'medium' : 'high',
    });
  }

  if (topItems.length) {
    insights.push({
      title: `Top seller: ${topItems[0][0]}`,
      description: `Sold ${Math.round(topItems[0][1])} units. Consider promoting similar items.`,
      category: 'sales',
      priority: 'low',
    });
  }

  const inactive = menuItems.filter((item) => (item.orderItems || []).length < 3);
  if (inactive.length) {
    insights.push({
      title: `${inactive.length} menu items with low sales`,
      description: 'Review pricing or remove underperformers to simplify kitchen operations.',
      category: 'menu',
      priority: 'medium',
    });
  }

  const summary = insights.length
    ? 'Review inventory levels, menu performance, and margin trends weekly.'
    : 'Operations look stable — keep monitoring sales and stock levels.';

  return {
    success: true,
    insights,
    summary,
    metrics: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      lowStockCount: lowStock.length,
      orderCount: orders.length,
    },
    generatedAt: new Date().toISOString(),
    source: 'local',
  };
}

function analyzeWaste(movements) {
  const summary = {};
  let totalCost = 0;

  for (const move of movements) {
    const name = move.ingredient?.name || move.product?.name || 'Unknown';
    const qty = toNum(move.quantity);
    const cost = toNum(move.ingredient?.costPerUnit ?? move.product?.costPrice) * qty;
    if (!summary[name]) summary[name] = { quantity: 0, cost: 0, type: move.type };
    summary[name].quantity += qty;
    summary[name].cost += cost;
    totalCost += cost;
  }

  const items = Object.entries(summary)
    .map(([name, data]) => ({ name, ...data, cost: Math.round(data.cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  return {
    success: true,
    totalWasteCost: Math.round(totalCost * 100) / 100,
    items: items.slice(0, 20),
    recommendations: items.slice(0, 5).map((item) => ({
      item: item.name,
      action: `Review storage and ordering for ${item.name} — ₹${item.cost} lost to ${item.type?.toLowerCase() || 'waste'}`,
    })),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  predictShortages,
  recommendStock,
  recommendMenuPricing,
  estimatePrepTime,
  generateBusinessInsights,
  analyzeWaste,
};
