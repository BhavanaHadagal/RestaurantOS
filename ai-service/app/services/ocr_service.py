import json
import logging
import multiprocessing as mp
import os
import re
import subprocess
import sys
import tempfile
import threading
from typing import List, Tuple

import cv2
import numpy as np

from app.config import TESSERACT_CMD

logger = logging.getLogger(__name__)

SKIP_EASYOCR = os.getenv("SKIP_EASYOCR", "1" if os.name == "nt" else "0") == "1"

OCR_ENGINE = "none"
_ocr_reader = None
_paddle_ocr = None
_init_lock = threading.Lock()
_initialized = False


def _ensure_ocr_initialized() -> None:
    global _ocr_reader, _paddle_ocr, OCR_ENGINE, _initialized
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        try:
            from paddleocr import PaddleOCR
            _paddle_ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            OCR_ENGINE = "paddleocr"
            logger.info("PaddleOCR initialized")
        except Exception as exc:
            logger.warning("PaddleOCR unavailable: %s", exc)
            if SKIP_EASYOCR:
                logger.info("EasyOCR skipped (SKIP_EASYOCR=1) — install Tesseract for stable OCR")
                OCR_ENGINE = "none"
            else:
                try:
                    import easyocr
                    _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
                    OCR_ENGINE = "easyocr"
                    logger.info("EasyOCR initialized (fallback)")
                except Exception as exc2:
                    logger.warning("EasyOCR unavailable: %s", exc2)
                    OCR_ENGINE = "none"
        _initialized = True


def peek_ocr_status() -> dict:
    tesseract_ok = _tesseract_available()
    return {
        "engine": OCR_ENGINE if _initialized else ("tesseract" if tesseract_ok else "lazy"),
        "available": _initialized and OCR_ENGINE != "none" or tesseract_ok,
        "loaded": _initialized,
        "tesseract": tesseract_ok,
    }


def get_ocr_status() -> dict:
    _ensure_ocr_initialized()
    status = peek_ocr_status()
    status["loaded"] = True
    status["available"] = status["available"] or _tesseract_available()
    return status


def _configure_tesseract() -> None:
    import pytesseract
    candidates = []
    if TESSERACT_CMD and os.path.isfile(TESSERACT_CMD):
        candidates.append(TESSERACT_CMD)
    candidates.extend([
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ])
    for candidate in candidates:
        if os.path.isfile(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            return


def _tesseract_available() -> bool:
    try:
        import pytesseract
        _configure_tesseract()
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def detect_skew_angle(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
    if lines is None:
        return 0.0
    angles = []
    for rho, theta in lines[:20, 0]:
        angle = (theta * 180 / np.pi) - 90
        if -45 < angle < 45:
            angles.append(angle)
    return float(np.median(angles)) if angles else 0.0


def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    if abs(angle) < 0.5:
        return image
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def preprocess_image(image_path: str) -> str:
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    angle = detect_skew_angle(img)
    img = rotate_image(img, angle)

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    out_path = image_path + "_processed.png"
    cv2.imwrite(out_path, binary)
    return out_path


def extract_with_tesseract(image_path: str) -> Tuple[List, str]:
    """Stable OCR via Tesseract — preferred on Windows."""
    import pytesseract
    from PIL import Image

    _configure_tesseract()
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img, lang="eng")
    if not text.strip():
        processed = preprocess_image(image_path)
        text = pytesseract.image_to_string(Image.open(processed), lang="eng")
        if processed != image_path and os.path.exists(processed):
            try:
                os.remove(processed)
            except OSError:
                pass

    results = []
    for line in text.splitlines():
        line = line.strip()
        if len(line) > 1:
            results.append(([], line, 0.78))
    return results, "tesseract" if results else "none"


def extract_with_windows_ocr(image_path: str) -> Tuple[List, str]:
    """Windows 10+ built-in OCR — no extra binary install needed."""
    try:
        from winocr import recognize_pil_sync
        from PIL import Image

        def _parse_result(result) -> Tuple[List, str]:
            lines = []
            if isinstance(result, dict):
                for line in result.get("lines") or []:
                    text = line.get("text") if isinstance(line, dict) else str(line)
                    if text and text.strip():
                        lines.append(([], text.strip(), 0.82))
                if not lines and result.get("text"):
                    for part in str(result["text"]).splitlines():
                        if part.strip():
                            lines.append(([], part.strip(), 0.82))
            elif hasattr(result, "lines"):
                for line in result.lines:
                    text = getattr(line, "text", str(line))
                    if text.strip():
                        lines.append(([], text.strip(), 0.82))
            elif hasattr(result, "text") and result.text:
                for part in str(result.text).splitlines():
                    if part.strip():
                        lines.append(([], part.strip(), 0.82))
            return lines, "windows-ocr" if lines else "none"

        img = Image.open(image_path)
        result = recognize_pil_sync(img, lang="en")
        lines, engine = _parse_result(result)
        if lines:
            return lines, engine

        processed = preprocess_image(image_path)
        result = recognize_pil_sync(Image.open(processed), lang="en")
        lines, engine = _parse_result(result)
        if processed != image_path and os.path.exists(processed):
            try:
                os.remove(processed)
            except OSError:
                pass
        return lines, engine if lines else "none"
    except Exception as exc:
        logger.warning("Windows OCR failed: %s", exc)
        return [], "none"


def extract_with_paddle(image_path: str) -> List[Tuple]:
    if not _paddle_ocr:
        return []
    result = _paddle_ocr.ocr(image_path, cls=True)
    output = []
    for line in result or []:
        for item in line or []:
            box, (text, conf) = item
            output.append((box, text, float(conf)))
    return output


_easyocr_reader = None
_easyocr_lock = threading.Lock()
_rapid_ocr = None
_rapid_lock = threading.Lock()
_EASYOCR_WORKER = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "easyocr_worker.py")
)
_RAPIDOCR_WORKER = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "rapidocr_worker.py")
)


