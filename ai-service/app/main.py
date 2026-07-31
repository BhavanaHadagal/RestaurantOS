import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.analytics import router as analytics_router, invoice_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Server starts immediately; OCR loads on first request in an isolated subprocess."""
    logger.info("AI service ready — OCR runs in isolated subprocess on demand")
    yield


app = FastAPI(
    title="RestaurantOS AI Service",
    description="Production AI module — predictions, OCR invoice processing, Gemini enrichment",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(analytics_router)
app.include_router(invoice_router)

# Legacy OCR endpoint
from app.routes.analytics import _process_file
from fastapi import File, UploadFile, HTTPException


@app.post("/ocr/invoice", tags=["Legacy"])
async def legacy_ocr_invoice(file: UploadFile = File(...)):
    try:
        return await _process_file(file)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc
