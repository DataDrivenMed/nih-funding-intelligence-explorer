"""
06_prepare_app_data.py
Prepare all app-ready JSON data files from validated analysis outputs.

Inputs:  outputs/*.csv  (validated by 03_validate_outputs.py)
         outputs/insight_cards.json  (from 04_generate_narrative.py)
Outputs: app/public/data/*.json  (10 specialized files)

Run: py -X utf8 scripts/06_prepare_app_data.py
"""

import io, sys, os, json, math, shutil
from datetime import date
import pandas as pd
import numpy as np

# ── UTF-8 console ─────────────────────────────────────────────────────────────
_out = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

def log(msg=""):
    _out.write(msg + "\n"); _out.flush()

def warn(msg):
    _out.write(f"  WARN  {msg}\n"); _out.flush()

# ── Helpers ───────────────────────────────────────────────────────────────────
def make_safe(obj):
    """Recursively replace NaN/inf/numpy scalars with JSON-safe Python types."""
    if isinstance(obj, dict):
        return {k: make_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_safe(v) for v in obj]
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj

def r(v, decimals=4):
    """Round scalar (float or NaN) to given decimals; return None for NaN."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return round(float(v), decimals)

def write_json(path, obj, label):
    data = make_safe(obj)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    size = os.path.getsize(path)
    log(f"  wrote {os.path.basename(path):<35}  {size:>8,} bytes  [{label}]")

def quadrant_id(eep50, ow, eep50_med, ow_med):
    """Map EEP50 / OW values to camelCase quadrant ID."""
    if eep50 is None or math.isnan(eep50):
        return None
    ow_val = ow if ow is not None and not math.isnan(ow) else None
    if eep50 < eep50_med:
        if ow_val is not None and ow_val >= ow_med:
            return "competitiveProbabilistic"
        return "sharpPayline"
    else:
        if ow_val is not None and ow_val >= ow_med:
            return "broadOpportunityWindow"
        return "moderateFocused"

def quadrant_label(qid):
    return {
        "sharpPayline":             "Sharp Payline",
        "competitiveProbabilistic": "Competitive & Probabilistic",
        "moderateFocused":          "Moderate & Focused",
        "broadOpportunityWindow":   "Broad Opportunity Window",
    }.get(qid, "Unknown")

# ── Transition normalization ───────────────────────────────────────────────────
TRANSITION_KEYS = {
    "20→15": "20to15",
    "18→12": "18to12",
    "15→10": "15to10",
    "12→8":  "12to8",
}
TRANSITION_META = [
    {"id": "20to15", "label": "20→15", "from": 20, "to": 15, "description": "Outer zone → mid zone"},
    {"id": "18to12", "label": "18→12", "from": 18, "to": 12, "description": "Mid zone → near payline"},
    {"id": "15to10", "label": "15→10", "from": 15, "to": 10, "description": "Near payline → high-prob zone"},
    {"id": "12to8",  "label": "12→8",  "from": 12, "to":  8, "description": "High-prob zone → near-certain"},
]

BAND_ORDER = ["1-5", "6-10", "11-15", "16-20", "21-25", "26+"]
BAND_MIDPOINTS = {"1-5": 3, "6-10": 8, "11-15": 13, "16-20": 18, "21-25": 23, "26+": 30}

QUADRANT_DESCS = {
    "sharpPayline": (
        "Applications either score clearly below the threshold or have near-zero probability. "
        "Little probabilistic middle ground. Resubmission value is lower unless the score improves past EEP80."
    ),
    "competitiveProbabilistic": (
        "High baseline competition, but a wide opportunity window means resubmission still moves "
        "the needle significantly."
    ),
    "moderateFocused": (
        "More accessible funding environment, but the payline is relatively crisp. "
        "Near-miss applications face a sharp drop in probability."
    ),
    "broadOpportunityWindow": (
        "Highest resubmission leverage — probabilistic outcomes across a wide score range. "
        "Scores well above EEP50 still retain meaningful funding probability."
    ),
}


# ── Load inputs ───────────────────────────────────────────────────────────────
log("Loading validated CSV outputs…")
PL  = pd.read_csv("outputs/nih_effective_paylines.csv")
BS  = pd.read_csv("outputs/nih_percentile_band_summary.csv")
RS  = pd.read_csv("outputs/nih_resubmission_opportunity_by_institute.csv")
SU  = pd.read_csv("outputs/nih_institute_summary.csv")
with open("outputs/insight_cards.json", encoding="utf-8") as f:
    CARDS = json.load(f)

log(f"  paylines:          {len(PL):>5} rows")
log(f"  band_summary:      {len(BS):>5} rows")
log(f"  resubmission:      {len(RS):>5} rows")
log(f"  institute_summary: {len(SU):>5} rows")

YEARS      = sorted(PL["Year"].unique().tolist())
INSTITUTES = sorted(PL["Institute"].unique().tolist())
IC_ONLY    = [ic for ic in INSTITUTES if ic != "ALL NIH"]

# Compute FY2025 typology thresholds from ICs only (excluding ALL NIH)
fy25_ic = SU[(SU.Year == 2025) & (SU.Institute != "ALL NIH")]
EEP50_MED = float(fy25_ic["EEP50"].dropna().median())
OW_MED    = float(fy25_ic["Opportunity_Width"].dropna().median())
log(f"  FY2025 medians: EEP50={EEP50_MED:.2f}, OW={OW_MED:.2f}")

# Output directory
OUT_DIR = os.path.join("app", "public", "data")
os.makedirs(OUT_DIR, exist_ok=True)

log(f"\nWriting {OUT_DIR}/…\n")


# ══════════════════════════════════════════════════════════════════════════════
# 1. meta.json — Global reference constants
# ══════════════════════════════════════════════════════════════════════════════
def build_meta():
    null_eep = PL[PL["EEP50"].isna()][["Year", "Institute"]].to_dict("records")
    return {
        "_version": 1,
        "generatedAt":   str(date.today()),
        "source":        CARDS["meta"]["source"],
        "dataVintage":   CARDS["meta"]["data_vintage"],
        "qcStatus":      CARDS["meta"]["qc_status"],
        "fy2025Caution": CARDS["meta"]["fy2025_caution"],
        "years":         YEARS,
        "latestYear":    max(YEARS),
        "institutes":    INSTITUTES,
        "icOnly":        IC_ONLY,
        "bands":         BAND_ORDER,
        "bandMidpoints": BAND_MIDPOINTS,
        "transitions":   TRANSITION_META,
        "typologyThresholds": {
            "eep50Median": round(EEP50_MED, 2),
            "owMedian":    round(OW_MED, 2),
            "year":        2025,
        },
        "dataQuality": {
            "totalPaylineRows": len(PL),
            "nullEepRows": int(PL["EEP50"].isna().sum()),
            "nullEepCombos": [{"year": int(d["Year"]), "institute": d["Institute"]} for d in null_eep],
            "r56SuppressedRows": 4534,
            "glmConvergedCount": int(PL["GLM_Converged"].sum()),
        },
    }

write_json(f"{OUT_DIR}/meta.json", build_meta(), "global constants")


# ══════════════════════════════════════════════════════════════════════════════
# 2. kpi_summary.json — Dashboard headline cards
# ══════════════════════════════════════════════════════════════════════════════
def build_kpi_summary():
    all_nih_pl = PL[PL.Institute == "ALL NIH"].sort_values("Year")
    all_nih_su = SU[SU.Institute == "ALL NIH"].sort_values("Year")

    # Time-series for all-NIH KPI trend sparklines
    by_year = []
    for _, row in all_nih_pl.iterrows():
        su_row = all_nih_su[all_nih_su.Year == row.Year]
        by_year.append({
            "year":             int(row.Year),
            "eep80":            r(row.EEP80, 2),
            "eep50":            r(row.EEP50, 2),
            "eep20":            r(row.EEP20, 2),
            "opportunityWidth": r(row.Opportunity_Width, 2),
            "pseudoR2":         r(row.Pseudo_R2, 4),
            "overallFundingRate": r(su_row["Overall_Funding_Rate"].values[0], 4) if len(su_row) else None,
            "eep50YoYChange":   r(su_row["EEP50_YoY_Change"].values[0], 2) if len(su_row) else None,
        })

    # FY2025 headline cards
    row25  = all_nih_pl[all_nih_pl.Year == 2025].iloc[0]
    su25   = all_nih_su[all_nih_su.Year == 2025].iloc[0]
    row24  = all_nih_pl[all_nih_pl.Year == 2024].iloc[0]

    hist_eep50 = all_nih_pl[(all_nih_pl.Year >= 2015) & (all_nih_pl.Year <= 2024)]["EEP50"].dropna()
    hist_mean  = float(hist_eep50.mean())
    hist_std   = float(hist_eep50.std())
    z_score    = (float(row25.EEP50) - hist_mean) / hist_std if hist_std > 0 else None

    fy25_ics   = SU[(SU.Year == 2025) & (SU.Institute != "ALL NIH")].copy()
    ics_neg    = fy25_ics[fy25_ics.EEP50_YoY_Change < 0]
    most_comp  = fy25_ics.dropna(subset=["EEP50"]).nsmallest(1, "EEP50").iloc[0]
    least_comp = fy25_ics.dropna(subset=["EEP50"]).nlargest(1, "EEP50").iloc[0]
    most_drop  = fy25_ics.dropna(subset=["EEP50_YoY_Change"]).nsmallest(1, "EEP50_YoY_Change").iloc[0]
    least_drop = fy25_ics.dropna(subset=["EEP50_YoY_Change"]).nlargest(1, "EEP50_YoY_Change").iloc[0]
    ics_below10 = sorted(fy25_ics[fy25_ics.EEP50 < 10]["Institute"].tolist())

    # Rate comparison
    su19 = all_nih_su[all_nih_su.Year == 2019]
    rate19 = float(su19["Overall_Funding_Rate"].values[0]) if len(su19) else None

    headlines = [
        {
            "id": "allNihEep50",
            "label": "ALL NIH EEP50 (FY2025)",
            "value": r(row25.EEP50, 1),
            "unit": "percentile",
            "delta": r(float(row25.EEP50) - float(row24.EEP50), 1),
            "deltaFormatted": f"{float(row25.EEP50) - float(row24.EEP50):+.1f} pp",
            "trend": "down",
            "note": f"Historical mean (2015–2024): {hist_mean:.1f}; z = {z_score:.1f}σ",
            "alert": True,
        },
        {
            "id": "allNihFundingRate",
            "label": "ALL NIH Overall Funding Rate (FY2025)",
            "value": round(float(su25.Overall_Funding_Rate) * 100, 1),
            "unit": "percent",
            "delta": round((float(su25.Overall_Funding_Rate) - rate19) * 100, 1) if rate19 else None,
            "deltaFormatted": f"{(float(su25.Overall_Funding_Rate) - rate19) * 100:+.1f} pp vs FY2019" if rate19 else None,
            "trend": "down",
            "note": f"FY2019: {rate19 * 100:.1f}%",
            "alert": True,
        },
        {
            "id": "opportunityWidth",
            "label": "ALL NIH Opportunity Width (FY2025)",
            "value": r(row25.Opportunity_Width, 1),
            "unit": "percentile points",
            "delta": r(float(row25.Opportunity_Width) - float(row24.Opportunity_Width), 1),
            "trend": "down",
            "note": "EEP20 − EEP80; narrowest in 12-year dataset",
            "alert": False,
        },
        {
            "id": "icsCompressed",
            "label": "ICs with Tighter Paylines (2024→2025)",
            "value": len(ics_neg),
            "unit": "of 19 ICs",
            "delta": None,
            "trend": "down",
            "note": "First universal compression event in this dataset",
            "alert": True,
        },
        {
            "id": "icsBelowEep10",
            "label": "ICs with EEP50 < 10 (FY2025)",
            "value": len(ics_below10),
            "unit": "ICs",
            "delta": None,
            "trend": "down",
            "note": ", ".join(ics_below10),
            "alert": False,
        },
        {
            "id": "modelFit",
            "label": "Model Fit Quality (ALL NIH avg R²)",
            "value": r(float(all_nih_pl["Pseudo_R2"].mean()), 3),
            "unit": "McFadden R²",
            "delta": None,
            "trend": "stable",
            "note": "Near-perfect logistic fit across all 12 years",
            "alert": False,
        },
    ]

    return {
        "_version": 1,
        "allNihByYear": by_year,
        "fy2025Headlines": headlines,
        "fy2025Compression": {
            "allNegative": bool(len(ics_neg) == len(fy25_ics.dropna(subset=["EEP50_YoY_Change"]))),
            "mostCompressed":    {"institute": most_drop.Institute,  "eep50YoYChange": r(most_drop.EEP50_YoY_Change, 2)},
            "leastCompressed":   {"institute": least_drop.Institute, "eep50YoYChange": r(least_drop.EEP50_YoY_Change, 2)},
            "mostCompetitive":   {"institute": most_comp.Institute,  "eep50": r(most_comp.EEP50, 2)},
            "leastCompetitive":  {"institute": least_comp.Institute, "eep50": r(least_comp.EEP50, 2)},
            "icsBelowEep50_10":  ics_below10,
            "historicalMeanEep50": round(hist_mean, 2),
            "historicalStdEep50":  round(hist_std, 2),
            "zScore2025":          round(z_score, 2) if z_score else None,
        },
    }

write_json(f"{OUT_DIR}/kpi_summary.json", build_kpi_summary(), "dashboard KPI cards")


# ══════════════════════════════════════════════════════════════════════════════
# 3. payline_curves.json — β0/β1 + EEP values per IC-year (for smooth curves)
# ══════════════════════════════════════════════════════════════════════════════
def build_payline_curves():
    rows = []
    for _, row in PL.sort_values(["Institute", "Year"]).iterrows():
        rows.append({
            "year":             int(row.Year),
            "institute":        row.Institute,
            "beta0":            r(row.Beta0, 6),
            "beta1":            r(row.Beta1, 6),
            "eep80":            r(row.EEP80, 2),
            "eep50":            r(row.EEP50, 2),
            "eep20":            r(row.EEP20, 2),
            "opportunityWidth": r(row.Opportunity_Width, 2),
            "pseudoR2":         r(row.Pseudo_R2, 4),
            "glmConverged":     bool(row.GLM_Converged),
            "nObsFit":          int(row.N_Obs_Fit),
            "modelNote":        None if pd.isna(row.Model_Note) else str(row.Model_Note),
        })
    return rows

write_json(f"{OUT_DIR}/payline_curves.json", build_payline_curves(), "GLM params + EEP values for curve rendering")


# ══════════════════════════════════════════════════════════════════════════════
# 4. trend_eep.json — EEP50/80/20 + rates time-series for every institute
# ══════════════════════════════════════════════════════════════════════════════
def build_trend_eep():
    series = []
    for inst in INSTITUTES:
        pl_inst = PL[PL.Institute == inst].sort_values("Year")
        su_inst = SU[SU.Institute == inst].sort_values("Year")

        data = []
        for yr in YEARS:
            pr = pl_inst[pl_inst.Year == yr]
            sr = su_inst[su_inst.Year == yr]
            if len(pr) == 0:
                # NIMHD absent 2014–2015
                data.append({"year": yr, "eep80": None, "eep50": None, "eep20": None,
                              "ow": None, "overallRate": None, "eep50YoY": None})
                continue
            pr = pr.iloc[0]
            sr_val = sr.iloc[0] if len(sr) else None
            data.append({
                "year":        yr,
                "eep80":       r(pr.EEP80, 2),
                "eep50":       r(pr.EEP50, 2),
                "eep20":       r(pr.EEP20, 2),
                "ow":          r(pr.Opportunity_Width, 2),
                "overallRate": r(sr_val.Overall_Funding_Rate, 4) if sr_val is not None else None,
                "eep50YoY":   r(sr_val.EEP50_YoY_Change, 2) if sr_val is not None else None,
            })

        series.append({
            "institute":   inst,
            "isAggregate": inst == "ALL NIH",
            "data":        data,
        })

    return {"years": YEARS, "series": series}

write_json(f"{OUT_DIR}/trend_eep.json", build_trend_eep(), "EEP50/80/20 trend series for line charts")


# ══════════════════════════════════════════════════════════════════════════════
# 5. band_heatmap.json — rate by institute × year × band (for heatmap cells)
# ══════════════════════════════════════════════════════════════════════════════
def build_band_heatmap():
    cells = []
    for _, row in BS.iterrows():
        cells.append({
            "year":      int(row.Year),
            "institute": row.Institute,
            "band":      row.Percentile_Band,
            "rate":      r(row.Funding_Rate, 4),
            "funded":    int(row.Funded_Total) if not pd.isna(row.Funded_Total) else None,
            "total":     int(row.Applications_Total) if not pd.isna(row.Applications_Total) else None,
            "shareOfApps": r(row.Band_Share_of_Apps, 4),
        })

    return {
        "years":      YEARS,
        "institutes": INSTITUTES,
        "bands":      BAND_ORDER,
        "cells":      cells,
    }

write_json(f"{OUT_DIR}/band_heatmap.json", build_band_heatmap(), "funding rate cells for heatmap rendering")


# ══════════════════════════════════════════════════════════════════════════════
# 6. band_landscape.json — nested band rates by institute → year → band
#    Optimised for grouped bar charts and the landscape comparison view
# ══════════════════════════════════════════════════════════════════════════════
def build_band_landscape():
    by_inst = {}
    for inst in INSTITUTES:
        by_yr = {}
        for yr in YEARS:
            sub = BS[(BS.Institute == inst) & (BS.Year == yr)]
            if sub.empty:
                continue
            bands = {}
            for _, row in sub.iterrows():
                bands[row.Percentile_Band] = {
                    "rate":  r(row.Funding_Rate, 4),
                    "total": int(row.Applications_Total) if not pd.isna(row.Applications_Total) else None,
                }
            by_yr[str(yr)] = bands
        by_inst[inst] = by_yr

    # Also build flat rows for ALL NIH across key comparison years
    comparison_years = [2019, 2022, 2024, 2025]
    comparison_rows = []
    for band in BAND_ORDER:
        row_data: dict = {"band": band}
        for yr in comparison_years:
            sub = BS[(BS.Institute == "ALL NIH") & (BS.Year == yr) & (BS.Percentile_Band == band)]
            row_data[f"fy{yr}"] = r(sub["Funding_Rate"].values[0], 4) if len(sub) else None
        comparison_rows.append(row_data)

    return {
        "bands":           BAND_ORDER,
        "comparisonYears": comparison_years,
        "allNihComparison": comparison_rows,
        "byInstitute":     by_inst,
    }

write_json(f"{OUT_DIR}/band_landscape.json", build_band_landscape(), "band rates for grouped bar charts")


# ══════════════════════════════════════════════════════════════════════════════
# 7. resubmission_summary.json — all transitions, all ICs, FY2025 ranked view
# ══════════════════════════════════════════════════════════════════════════════
def build_resubmission_summary():
    # Nested structure: byYear[year][institute][transitionId]
    by_year: dict = {}
    for yr in YEARS:
        sub = RS[RS.Year == yr]
        by_inst: dict = {}
        for inst in INSTITUTES:
            inst_sub = sub[sub.Institute == inst]
            if inst_sub.empty:
                continue
            trans_data: dict = {}
            for _, row in inst_sub.iterrows():
                tid = TRANSITION_KEYS.get(row.Transition)
                if tid is None:
                    continue
                trans_data[tid] = {
                    "probFrom":    r(row.Prob_From, 4),
                    "probTo":      r(row.Prob_To, 4),
                    "absGain":     r(row.Absolute_Gain, 4),
                    "relGainPct":  r(row.Relative_Gain_Pct, 1),
                }
            if trans_data:
                by_inst[inst] = trans_data
        by_year[str(yr)] = by_inst

    # FY2025 ranked by absGain for each transition
    fy25 = RS[RS.Year == 2025]
    fy25_ranked: dict = {}
    for tm in TRANSITION_META:
        tid = tm["id"]
        label = tm["label"]
        sub = fy25[fy25.Transition == label].copy()
        sub = sub.dropna(subset=["Absolute_Gain"]).sort_values("Absolute_Gain", ascending=False)
        fy25_ranked[tid] = [
            {
                "institute": row.Institute,
                "absGain":   r(row.Absolute_Gain, 4),
                "relGainPct": r(row.Relative_Gain_Pct, 1),
                "probFrom":  r(row.Prob_From, 4),
                "probTo":    r(row.Prob_To, 4),
            }
            for _, row in sub.iterrows()
        ]

    return {
        "transitions":  TRANSITION_META,
        "byYear":       by_year,
        "fy2025Ranked": fy25_ranked,
    }

write_json(f"{OUT_DIR}/resubmission_summary.json", build_resubmission_summary(), "resubmission gains — all ICs, all years")


# ══════════════════════════════════════════════════════════════════════════════
# 8. typology.json — IC quadrant classifications for FY2025 scatter plot
# ══════════════════════════════════════════════════════════════════════════════
def build_typology():
    fy25_ics = SU[(SU.Year == 2025) & (SU.Institute != "ALL NIH")].copy()
    fy25_pl  = PL[(PL.Year == 2025) & (PL.Institute != "ALL NIH")].copy()

    institutes_data = []
    quad_members: dict = {q: [] for q in ["sharpPayline", "competitiveProbabilistic", "moderateFocused", "broadOpportunityWindow"]}

    for inst in IC_ONLY:
        su_row = fy25_ics[fy25_ics.Institute == inst]
        pl_row = fy25_pl[fy25_pl.Institute == inst]
        if su_row.empty:
            continue
        su_row = su_row.iloc[0]
        pl_row = pl_row.iloc[0] if len(pl_row) else None

        eep50 = float(su_row.EEP50) if not pd.isna(su_row.EEP50) else None
        ow    = float(su_row.Opportunity_Width) if not pd.isna(su_row.Opportunity_Width) else None
        qid   = quadrant_id(eep50, ow, EEP50_MED, OW_MED) if eep50 is not None else None

        entry = {
            "institute":       inst,
            "eep50":           r(eep50, 2),
            "eep80":           r(float(su_row.EEP80) if not pd.isna(su_row.EEP80) else None, 2),
            "eep20":           r(float(su_row.EEP20) if not pd.isna(su_row.EEP20) else None, 2),
            "opportunityWidth": r(ow, 2),
            "overallFundingRate": r(float(su_row.Overall_Funding_Rate) if not pd.isna(su_row.Overall_Funding_Rate) else None, 4),
            "eep50YoYChange":  r(float(su_row.EEP50_YoY_Change) if not pd.isna(su_row.EEP50_YoY_Change) else None, 2),
            "totalApplications": int(su_row.Total_Applications) if not pd.isna(su_row.Total_Applications) else None,
            "pseudoR2":        r(float(pl_row.Pseudo_R2) if pl_row is not None and not pd.isna(pl_row.Pseudo_R2) else None, 4),
            "typologyQuadrant":      qid,
            "typologyQuadrantLabel": quadrant_label(qid) if qid else None,
            "owIsNull": ow is None,
        }
        institutes_data.append(entry)
        if qid:
            quad_members[qid].append(inst)

    quadrants = {}
    for qid, descs in QUADRANT_DESCS.items():
        members = quad_members.get(qid, [])
        quadrants[qid] = {
            "id":          qid,
            "label":       quadrant_label(qid),
            "description": descs,
            "count":       len(members),
            "institutes":  members,
        }

    return {
        "year":       2025,
        "thresholds": {"eep50Median": round(EEP50_MED, 2), "owMedian": round(OW_MED, 2)},
        "quadrants":  quadrants,
        "institutes": institutes_data,
    }

write_json(f"{OUT_DIR}/typology.json", build_typology(), "IC typology quadrant classifications")


# ══════════════════════════════════════════════════════════════════════════════
# 9. institute_profiles.json — Rich per-IC profile for drill-down view
# ══════════════════════════════════════════════════════════════════════════════
def build_institute_profiles():
    profiles = []
    for inst in INSTITUTES:
        su_inst = SU[SU.Institute == inst].sort_values("Year")
        pl_inst = PL[PL.Institute == inst].sort_values("Year")
        rs_inst = RS[RS.Institute == inst]
        bs_inst = BS[BS.Institute == inst]

        # FY2025 snapshot
        su25_rows = su_inst[su_inst.Year == 2025]
        pl25_rows = pl_inst[pl_inst.Year == 2025]

        if su25_rows.empty:
            warn(f"No FY2025 data for {inst} in institute_summary")
            continue

        su25 = su25_rows.iloc[0]
        pl25 = pl25_rows.iloc[0] if len(pl25_rows) else None

        eep50_25 = float(su25.EEP50) if not pd.isna(su25.EEP50) else None
        ow_25    = float(su25.Opportunity_Width) if not pd.isna(su25.Opportunity_Width) else None
        qid      = quadrant_id(eep50_25, ow_25, EEP50_MED, OW_MED) if eep50_25 is not None else None

        fy2025 = {
            "eep80":              r(float(su25.EEP80) if not pd.isna(su25.EEP80) else None, 2),
            "eep50":              r(eep50_25, 2),
            "eep20":              r(float(su25.EEP20) if not pd.isna(su25.EEP20) else None, 2),
            "opportunityWidth":   r(ow_25, 2),
            "overallFundingRate": r(float(su25.Overall_Funding_Rate) if not pd.isna(su25.Overall_Funding_Rate) else None, 4),
            "totalApplications":  int(su25.Total_Applications) if not pd.isna(su25.Total_Applications) else None,
            "totalFunded":        int(su25.Total_Funded) if not pd.isna(su25.Total_Funded) else None,
            "eep50YoYChange":     r(float(su25.EEP50_YoY_Change) if not pd.isna(su25.EEP50_YoY_Change) else None, 2),
            "typologyQuadrant":        qid,
            "typologyQuadrantLabel":   quadrant_label(qid) if qid else None,
            "pseudoR2":           r(float(pl25.Pseudo_R2) if pl25 is not None and not pd.isna(pl25.Pseudo_R2) else None, 4),
        }

        # FY2025 band rates
        bs25 = bs_inst[bs_inst.Year == 2025]
        band_rates_25 = {}
        for band in BAND_ORDER:
            sub = bs25[bs25.Percentile_Band == band]
            if len(sub):
                row = sub.iloc[0]
                band_rates_25[band] = {
                    "rate":  r(row.Funding_Rate, 4),
                    "total": int(row.Applications_Total) if not pd.isna(row.Applications_Total) else None,
                }

        # FY2025 resubmission gains
        rs25 = rs_inst[rs_inst.Year == 2025]
        resub25 = {}
        for tm in TRANSITION_META:
            sub = rs25[rs25.Transition == tm["label"]]
            if len(sub):
                row = sub.iloc[0]
                resub25[tm["id"]] = {
                    "probFrom":   r(row.Prob_From, 4),
                    "probTo":     r(row.Prob_To, 4),
                    "absGain":    r(row.Absolute_Gain, 4),
                    "relGainPct": r(row.Relative_Gain_Pct, 1),
                }

        # Full history
        history = []
        for yr in YEARS:
            pl_row = pl_inst[pl_inst.Year == yr]
            su_row = su_inst[su_inst.Year == yr]
            if pl_row.empty and su_row.empty:
                history.append({"year": yr, "eep50": None, "eep80": None, "eep20": None,
                                 "ow": None, "overallRate": None, "eep50YoY": None})
                continue
            pr = pl_row.iloc[0] if len(pl_row) else None
            sr = su_row.iloc[0] if len(su_row) else None
            history.append({
                "year":        yr,
                "eep80":       r(float(pr.EEP80) if pr is not None and not pd.isna(pr.EEP80) else None, 2),
                "eep50":       r(float(pr.EEP50) if pr is not None and not pd.isna(pr.EEP50) else None, 2),
                "eep20":       r(float(pr.EEP20) if pr is not None and not pd.isna(pr.EEP20) else None, 2),
                "ow":          r(float(pr.Opportunity_Width) if pr is not None and not pd.isna(pr.Opportunity_Width) else None, 2),
                "overallRate": r(float(sr.Overall_Funding_Rate) if sr is not None and not pd.isna(sr.Overall_Funding_Rate) else None, 4),
                "eep50YoY":   r(float(sr.EEP50_YoY_Change) if sr is not None and not pd.isna(sr.EEP50_YoY_Change) else None, 2),
            })

        profiles.append({
            "institute":         inst,
            "isAggregate":       inst == "ALL NIH",
            "fy2025":            fy2025,
            "bandRates2025":     band_rates_25,
            "resubmission2025":  resub25,
            "history":           history,
        })

    return profiles

write_json(f"{OUT_DIR}/institute_profiles.json", build_institute_profiles(), "full per-IC profile with history + resubmission")


# ══════════════════════════════════════════════════════════════════════════════
# 10. insight_cards.json — narrative content (copy from outputs/)
# ══════════════════════════════════════════════════════════════════════════════
shutil.copy("outputs/insight_cards.json", f"{OUT_DIR}/insight_cards.json")
log(f"  copied insight_cards.json                    (narrative content for InsightCard components)")


# ── Validation summary ────────────────────────────────────────────────────────
log("\n── Validation ──────────────────────────────────────────────────────────────")
files = sorted(os.listdir(OUT_DIR))
total_bytes = 0
for fn in files:
    fp = os.path.join(OUT_DIR, fn)
    sz = os.path.getsize(fp)
    total_bytes += sz
    # Quick sanity: valid JSON?
    with open(fp, encoding="utf-8") as f:
        json.load(f)
    log(f"  OK  {fn:<40}  {sz:>8,} bytes")

log(f"\n  Total: {len(files)} files, {total_bytes:,} bytes ({total_bytes/1024:.0f} KB)")
log(f"  All files parse as valid JSON.\n")
log(f"  Next: run app and reference app/public/data/ from front-end.")