def extract_with_rapidocr(image_path: str) -> List[Tuple]:
    """ONNX-based OCR — no PyTorch; reliable for handwriting on Windows."""
    global _rapid_ocr
    with _rapid_lock:
        if _rapid_ocr is None:
            from rapidocr_onnxruntime import RapidOCR
            logger.info("Loading RapidOCR (ONNX)...")
            _rapid_ocr = RapidOCR()
    result, _ = _rapid_ocr(image_path)
    output = []
    for item in result or []:
        if len(item) >= 2:
            box, text = item[0], item[1]
            conf = float(item[2]) if len(item) > 2 else 0.75
            output.append((box, str(text), conf))
    return output


def extract_with_easyocr(image_path: str) -> List[Tuple]:
    global _easyocr_reader
    with _easyocr_lock:
        if not _easyocr_reader:
            import easyocr
            logger.info("Loading EasyOCR model (one-time, ~30s)...")
            _easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    raw = _easyocr_reader.readtext(image_path)
    return [(box, text, float(conf)) for box, text, conf in raw]


def extract_with_easyocr_legacy(image_path: str) -> List[Tuple]:
    if not _ocr_reader:
        return []
    return _ocr_reader.readtext(image_path)


def extract_text_from_image(image_path: str) -> Tuple[List, str]:
    """Full OCR pipeline — Tesseract, Windows OCR, then Paddle/EasyOCR."""
    if _tesseract_available():
        try:
            results, engine = extract_with_tesseract(image_path)
            if results:
                return results, engine
        except Exception as exc:
            logger.warning("Tesseract OCR failed: %s", exc)

    try:
        results, engine = extract_with_windows_ocr(image_path)
        if results:
            return results, engine
    except Exception as exc:
        logger.warning("Windows OCR failed: %s", exc)

    _ensure_ocr_initialized()
    engine = OCR_ENGINE
    if engine == "none" or (SKIP_EASYOCR and engine == "easyocr"):
        return [], "none"

    processed_path = image_path
    try:
        processed_path = preprocess_image(image_path)
    except Exception as exc:
        logger.warning("Image preprocessing failed: %s", exc)
        processed_path = image_path

    results = extract_with_paddle(processed_path)
    used_engine = engine
    if not results and _ocr_reader:
        try:
            results = extract_with_easyocr_legacy(processed_path)
            used_engine = "easyocr" if results else engine
        except Exception as exc:
            logger.warning("EasyOCR failed: %s", exc)

    if processed_path != image_path and os.path.exists(processed_path):
        try:
            os.remove(processed_path)
        except OSError:
            pass

    return results, used_engine


def _json_safe(value):
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _serialize_results(results: List) -> list:
    serialized = []
    for item in results:
        if len(item) >= 3:
            box, text, conf = item[0], item[1], item[2]
            serialized.append([_json_safe(box), str(text), float(conf)])
    return serialized


def _deserialize_results(data: list) -> List:
    return [(item[0], item[1], item[2]) for item in data if len(item) >= 3]


