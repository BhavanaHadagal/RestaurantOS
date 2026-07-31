from datetime import datetime

from app.services.gemini_service import get_ai_recommendation


def _f(val, default=0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def compute_daily_usage(ing: dict) -> float:
    daily = _f(ing.get("dailyConsumption"))
    if daily > 0:
        return daily
    if ing.get("weeklyConsumption"):
        return _f(ing["weeklyConsumption"]) / 7
    minimum = _f(ing.get("minStock"))
    # No fabricated usage — conservative fallback when sales/recipe data is missing
    if minimum > 0:
        return max(minimum * 0.02, 0.01)
    return 0.01


def _usage_confidence(ing: dict, order_count: int) -> float:
    source = ing.get("usageSource", "")
    has_real = source in ("orders_recipes", "stock_movements") and _f(ing.get("dailyConsumption")) > 0
    order_factor = min(order_count / 400, 0.12)
    if has_real:
        return min(0.95, 0.65 + order_factor + (0.1 if source == "orders_recipes" else 0.05))
    return min(0.55, 0.35 + order_factor)


async def predict_shortages(ingredients: list, order_count: int = 0) -> dict:
    predictions = []
    for ing in ingredients:
        current = _f(ing.get("currentStock"))
        minimum = _f(ing.get("minStock"))
        maximum = _f(ing.get("maxStock")) or minimum * 4 or 50
        daily = compute_daily_usage(ing)
        lead_time = _f(ing.get("leadTimeDays") or ing.get("supplierDeliveryDays"), 5)

        days_remaining = current / daily if daily > 0 else 999
        effective_days = days_remaining - lead_time

        if effective_days < 3:
            risk = "high"
        elif effective_days < 7:
            risk = "medium"
        else:
            risk = "low"

        source = ing.get("usageSource", "")
        # Skip items with no sales/recipe data unless stock is already at/below minimum
        if source == "insufficient_sales_data" and current > minimum:
            continue

        reorder_qty = max(maximum - current, minimum * 2 - current, minimum)
        confidence = _usage_confidence(ing, order_count)

        if days_remaining < 14:
            name = ing.get("name", "Unknown")
            action = "Reorder immediately" if risk == "high" else "Plan reorder"
            data_note = ""
            if source == "orders_recipes":
                days_window = int(_f(ing.get("usageDataDays"), 30))
                data_note = f" Based on {days_window} days of orders and recipes."
            elif source == "stock_movements":
                data_note = " Based on recent stock-out movements."
            else:
                data_note = " Limited sales history — review manually."

            recommendation = (
                f"{name} will likely run out in {days_remaining:.1f} days "
                f"(lead time: {lead_time:.0f} days). Recommended reorder: {reorder_qty:.1f} {ing.get('unit', 'units')}."
                f"{data_note}"
            )
            predictions.append({
                "ingredientName": name,
                "ingredient": name,
                "currentStock": round(current, 2),
                "minStock": minimum,
                "dailyUsage": round(daily, 2),
                "unit": ing.get("unit", "units"),
                "daysRemaining": round(days_remaining, 1),
                "riskLevel": risk,
                "risk": risk,
                "confidence": round(confidence, 2),
                "usageSource": source,
                "recommendedAction": action,
                "recommendation": recommendation,
                "recommendedReorderQty": round(reorder_qty, 2),
                "recommendedOrder": round(reorder_qty, 2),
            })

    predictions.sort(key=lambda x: x["daysRemaining"])
    ai_reasoning = await get_ai_recommendation(
        "ingredient shortage prediction",
        {"top": predictions[:3], "count": len(predictions)},
    )
    return {
        "success": True,
        "predictions": predictions[:20],
        "generatedAt": datetime.now().isoformat(),
        "aiReasoning": ai_reasoning,
    }


async def recommend_stock(ingredients: list, products: list, sales_trend: str = "stable") -> dict:
    recommendations = []
    trend_factor = 1.2 if sales_trend == "up" else 0.9 if sales_trend == "down" else 1.0

    for ing in ingredients:
        current = _f(ing.get("currentStock"))
        minimum = _f(ing.get("minStock"))
        maximum = _f(ing.get("maxStock")) or minimum * 3
        if current <= maximum * 0.4:
            qty = round((maximum - current) * trend_factor, 2)
            urgency = "urgent" if current <= minimum else "normal"
            reason = (
                "Below minimum stock threshold"
                if current <= minimum
                else f"High {sales_trend} demand expected — maintain buffer stock"
            )
            recommendations.append({
                "type": "ingredient",
                "name": ing.get("name"),
                "currentStock": current,
                "recommendedQuantity": qty,
                "reorderQuantity": qty,
                "urgency": urgency,
                "priority": urgency,
                "reason": reason,
                "confidence": 0.82 if current <= minimum else 0.68,
                "estimatedCost": round(qty * _f(ing.get("costPerUnit")), 2),
                "supplier": ing.get("supplier", {}).get("name") if isinstance(ing.get("supplier"), dict) else None,
            })

    for stock in products:
        qty = _f(stock.get("quantity"))
        product = stock.get("product", {})
        min_stock = _f(product.get("minStock"))
        max_stock = _f(product.get("maxStock")) or min_stock * 3
        if qty <= min_stock * 1.2:
            reorder = round((max_stock - qty) * trend_factor, 2)
            recommendations.append({
                "type": "product",
                "name": product.get("name"),
                "currentStock": qty,
                "recommendedQuantity": reorder,
                "reorderQuantity": reorder,
                "urgency": "urgent" if qty <= min_stock else "normal",
                "priority": "urgent" if qty <= min_stock else "normal",
                "reason": "Inventory below reorder point",
                "confidence": 0.75,
                "estimatedCost": round(reorder * _f(product.get("costPrice")), 2),
            })

    recommendations.sort(key=lambda x: 0 if x["urgency"] == "urgent" else 1)
    return {"success": True, "recommendations": recommendations, "totalItems": len(recommendations)}


async def recommend_menu_pricing(menu_items: list, target_margin: float = 0.52, waste_pct: float = 0.05) -> dict:
    recommendations = []
    for item in menu_items:
        current = _f(item.get("price"))
        recipe = item.get("recipe") or {}
        ingredient_cost = 0.0
        for ri in recipe.get("ingredients") or []:
            ing = ri.get("ingredient") or {}
            ingredient_cost += _f(ing.get("costPerUnit")) * _f(ri.get("quantity"))

        prep_cost = _f(item.get("prepTimeMinutes"), 15) * 2
        waste_cost = ingredient_cost * waste_pct
        total_cost = ingredient_cost + prep_cost + waste_cost

        suggested = total_cost / (1 - target_margin) if total_cost > 0 else current
        popularity = len(item.get("orderItems") or [])
        if popularity > 50:
            suggested *= 1.05
        elif popularity < 10:
            suggested *= 0.97

        margin = (1 - total_cost / suggested) * 100 if suggested > 0 else 0
        food_cost_pct = (total_cost / suggested) * 100 if suggested > 0 else 0
        change = ((suggested - current) / current * 100) if current > 0 else 0

        explanation = (
            f"Cost ₹{total_cost:.0f} (ingredients + prep + {waste_pct*100:.0g}% waste). "
            f"Suggested ₹{suggested:.0f} maintains {margin:.0f}% margin."
        )
        if popularity > 30:
            explanation += " Premium pricing applied for high demand."

        recommendations.append({
            "menuItem": item.get("name"),
            "currentPrice": current,
            "suggestedPrice": round(suggested, 2),
            "ingredientCost": round(total_cost, 2),
            "profitMargin": round(margin, 1),
            "margin": round(margin, 1),
            "foodCostPercent": round(food_cost_pct, 1),
            "pricingExplanation": explanation,
            "confidence": min(0.92, 0.55 + popularity / 100),
            "popularity": popularity,
            "priceChangePercent": round(change, 1),
            "action": "increase" if change > 5 else "decrease" if change < -5 else "maintain",
        })

    return {"success": True, "recommendations": recommendations}


async def estimate_prep_time(menu_item: dict, kitchen_load: float = 1.0, active_orders: int = 0) -> dict:
    item = menu_item
    base = int(item.get("prepTimeMinutes") or 15)
    recipe = item.get("recipe") or {}
    step_count = len((recipe.get("instructions") or "").split("\n"))
    ingredient_count = len(recipe.get("ingredients") or [])

    complexity = 1 + (step_count * 0.05) + (ingredient_count * 0.03)
    load = max(kitchen_load, 1 + active_orders * 0.08)

    hour = datetime.now().hour
    if 12 <= hour <= 14 or 19 <= hour <= 22:
        load *= 1.25

    estimated = round(base * complexity * load)
    difficulty = "hard" if complexity > 1.4 else "medium" if complexity > 1.15 else "easy"

    reason = (
        f"Base {base} min × complexity {complexity:.2f} × kitchen load {load:.2f}. "
        f"{active_orders} active orders in queue."
    )

    return {
        "success": True,
        "menuItem": item.get("name"),
        "estimatedTimeMinutes": estimated,
        "predictedPrepTime": estimated,
        "basePrepTime": base,
        "difficulty": difficulty,
        "reason": reason,
        "confidence": min(0.9, 0.5 + len(item.get("orderItems") or []) / 50),
        "loadFactor": round(load, 2),
        "factors": {
            "complexity": round(complexity, 2),
            "activeOrders": active_orders,
            "peakHour": 12 <= hour <= 14 or 19 <= hour <= 22,
        },
    }


async def analyze_waste(movements: list) -> dict:
    waste_by_item = {}
    total_value = 0.0

    for move in movements:
        name = (
            (move.get("product") or {}).get("name")
            or (move.get("ingredient") or {}).get("name")
            or "Unknown"
        )
        qty = _f(move.get("quantity"))
        cost = _f((move.get("ingredient") or {}).get("costPerUnit"), 50)
        mtype = move.get("type", "")

        if name not in waste_by_item:
            waste_by_item[name] = {"expired": 0, "damaged": 0, "total": 0, "cost": cost}

        if mtype == "EXPIRED":
            waste_by_item[name]["expired"] += qty
        elif mtype == "DAMAGED":
            waste_by_item[name]["damaged"] += qty
        waste_by_item[name]["total"] += qty
        total_value += qty * cost

    analysis = []
    for name, data in waste_by_item.items():
        waste_pct = min(100, data["total"] * 2)
        loss = data["total"] * data["cost"]
        rec = (
            f"Reduce purchase quantity by {min(30, int(waste_pct / 2))}%"
            if data["expired"] > data["damaged"]
            else "Improve storage and handling procedures"
        )
        analysis.append({
            "item": name,
            "wastePercent": round(waste_pct, 1),
            "lossAmount": round(loss, 2),
            "expiredQty": data["expired"],
            "damagedQty": data["damaged"],
            "totalWaste": data["total"],
            "recommendation": rec,
            "confidence": 0.78,
        })

    analysis.sort(key=lambda x: x["lossAmount"], reverse=True)

    return {
        "success": True,
        "totalWasteItems": len(analysis),
        "estimatedWasteValue": round(total_value, 2),
        "analysis": analysis[:15],
        "suggestions": [
            "Implement FIFO inventory rotation for perishables",
            "Review order quantities for high-waste items",
            "Schedule weekly waste audit with kitchen staff",
            "Use AI reorder recommendations to right-size purchases",
        ],
    }


async def generate_business_insights(orders: list, expenses: list, inventory: list, menu_items: list) -> dict:
    total_revenue = sum(
        _f(o.get("totalAmount") or o.get("total"))
        for o in orders
    )
    total_expenses = sum(_f(e.get("amount")) for e in expenses)
    low_stock = [i for i in inventory if _f(i.get("currentStock")) <= _f(i.get("minStock"))]

    item_sales = {}
    for order in orders:
        for item in order.get("items") or []:
            name = (item.get("menuItem") or {}).get("name") or item.get("name") or "Unknown"
            item_sales[name] = item_sales.get(name, 0) + _f(item.get("quantity"), 1)

    top_items = sorted(item_sales.items(), key=lambda x: x[1], reverse=True)[:5]

    insights = []
    if low_stock:
        insights.append({
            "title": f"{len(low_stock)} ingredients below minimum stock",
            "description": f"Restock soon: {', '.join(i.get('name', '?') for i in low_stock[:3])}.",
            "category": "inventory",
            "priority": "high",
        })

    if total_revenue > 0 and total_expenses > 0:
        margin = ((total_revenue - total_expenses) / total_revenue) * 100
        insights.append({
            "title": f"Net margin approximately {margin:.1f}%",
            "description": f"Revenue ₹{total_revenue:,.0f} vs expenses ₹{total_expenses:,.0f} over the period.",
            "category": "finance",
            "priority": "medium" if margin > 15 else "high",
        })

    if top_items:
        insights.append({
            "title": f"Top seller: {top_items[0][0]}",
            "description": f"Sold {int(top_items[0][1])} units. Consider promoting similar items.",
            "category": "sales",
            "priority": "low",
        })

    if len(menu_items) > 0:
        inactive = [m for m in menu_items if len(m.get("orderItems") or []) < 3]
        if inactive:
            insights.append({
                "title": f"{len(inactive)} menu items with low sales",
                "description": "Review pricing or remove underperformers to simplify kitchen operations.",
                "category": "menu",
                "priority": "medium",
            })

    ai_summary = await get_ai_recommendation(
        "restaurant business insights",
        {"insights": insights[:4], "revenue": total_revenue, "expenses": total_expenses},
    )

    return {
        "success": True,
        "insights": insights,
        "summary": ai_summary or "Review inventory levels and menu performance weekly.",
        "metrics": {
            "totalRevenue": round(total_revenue, 2),
            "totalExpenses": round(total_expenses, 2),
            "lowStockCount": len(low_stock),
            "orderCount": len(orders),
        },
    }
