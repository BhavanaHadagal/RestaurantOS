from datetime import datetime

from fastapi import APIRouter

from app.services.gemini_service import GEMINI_AVAILABLE
from app.services.ocr_service import peek_ocr_status

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health():
    ocr = peek_ocr_status()
    return {
        "status": "ok",
        "service": "RestaurantOS AI",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "ocr_engine": ocr["engine"],
        "ocr_available": ocr["available"],
        "gemini_available": GEMINI_AVAILABLE,
    }