def _write_payload(result_path: str, payload: dict) -> None:
    tmp = result_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)
    os.replace(tmp, result_path)


def _ocr_worker_entry(image_path: str, result_path: str) -> None:
    """Child process — Tesseract first to avoid EasyOCR segfaults on Windows."""
    try:
        results, engine = extract_text_from_image(image_path)
        _write_payload(result_path, {
            "ok": True,
            "results": _serialize_results(results),
            "engine": engine,
        })
    except Exception as exc:
        _write_payload(result_path, {
            "ok": False,
            "results": [],
            "engine": "none",
            "error": str(exc),
        })


def _looks_like_money(text: str) -> bool:
    """Detect plausible currency amounts, not stray single digits from garbage OCR."""
    t = text.strip()
    if re.search(r"(?:\$|₹|€|£|USD|INR)\s*\d", t, re.I):
        return True
    if re.search(r"\d{1,3}(?:,\d{3})+(?:\.\d{2})?", t):
        return True
    for match in re.finditer(r"\b(\d{2,}(?:\.\d{2})?)\b", t):
        try:
            if float(match.group(1).replace(",", "")) >= 10:
                return True
        except ValueError:
            pass
    return False


def _has_substantial_total(texts: List[str]) -> bool:
    for text in texts:
        for match in re.finditer(r"[\d,]+\.?\d*", text):
            try:
                if float(match.group().replace(",", "")) >= 50:
                    return True
            except ValueError:
                pass
    return False


def _ocr_results_poor(results: List) -> bool:
    if len(results) < 15:
        return True
    texts = [str(r[1]) for r in results if len(r) >= 2 and r[1]]
    if not texts:
        return True
    joined = " ".join(texts)
    alpha = sum(c.isalpha() for c in joined)
    if len(joined) > 0 and alpha / len(joined) < 0.35:
        return True

    money_lines = sum(1 for t in texts if _looks_like_money(t))
    if money_lines < 2:
        return True

    avg_len = sum(len(t) for t in texts) / len(texts)
    if avg_len < 10 and len(results) < 25:
        return True

    joined_lower = joined.lower()
    if any(k in joined_lower for k in ("invoice", "total", "amount")) and not _has_substantial_total(texts):
        return True

    return False


def _easyocr_worker_entry(image_path: str, result_path: str) -> None:
    try:
        import easyocr
        reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        raw = reader.readtext(image_path)
        results = [(box, text, float(conf)) for box, text, conf in raw]
        _write_payload(result_path, {
            "ok": True,
            "results": _serialize_results(results),
            "engine": "easyocr",
        })
    except Exception as exc:
        _write_payload(result_path, {
            "ok": False,
            "results": [],
            "engine": "none",
            "error": str(exc),
        })


