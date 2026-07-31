import logging
import os
import time
import asyncio
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import MAX_FILE_SIZE_MB, UPLOAD_DIR, OCR_CONFIDENCE_THRESHOLD
from app.schemas.analytics import (
    ShortageRequest, ReorderRequest, PricingRequest, PrepTimeRequest, WasteRequest, InsightsRequest,
)
from app.schemas.invoice import InvoiceProcessResponse
from app.services.gemini_service import GEMINI_AVAILABLE, structure_invoice_with_gemini, extract_invoice_from_image
from app.services.ocr_service import peek_ocr_status, extract_text_from_image_safe, pdf_to_images
from app.services.invoice_parser import parse_invoice_text, validate_invoice
from app.services import predictions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["Analytics"])

ALLOWED_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
OCR_TIMEOUT_SEC = 180


@router.post("/predict-shortages")
async def predict_shortages_endpoint(body: ShortageRequest):
    try:
        return await predictions.predict_shortages(body.ingredients, body.orderCount)
    except Exception as exc:
        logger.exception("Shortage prediction failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/recommend-stock")
async def recommend_stock_endpoint(body: ReorderRequest):
    try:
        return await predictions.recommend_stock(
            body.ingredients, body.products, body.salesTrend or "stable"
        )
    except Exception as exc:
        logger.exception("Reorder recommendation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/menu-pricing")
async def menu_pricing_endpoint(body: PricingRequest):
    try:
        return await predictions.recommend_menu_pricing(
            body.menuItems, body.targetMargin or 0.52, body.wastePercentage or 0.05
        )
    except Exception as exc:
        logger.exception("Menu pricing failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/preparation-time")
async def preparation_time_endpoint(body: PrepTimeRequest):
    try:
        return await predictions.estimate_prep_time(
            body.menuItem, body.kitchenLoad or 1.0, body.activeOrders or 0
        )
    except Exception as exc:
        logger.exception("Prep time estimation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/waste-analysis")
async def waste_analysis_endpoint(body: WasteRequest):
    try:
        return await predictions.analyze_waste(body.movements)
    except Exception as exc:
        logger.exception("Waste analysis failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze/insights")
async def business_insights_endpoint(body: InsightsRequest):
    try:
        return await predictions.generate_business_insights(
            body.orders, body.expenses, body.inventory, body.menuItems
        )
    except Exception as exc:
        logger.exception("Business insights failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# Legacy aliases
@router.post("/predict/shortage")
async def legacy_shortage(body: ShortageRequest):
    return await predict_shortages_endpoint(body)


@router.post("/predict/reorder")
async def legacy_reorder(body: ReorderRequest):
    return await recommend_stock_endpoint(body)


@router.post("/predict/pricing")
async def legacy_pricing(body: PricingRequest):
    return await menu_pricing_endpoint(body)


@router.post("/predict/prep-time")
async def legacy_prep(body: PrepTimeRequest):
    return await preparation_time_endpoint(body)


@router.post("/analyze/waste")
async def legacy_waste(body: WasteRequest):
    return await waste_analysis_endpoint(body)


async def _process_file(file: UploadFile, existing_numbers: Optional[List[str]] = None) -> dict:
    start = time.time()
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXT)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_FILE_SIZE_MB}MB limit")

    safe_name = (file.filename or "upload").replace("\\", "_").replace("/", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    image_paths = [file_path]
    if ext == ".pdf":
        image_paths = await asyncio.to_thread(pdf_to_images, file_path, UPLOAD_DIR)
        if not image_paths:
            if GEMINI_AVAILABLE:
                logger.info("PDF OCR unavailable — using Gemini vision on first page attempt")
                gemini_data = await extract_invoice_from_image(file_path)
                if gemini_data:
                    gemini_data["processingTimeMs"] = int((time.time() - start) * 1000)
                    gemini_data["previewPath"] = file_path
                    gemini_data["validationErrors"], gemini_data["validationWarnings"] = validate_invoice(gemini_data)
                    return gemini_data
            raise HTTPException(
                422,
                "PDF conversion failed. Install poppler, or upload PNG/JPG instead.",
            )

    ocr_status = peek_ocr_status()
    all_results = []
    engine = "none"

    for img_path in image_paths:
        try:
            results, eng = await asyncio.wait_for(
                asyncio.to_thread(extract_text_from_image_safe, img_path, OCR_TIMEOUT_SEC),
                timeout=OCR_TIMEOUT_SEC + 30,
            )
            all_results.extend(results)
            if eng != "none":
                engine = eng
        except asyncio.TimeoutError:
            logger.warning("OCR timed out for %s", img_path)
        except Exception as exc:
            logger.exception("OCR failed for %s: %s", img_path, exc)

    parsed = parse_invoice_text(all_results, engine)

    needs_gemini = GEMINI_AVAILABLE and (
        not all_results
        or (
            parsed.get("averageConfidence", 0) < OCR_CONFIDENCE_THRESHOLD
            and not parsed.get("total")
        )
    )

    gemini_data = {}
    if needs_gemini and image_paths:
        logger.info("Enhancing extraction with Gemini vision")
        gemini_data = await extract_invoice_from_image(image_paths[0])
        if gemini_data:
            parsed = {**parsed, **gemini_data}
            engine = gemini_data.get("ocrEngine", "gemini-vision")
        elif parsed.get("rawText"):
            parsed = await structure_invoice_with_gemini(parsed.get("rawText", ""), parsed)
            parsed["ocrEngine"] = f"{engine}+gemini"

    parsed["validationErrors"], parsed["validationWarnings"] = validate_invoice(parsed)

    if not all_results and not parsed.get("items") and parsed.get("total", 0) <= 0:
        ocr_hint = (
            "Handwriting OCR failed. Ensure rapidocr-onnxruntime is installed "
            "(pip install rapidocr-onnxruntime) or install Tesseract (see README)."
        )
        gemini_hint = (
            "Gemini quota exceeded — wait or use a new API key."
            if GEMINI_AVAILABLE and needs_gemini and not gemini_data
            else "Set GEMINI_API_KEY in ai-service/.env."
            if not GEMINI_AVAILABLE
            else ""
        )
        parsed["validationErrors"] = [
            "OCR failed — no text extracted from image",
            ocr_hint,
        ]
        if gemini_hint:
            parsed["validationWarnings"] = parsed.get("validationWarnings", []) + [gemini_hint]

    inv_num = parsed.get("invoiceNumber")
    if existing_numbers and inv_num and inv_num in existing_numbers:
        parsed["isDuplicate"] = True
        parsed["validationWarnings"] = parsed.get("validationWarnings", []) + ["Possible duplicate invoice"]

    parsed["processingTimeMs"] = int((time.time() - start) * 1000)
    parsed["previewPath"] = file_path
    parsed["ocrEngine"] = parsed.get("ocrEngine") or engine
    return parsed


invoice_router = APIRouter(prefix="/ai/invoice", tags=["Invoice OCR"])


@invoice_router.post("/process", response_model=InvoiceProcessResponse)
async def process_invoice(file: UploadFile = File(...)):
    try:
        data = await _process_file(file)
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Invoice processing failed")
        raise HTTPException(500, f"Invoice processing failed: {exc}") from exc


@invoice_router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    return await process_invoice(file)
