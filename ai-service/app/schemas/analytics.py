from pydantic import BaseModel, Field
from typing import Optional, List, Any


class IngredientInput(BaseModel):
    name: str
    currentStock: float = 0
    minStock: float = 0
    maxStock: Optional[float] = None
    dailyConsumption: Optional[float] = None
    weeklyConsumption: Optional[float] = None
    leadTimeDays: Optional[float] = 5
    supplierDeliveryDays: Optional[float] = 3
    costPerUnit: Optional[float] = 0
    unit: Optional[str] = "kg"
    supplier: Optional[Any] = None


class ShortageRequest(BaseModel):
    ingredients: List[Any] = Field(default_factory=list)
    orderCount: int = 0
    activeOrders: int = 0


class ShortagePrediction(BaseModel):
    ingredientName: str
    currentStock: float
    daysRemaining: float
    riskLevel: str
    confidence: float
    recommendedAction: str
    recommendation: str
    recommendedReorderQty: Optional[float] = None


class ShortageResponse(BaseModel):
    success: bool = True
    predictions: List[ShortagePrediction]
    generatedAt: str
    aiReasoning: Optional[str] = None


class ReorderRequest(BaseModel):
    ingredients: List[Any] = Field(default_factory=list)
    products: List[Any] = Field(default_factory=list)
    salesTrend: Optional[str] = "stable"


class ReorderRecommendation(BaseModel):
    name: str
    type: str = "ingredient"
    currentStock: float
    recommendedQuantity: float
    urgency: str
    reason: str
    confidence: float
    estimatedCost: Optional[float] = None


class ReorderResponse(BaseModel):
    success: bool = True
    recommendations: List[ReorderRecommendation]
    totalItems: int


class PricingRequest(BaseModel):
    menuItems: List[Any] = Field(default_factory=list)
    targetMargin: Optional[float] = 0.52
    wastePercentage: Optional[float] = 0.05


class PricingRecommendation(BaseModel):
    menuItem: str
    currentPrice: float
    suggestedPrice: float
    ingredientCost: float
    profitMargin: float
    foodCostPercent: float
    pricingExplanation: str
    confidence: float
    action: str


class PricingResponse(BaseModel):
    success: bool = True
    recommendations: List[PricingRecommendation]


class PrepTimeRequest(BaseModel):
    menuItem: dict
    kitchenLoad: Optional[float] = 1.0
    activeOrders: Optional[int] = 0


class PrepTimeResponse(BaseModel):
    success: bool = True
    menuItem: str
    estimatedTimeMinutes: int
    difficulty: str
    reason: str
    confidence: float
    factors: dict


class WasteRequest(BaseModel):
    movements: List[Any] = Field(default_factory=list)


class WasteAnalysisItem(BaseModel):
    item: str
    wastePercent: float
    lossAmount: float
    expiredQty: float
    damagedQty: float
    recommendation: str
    confidence: float


class WasteResponse(BaseModel):
    success: bool = True
    totalWasteItems: int
    estimatedWasteValue: float
    analysis: List[WasteAnalysisItem]
    suggestions: List[str]


class InsightsRequest(BaseModel):
    orders: List[Any] = Field(default_factory=list)
    expenses: List[Any] = Field(default_factory=list)
    inventory: List[Any] = Field(default_factory=list)
    menuItems: List[Any] = Field(default_factory=list)
