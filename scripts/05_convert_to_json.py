"""
05_convert_to_json.py
Convert validated output CSVs to compact JSON files for the web app.
Run: py -X utf8 scripts/05_convert_to_json.py
Output: web/src/data/*.json
"""
import io
import sys
import os
import json
import math
import shutil

import pandas as pd

_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

def log(msg: str) -> None:
    _stdout.write(msg + "\n")
    _stdout.flush()

def make_json_safe(obj):
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_json_safe(v) for v in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return round(obj, 6)
    return obj

OUT_DIR = os.path.join("web", "src", "data")
os.makedirs(OUT_DIR, exist_ok=True)

FILES = {
    "paylines":           "outputs/nih_effective_paylines.csv",
    "band_summary":       "outputs/nih_percentile_band_summary.csv",
    "resubmission":       "outputs/nih_resubmission_opportunity_by_institute.csv",
    "institute_summary":  "outputs/nih_institute_summary.csv",
}

for name, path in FILES.items():
    if not os.path.exists(path):
        log(f"ERROR: {path} not found — run 02_analyze_nih_data.py first")
        sys.exit(1)
    df = pd.read_csv(path)
    records = df.to_dict(orient="records")
    safe = make_json_safe(records)
    out_path = os.path.join(OUT_DIR, f"{name}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(safe, f, separators=(",", ":"), ensure_ascii=False)
    size = os.path.getsize(out_path)
    log(f"  {path} -> {out_path}  ({len(records)} records, {size:,} bytes)")

# Copy insight_cards.json
src_json = "outputs/insight_cards.json"
dst_json = os.path.join(OUT_DIR, "insight_cards.json")
if not os.path.exists(src_json):
    log(f"ERROR: {src_json} not found — run 04_generate_narrative.py first")
    sys.exit(1)
shutil.copy(src_json, dst_json)
log(f"  {src_json} -> {dst_json}  ({os.path.getsize(dst_json):,} bytes)")

log(f"\nAll data files written to {OUT_DIR}/")
log("Next: cd web && npm install && npm run dev")
