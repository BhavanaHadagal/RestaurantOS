from pydantic import BaseModel, Field
from typing import Optional, List, Any


class InvoiceItemExtracted(BaseModel):
    name: str
    quantity: float = 1
    unit: Optional[str] = None
    unitPrice: float = 0
    discount: Optional[float] = 0
    taxPercent: Optional[float] = None
    taxAmount: Optional[float] = 0
    subtotal: Optional[float] = None
    total: float = 0
    confidence: Optional[float] = 0.5


class InvoiceExtracted(BaseModel):
    supplierName: Optional[str] = None
    invoiceNumber: Optional[str] = None
    invoiceDate: Optional[str] = None
    dueDate: Optional[str] = None
    gstNumber: Optional[str] = None
    supplierAddress: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: Optional[str] = None
    paymentTerms: Optional[str] = None
    purchaseOrderNumber: Optional[str] = None
    currency: str = "INR"
    notes: Optional[str] = None
    subtotal: float = 0
    tax: float = 0
    total: float = 0
    items: List[InvoiceItemExtracted] = Field(default_factory=list)
    invoiceType: str = "printed"
    rawText: Optional[str] = None
    ocrEngine: str = "easyocr"
    averageConfidence: float = 0.5
    confidence: dict = Field(default_factory=dict)
    validationErrors: List[str] = Field(default_factory=list)
    validationWarnings: List[str] = Field(default_factory=list)
    isDuplicate: bool = False
    category: Optional[str] = None
    matchedSupplierId: Optional[str] = None
    aiReasoning: Optional[str] = None
    processingTimeMs: Optional[int] = None


class InvoiceProcessResponse(BaseModel):
    success: bool = True
    data: InvoiceExtracted
