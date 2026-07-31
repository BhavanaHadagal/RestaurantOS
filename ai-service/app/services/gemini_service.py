import asyncio
import base64
import json
import logging
import mimetypes
import re
import time
from typing import Optional

import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

_gemini_client = None
GEMINI_AVAILABLE = False
_USE_NEW_SDK = False

GEMINI_REST_URL = "https://generativelanguage.googleapis.com/v1beta"
FALLBACK_MODELS = ["gemini-2.0-flash-lite", "gemini-2.0-flash"]


def _is_valid_gemini_key(key: str) -> bool:
    """Accept legacy AIza keys and new AQ. auth keys from Google AI Studio."""
    if not key or len(key) < 20:
        return False
    return key.startswith("AIza") or key.startswith("AQ.")


def _init_gemini():
    global _gemini_client, GEMINI_AVAILABLE, _USE_NEW_SDK
    if not GEMINI_API_KEY or not _is_valid_gemini_key(GEMINI_API_KEY):
        if GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY format not recognized — expected AIza... or AQ....")
        return

    # Prefer new google-genai SDK (supports AQ. auth keys)
    try:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        GEMINI_AVAILABLE = True
        _USE_NEW_SDK = True
        logger.info("Gemini initialized via google-genai SDK")
        return
    except ImportError:
        pass
    except Exception as exc:
        logger.warning("google-genai init failed: %s", exc)

    # Fallback: legacy SDK (AIza keys only)
    try:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=GEMINI_API_KEY)
        _gemini_client = genai_legacy.GenerativeModel(GEMINI_MODEL)
        GEMINI_AVAILABLE = True
        _USE_NEW_SDK = False
        logger.info("Gemini initialized via legacy google-generativeai SDK")
    except Exception as exc:
        logger.warning("Gemini unavailable: %s", exc)


_init_gemini()


def _parse_json_response(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def _rest_generate(prompt: str, json_mode: bool = False, image_path: Optional[str] = None) -> str:
    """Native REST API with retry on 429 and model fallback."""
    parts = [{"text": prompt}]
    if image_path:
        mime, _ = mimetypes.guess_type(image_path)
        mime = mime or "image/png"
        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})

    body = {"contents": [{"parts": parts}]}
    if json_mode:
        body["generationConfig"] = {"responseMimeType": "application/json"}

    models = [GEMINI_MODEL] + [m for m in FALLBACK_MODELS if m != GEMINI_MODEL]
    last_error = None

    for model in models:
        url = f"{GEMINI_REST_URL}/models/{model}:generateContent"
        for attempt in range(3):
            try:
                with httpx.Client(timeout=120.0) as client:
                    response = client.post(
                        url,
                        headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
                        json=body,
                    )
                if response.status_code == 429:
                    wait = 2 ** attempt
                    logger.warning("Gemini 429 on %s — retry in %ss", model, wait)
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                data = response.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    break
                content_parts = candidates[0].get("content", {}).get("parts") or []
                text = "".join(p.get("text", "") for p in content_parts)
                if text:
                    return text
            except Exception as exc:
                last_error = exc
                logger.warning("Gemini REST %s attempt %s failed: %s", model, attempt + 1, exc)
                time.sleep(1 + attempt)
        logger.info("Trying next Gemini model after %s failed", model)

    if last_error:
        raise last_error
    return ""


def _sdk_generate(prompt: str, json_mode: bool = False, image_path: Optional[str] = None) -> str:
    if not GEMINI_AVAILABLE or not _gemini_client:
        return ""

    try:
        if _USE_NEW_SDK:
            from google.genai import types
            contents = [prompt]
            if image_path:
                from PIL import Image
                contents.append(Image.open(image_path))
            config = types.GenerateContentConfig(
                response_mime_type="application/json" if json_mode else None
            )
            response = _gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=config,
            )
            return response.text or ""

        parts = [prompt]
        if image_path:
            from PIL import Image
            parts.append(Image.open(image_path))
        config = {"response_mime_type": "application/json"} if json_mode else None
        response = _gemini_client.generate_content(parts, generation_config=config)
        return response.text or ""
    except Exception as exc:
        logger.error("Gemini SDK call failed: %s — trying REST fallback", exc)
        if GEMINI_API_KEY and _is_valid_gemini_key(GEMINI_API_KEY):
            try:
                return _rest_generate(prompt, json_mode, image_path)
            except Exception as rest_exc:
                logger.error("Gemini REST fallback failed: %s", rest_exc)
        return ""


def _gemini_generate(prompt: str, json_mode: bool = False, image_path: Optional[str] = None) -> str:
    if not GEMINI_API_KEY or not _is_valid_gemini_key(GEMINI_API_KEY):
        return ""
    if _USE_NEW_SDK and _gemini_client:
        try:
            return _sdk_generate(prompt, json_mode, image_path)
        except Exception as exc:
            logger.warning("Gemini SDK failed, trying REST: %s", exc)
    try:
        return _rest_generate(prompt, json_mode, image_path)
    except Exception as exc:
        logger.error("Gemini call failed: %s", exc)
        return ""


async def call_gemini(prompt: str, json_mode: bool = False) -> str:
    return await asyncio.to_thread(_gemini_generate, prompt, json_mode, None)


async def structure_invoice_with_gemini(raw_text: str, partial: dict) -> dict:
    prompt = f"""You are an invoice extraction expert. Parse this OCR text from a restaurant supplier invoice.
Return JSON with: supplierName, invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate, gstNumber,
supplierAddress, phoneNumber, email, paymentTerms, purchaseOrderNumber, currency,
subtotal, tax, total, notes, invoiceType (printed|handwritten|mixed),
items (array: name, quantity, unit, unitPrice, discount, taxPercent, taxAmount, total, confidence),
category (food|supplies|utilities|equipment|other).

OCR Text:
{raw_text[:4000]}

Partial extraction: {json.dumps({k: partial.get(k) for k in ['supplierName', 'total']})}
Return only valid JSON."""
    result = await call_gemini(prompt, json_mode=True)
    parsed = _parse_json_response(result)
    return {**partial, **parsed} if parsed else partial


async def extract_invoice_from_image(image_path: str) -> dict:
    prompt = """Extract all fields from this supplier invoice image for a restaurant.
Return JSON only with:
supplierName, invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate, gstNumber,
supplierAddress, phoneNumber, email, paymentTerms, purchaseOrderNumber, currency,
subtotal, tax, total, notes, invoiceType (printed|handwritten|mixed),
items (array of: name, quantity, unit, unitPrice, discount, taxPercent, taxAmount, total, confidence),
category (food|supplies|utilities|equipment|other),
rawText (all visible text concatenated)."""
    result = await asyncio.to_thread(_gemini_generate, prompt, True, image_path)
    parsed = _parse_json_response(result)
    if not parsed:
        return {}
    parsed["ocrEngine"] = "gemini-vision"
    parsed["averageConfidence"] = 0.85
    return parsed


async def get_ai_recommendation(context: str, data: dict) -> Optional[str]:
    prompt = f"""As a restaurant AI advisor, provide a brief recommendation (2-3 sentences) for:
{context}
Data: {json.dumps(data, default=str)[:2000]}"""
    return await call_gemini(prompt)
