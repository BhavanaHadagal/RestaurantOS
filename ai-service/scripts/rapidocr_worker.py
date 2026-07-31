"""Standalone RapidOCR worker — fresh Python process avoids onnxruntime DLL issues in uvicorn."""
import json
import sys


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: rapidocr_worker.py <image_path> <result_json_path>", file=sys.stderr)
        return 2

    image_path, result_path = sys.argv[1], sys.argv[2]
    payload = {"ok": False, "results": [], "engine": "none"}

    try:
        from rapidocr_onnxruntime import RapidOCR

        engine = RapidOCR()
        raw, _ = engine(image_path)
        results = []
        for item in raw or []:
            if len(item) >= 2:
                box, text = item[0], item[1]
                conf = float(item[2]) if len(item) > 2 else 0.75
                results.append([box, str(text), conf])
        payload = {"ok": bool(results), "results": results, "engine": "rapidocr"}
    except Exception as exc:
        payload["error"] = str(exc)

    tmp = result_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)
    import os
    os.replace(tmp, result_path)
    return 0 if payload.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
