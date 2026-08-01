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

module.exports = { predictShortages, recommendStock, analyzeWaste };
