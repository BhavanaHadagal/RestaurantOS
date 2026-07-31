"""Standalone EasyOCR worker — run in a fresh Python process to avoid torch DLL issues in uvicorn."""
import json
import sys


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: easyocr_worker.py <image_path> <result_json_path>", file=sys.stderr)
        return 2

    image_path, result_path = sys.argv[1], sys.argv[2]
    payload = {"ok": False, "results": [], "engine": "none"}

    try:
        import easyocr

        reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        raw = reader.readtext(image_path)
        results = []
        for box, text, conf in raw:
            box_list = box.tolist() if hasattr(box, "tolist") else box
            results.append([box_list, str(text), float(conf)])
        payload = {"ok": True, "results": results, "engine": "easyocr"}
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