def _run_ocr_cli(worker_path: str, image_path: str, timeout: int, default_engine: str) -> Tuple[List, str]:
    """Run an OCR worker script in a fresh Python process (avoids DLL issues in uvicorn)."""
    if not os.path.isfile(worker_path):
        logger.warning("OCR worker script missing: %s", worker_path)
        return [], "none"

    fd, result_path = tempfile.mkstemp(suffix=".ocr.json")
    os.close(fd)
    try:
        proc = subprocess.run(
            [sys.executable, worker_path, image_path, result_path],
            timeout=timeout,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            logger.warning("%s CLI failed (code %s): %s", default_engine, proc.returncode, err[:500])

        if not os.path.exists(result_path) or os.path.getsize(result_path) == 0:
            return [], "none"

        with open(result_path, encoding="utf-8") as fh:
            payload = json.load(fh)

        if payload.get("ok"):
            results = _deserialize_results(payload.get("results", []))
            return results, payload.get("engine", default_engine)
        logger.warning("%s CLI error: %s", default_engine, payload.get("error"))
        return [], "none"
    except subprocess.TimeoutExpired:
        logger.warning("%s CLI timed out for %s", default_engine, image_path)
        return [], "none"
    except json.JSONDecodeError as exc:
        logger.warning("%s CLI returned invalid JSON: %s", default_engine, exc)
        return [], "none"
    except Exception as exc:
        logger.warning("%s CLI exception: %s", default_engine, exc)
        return [], "none"
    finally:
        try:
            os.remove(result_path)
        except OSError:
            pass


def _run_rapidocr_cli(image_path: str, timeout: int) -> Tuple[List, str]:
    return _run_ocr_cli(_RAPIDOCR_WORKER, image_path, timeout, "rapidocr")


def _run_easyocr_cli(image_path: str, timeout: int) -> Tuple[List, str]:
    return _run_ocr_cli(_EASYOCR_WORKER, image_path, timeout, "easyocr")


def _run_ocr_subprocess(image_path: str, worker, timeout: int) -> Tuple[List, str]:
    fd, result_path = tempfile.mkstemp(suffix=".ocr.json")
    os.close(fd)
    try:
        ctx = mp.get_context("spawn")
        proc = ctx.Process(target=worker, args=(image_path, result_path))
        proc.start()
        proc.join(timeout)
        if proc.is_alive():
            proc.terminate()
            proc.join(5)
            logger.warning("OCR subprocess timed out for %s", image_path)
            return [], "none"
        if proc.exitcode not in (0, None):
            logger.warning("OCR subprocess exited with code %s", proc.exitcode)

        if not os.path.exists(result_path) or os.path.getsize(result_path) == 0:
            return [], "none"

        try:
            with open(result_path, encoding="utf-8") as fh:
                payload = json.load(fh)
        except json.JSONDecodeError:
            logger.warning("OCR subprocess returned invalid JSON for %s", image_path)
            return [], "none"

        if payload.get("ok"):
            return _deserialize_results(payload.get("results", [])), payload.get("engine", "none")
        logger.warning("OCR subprocess error: %s", payload.get("error"))
        return [], "none"
    finally:
        try:
            os.remove(result_path)
        except OSError:
            pass
        try:
            os.remove(result_path + ".tmp")
        except OSError:
            pass


def extract_text_from_image_safe(image_path: str, timeout: int = 90) -> Tuple[List, str]:
    """Run OCR — Windows/Tesseract first; EasyOCR for handwriting or poor results."""
    if _tesseract_available():
        try:
            results, engine = extract_with_tesseract(image_path)
            if results and not _ocr_results_poor(results):
                return results, engine
        except Exception as exc:
            logger.warning("Tesseract OCR failed: %s", exc)

    windows_results, windows_engine = [], "none"
    try:
        windows_results, windows_engine = extract_with_windows_ocr(image_path)
    except Exception as exc:
        logger.warning("Windows OCR failed: %s", exc)

    if windows_results and not _ocr_results_poor(windows_results):
        logger.info("Using %s (%d lines)", windows_engine, len(windows_results))
        return windows_results, windows_engine

    logger.info(
        "Windows OCR poor/missing (%d lines) — trying RapidOCR/EasyOCR for handwriting",
        len(windows_results),
    )

    cli_timeout = min(timeout, 120)
    rapid_results, rapid_engine = _run_rapidocr_cli(image_path, cli_timeout)
    if rapid_results and not _ocr_results_poor(rapid_results):
        logger.info("Using %s via CLI (%d lines)", rapid_engine, len(rapid_results))
        return rapid_results, rapid_engine
    if rapid_results:
        logger.info("RapidOCR CLI returned %d lines (still poor) — trying EasyOCR", len(rapid_results))

    easy_results, easy_engine = _run_easyocr_cli(image_path, cli_timeout)
    if easy_results:
        logger.info("Using %s via CLI (%d lines)", easy_engine, len(easy_results))
        return easy_results, easy_engine

    if not SKIP_EASYOCR:
        try:
            easy_raw = extract_with_easyocr(image_path)
            easy_results = [(box, text, conf) for box, text, conf in easy_raw]
            if easy_results:
                return easy_results, "easyocr"
        except Exception as exc:
            logger.warning("EasyOCR in-process failed: %s", exc)

    if windows_results:
        logger.warning(
            "All handwriting OCR failed — returning Windows OCR (%d lines) for manual review",
            len(windows_results),
        )
        return windows_results, windows_engine
    return [], "none"


def pdf_to_images(pdf_path: str, upload_dir: str) -> List[str]:
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=200)
        paths = []
        for i, img in enumerate(images[:5]):
            path = os.path.join(upload_dir, f"{os.path.basename(pdf_path)}_page{i}.png")
            img.save(path, "PNG")
            paths.append(path)
        return paths
    except ImportError:
        logger.warning("pdf2image not installed")
        return []
    except Exception as exc:
        logger.error("PDF conversion failed (install poppler on Windows): %s", exc)
        return []


def detect_invoice_type(full_text: str, avg_conf: float) -> str:
    if avg_conf < 0.55:
        return "handwritten"
    if avg_conf < 0.75:
        return "mixed"
    return "printed"
