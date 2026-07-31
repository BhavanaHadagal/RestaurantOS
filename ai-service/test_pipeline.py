"""Test OCR pipeline on latest upload."""
import time

from app.services.ocr_service import extract_text_from_image_safe
from app.services.invoice_parser import parse_invoice_text

path = r"E:\RestaurantOS\backend\uploads\291313f1-1fe0-4499-90fd-746c6eb2441d.png"
t0 = time.time()
results, engine = extract_text_from_image_safe(path, timeout=180)
print(f"engine={engine} lines={len(results)} elapsed={time.time()-t0:.1f}s")
if results:
    parsed = parse_invoice_text(results, engine)
    print("supplier:", parsed.get("supplierName"))
    print("invoice:", parsed.get("invoiceNumber"))
    print("total:", parsed.get("total"))
    print("items:", len(parsed.get("items") or []))
    print("raw preview:", (parsed.get("rawText") or "")[:300])
