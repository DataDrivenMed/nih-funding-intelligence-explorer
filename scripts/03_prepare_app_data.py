"""
03_prepare_app_data.py
======================
Prepare all app-ready JSON data files from validated analysis outputs.

Inputs  (must exist before running):
  outputs/nih_effective_paylines.csv
  outputs/nih_percentile_band_summary.csv
  outputs/nih_resubmission_opportunity_by_institute.csv
  outputs/nih_institute_summary.csv
  outputs/insight_cards.json

Outputs:  app/public/data/*.json  (10 files)

Run: py -X utf8 scripts/03_prepare_app_data.py
"""

import io, sys, os, json, math, shutil
from datetime import date

import pandas as pd
import numpy as np

# ── UTF-8 console (Windows) ────────────────────────────────────────────────────
_out = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

def log(msg=""):
    _out.write(msg + "\n"); _out.flush()

def warn(msg):
    _out.write(f"  WARN  {msg}\n"); _out.flush()

# ── JSON safety ────────────────────────────────────────────────────────────────
def _make_safe(obj):
    """Recursively replace NaN / inf / numpy scalars with JSON-native types."""
    if isinstance(obj, dict):
        return {k: _make_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_make_safe(v) for v in obj]
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

def _r(v, d=4):
    """Round a scalar to d decimals; return None for NaN/None."""
    if v is None:
        return None
    try:
        fv = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(fv) or math.isinf(fv) else round(fv, d)

def write_json(path, obj, label):
    data = _make_safe(obj)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    sz = os.path.getsize(path)
    log(f"  {os.path.basename(path):<40} {sz:>8,} bytes   [{label}]")

# ── Constants ──────────────────────────────────────────────────────────────────
BAND_ORDER    = ["1-5", "6-10", "11-15", "16-20", "21-25", "26+"]
BAND_MIDPOINT = {"1-5": 3, "6-10": 8, "11-15": 13, "16-20": 18, "21-25": 23, "26+": 30}

TRANSITION_MAP = {          # raw CSV value → camelCase JSON key
    "20\u219215": "20to15",  # 20→15
    "18\u219212": "18to12",
    "15\u219210": "15to10",
    "12\u21928":  "12to8",
}
TRANSITION_META = [
    {"id": "20to15", "label": "20\u219215", "from": 20, "to": 15,
     "description": "Outer zone \u2192 mid zone"},
    {"id": "18to12", "label": "18\u219212", "from": 18, "to": 12,
     "description": "Mid zone \u2192 near payline"},
    {"id": "15to10", "label": "15\u219210", "from": 15, "to": 10,
     "description": "Near payline \u2192 high-prob zone"},
    {"id": "12to8",  "label": "12\u21928",  "from": 12, "to":  8,
     "description": "High-prob zone \u2192 near-certain"},
]

QUADRANT_META = {
    "sharpPayline": {
        "label": "Sharp Payline",
        "description": (
            "Applications either score below the threshold or face near-zero probability. "
            "Resubmission value is limited unless the score clears EEP80."
        ),
    },
    "competitiveProbabilistic": {
        "label": "Competitive & Probabilistic",
        "description": (
            "High baseline competition but a wide opportunity window means "
            "resubmission still moves the needle significantly."
        ),
    },
    "moderateFocused": {
        "label": "Moderate & Focused",
        "description": (
            "More accessible funding environment, but the payline is relatively crisp. "
            "Near-miss applications face a sharp drop in probability."
        ),
    },
    "broadOpportunityWindow": {
        "label": "Broad Opportunity Window",
        "description": (
            "Highest resubmission leverage. Probabilistic outcomes across a wide score range. "
            "Scores well above EEP50 retain meaningful funding probability."
        ),
    },
}

# ── Load & validate inputs ─────────────────────────────────────────────────────
log("Loading validated outputs…")

REQUIRED = {
    "paylines":  "outputs/nih_effective_paylines.csv",
    "bands":     "outputs/nih_percentile_band_summary.csv",
    "resub":     "outputs/nih_resubmission_opportunity_by_institute.csv",
    "summary":   "outputs/nih_institute_summary.csv",
    "cards":     "outputs/insight_cards.json",
}
for key, path in REQUIRED.items():
    if not os.path.exists(path):
        log(f"ERROR: {path} not found.  Run scripts 01–04 first.")
        sys.exit(1)

PL   = pd.read_csv(REQUIRED["paylines"])
BS   = pd.read_csv(REQUIRED["bands"])
RS   = pd.read_csv(REQUIRED["resub"])
SU   = pd.read_csv(REQUIRED["summary"])
with open(REQUIRED["cards"], encoding="utf-8") as f:
    CARDS = json.load(f)

log(f"  paylines:          {len(PL):>5,} rows × {len(PL.columns)} cols")
log(f"  band_summary:      {len(BS):>5,} rows × {len(BS.columns)} cols")
log(f"  resubmission:      {len(RS):>5,} rows × {len(RS.columns)} cols")
log(f"  institute_summary: {len(SU):>5,} rows × {len(SU.columns)} cols")

# Normalize Transition column (handles encoding differences across runs)
RS["_tid"] = RS["Transition"].map(TRANSITION_MAP)
unmapped = RS[RS["_tid"].isna()]["Transition"].unique()
if len(unmapped):
    # Fallback: match by From/To percentile columns
    fallback = {(20,15):"20to15",(18,12):"18to12",(15,10):"15to10",(12,8):"12to8"}
    RS["_tid"] = RS.apply(
        lambda r: fallback.get((int(r.From_Percentile), int(r.To_Percentile)), None)
        if pd.isna(r["_tid"]) else r["_tid"], axis=1
    )
    warn(f"Transition label re-mapped via From/To columns for: {list(unmapped)}")

YEARS      = sorted(PL["Year"].unique().tolist())
INSTITUTES = sorted(PL["Institute"].unique().tolist())
IC_ONLY    = [ic for ic in INSTITUTES if ic != "ALL NIH"]

# Derive FY2025 typology thresholds from IC-only data
_fy25 = SU[(SU.Year == 2025) & (SU.Institute != "ALL NIH")]
EEP50_MED = float(_fy25["EEP50"].dropna().median())
OW_MED    = float(_fy25["Opportunity_Width"].dropna().median())
log(f"\n  FY2025 typology thresholds: EEP50 median = {EEP50_MED:.2f}  |  OW median = {OW_MED:.2f}")

# Output directory
OUT = os.path.join("app", "public", "data")
os.makedirs(OUT, exist_ok=True)
log(f"\nWriting to {OUT}/\n")


# ── Quadrant helpers ───────────────────────────────────────────────────────────
def _qid(eep50, ow):
    """Assign camelCase quadrant ID from EEP50 and OW."""
    if eep50 is None or math.isnan(eep50):
        return None
    ow_ok = ow is not None and not math.isnan(ow)
    if eep50 < EEP50_MED:
        return "competitiveProbabilistic" if ow_ok and ow >= OW_MED else "sharpPayline"
    return "broadOpportunityWindow" if ow_ok and ow >= OW_MED else "moderateFocused"


# ══════════════════════════════════════════════════════════════════════════════
# FILE 1 — meta.json
# Global constants consumed by every app section for dropdowns, loops, labels.
# ══════════════════════════════════════════════════════════════════════════════
def build_meta():
    null_eep_combos = (
        PL[PL["EEP50"].isna()][["Year", "Institute"]]
        .sort_values(["Institute", "Year"])
        .apply(lambda r: {"year": int(r.Year), "institute": r.Institute}, axis=1)
        .tolist()
    )
    return {
        "_version":    1,
        "generatedAt": str(date.today()),
        "source":      CARDS["meta"]["source"],
        "dataVintage": CARDS["meta"]["data_vintage"],
        "qcStatus":    CARDS["meta"]["qc_status"],
        "fy2025Caution": CARDS["meta"]["fy2025_caution"],
        "years":         YEARS,
        "latestYear":    max(YEARS),
        "institutes":    INSTITUTES,
        "icOnly":        IC_ONLY,
        "bands":         BAND_ORDER,
        "bandMidpoints": BAND_MIDPOINT,
        "transitions":   TRANSITION_META,
        "typologyThresholds": {
            "eep50Median": round(EEP50_MED, 2),
            "owMedian":    round(OW_MED,    2),
            "basis":       "FY2025 IC-only medians (excludes ALL NIH)",
        },
        "dataQuality": {
            "totalRows":           int(len(PL)),
            "glmConverged":        int(PL["GLM_Converged"].sum()),
            "glmTotal":            int(len(PL)),
            "nullEepCount":        int(PL["EEP50"].isna().sum()),
            "nullEepCombos":       null_eep_combos,
            "r56SuppressedRows":   4534,
            "r56SuppressedPct":    34,
        },
    }

write_json(f"{OUT}/meta.json", build_meta(), "global constants — dropdowns, band labels, transition keys")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 2 — kpi_summary.json
# Pre-computed headline metrics for the dashboard KPI card row.
# ══════════════════════════════════════════════════════════════════════════════
def build_kpi_summary():
    anh_pl = PL[PL.Institute == "ALL NIH"].sort_values("Year")
    anh_su = SU[SU.Institute == "ALL NIH"].sort_values("Year")

    # All-year time series for sparklines
    by_year = []
    for _, pr in anh_pl.iterrows():
        sr_rows = anh_su[anh_su.Year == pr.Year]
        sr = sr_rows.iloc[0] if len(sr_rows) else None
        by_year.append({
            "year":             int(pr.Year),
            "eep80":            _r(pr.EEP80, 2),
            "eep50":            _r(pr.EEP50, 2),
            "eep20":            _r(pr.EEP20, 2),
            "opportunityWidth": _r(pr.Opportunity_Width, 2),
            "pseudoR2":         _r(pr.Pseudo_R2, 4),
            "overallFundingRate": _r(sr.Overall_Funding_Rate, 4) if sr is not None else None,
            "eep50YoYChange":   _r(sr.EEP50_YoY_Change, 2) if sr is not None else None,
        })

    # FY2025 headline values
    p25 = anh_pl[anh_pl.Year == 2025].iloc[0]
    p24 = anh_pl[anh_pl.Year == 2024].iloc[0]
    s25 = anh_su[anh_su.Year == 2025].iloc[0]

    hist = anh_pl[(anh_pl.Year >= 2015) & (anh_pl.Year <= 2024)]["EEP50"].dropna()
    hist_mean = float(hist.mean())
    hist_std  = float(hist.std())
    z_2025    = (float(p25.EEP50) - hist_mean) / hist_std if hist_std else None

    fy25_ics = SU[(SU.Year == 2025) & (SU.Institute != "ALL NIH")].copy()

    most_drop  = fy25_ics.dropna(subset=["EEP50_YoY_Change"]).nsmallest(1, "EEP50_YoY_Change").iloc[0]
    least_drop = fy25_ics.dropna(subset=["EEP50_YoY_Change"]).nlargest(1, "EEP50_YoY_Change").iloc[0]
    most_comp  = fy25_ics.dropna(subset=["EEP50"]).nsmallest(1, "EEP50").iloc[0]
    least_comp = fy25_ics.dropna(subset=["EEP50"]).nlargest(1, "EEP50").iloc[0]
    ics_neg    = fy25_ics.dropna(subset=["EEP50_YoY_Change"])
    ics_below10 = sorted(fy25_ics[fy25_ics.EEP50 < 10]["Institute"].tolist())

    rate19_rows = anh_su[anh_su.Year == 2019]
    rate19 = float(rate19_rows.iloc[0].Overall_Funding_Rate) if len(rate19_rows) else None

    headlines = [
        {
            "id":    "allNihEep50",
            "label": "ALL NIH EEP50",
            "year":  2025,
            "value":  _r(p25.EEP50, 2),
            "displayValue": f"{float(p25.EEP50):.1f}",
            "unit":   "percentile",
            "delta":  _r(float(p25.EEP50) - float(p24.EEP50), 2),
            "deltaLabel": f"{float(p25.EEP50) - float(p24.EEP50):+.1f} pp vs FY2024",
            "trend":  "down",
            "alert":  True,
            "context": f"Historical mean (2015–2024): {hist_mean:.1f} | z = {z_2025:.1f}\u03c3",
        },
        {
            "id":    "allNihFundingRate",
            "label": "ALL NIH Funding Rate",
            "year":  2025,
            "value":  _r(s25.Overall_Funding_Rate, 4),
            "displayValue": f"{float(s25.Overall_Funding_Rate)*100:.1f}%",
            "unit":   "proportion",
            "delta":  _r((float(s25.Overall_Funding_Rate) - rate19), 4) if rate19 else None,
            "deltaLabel": f"{(float(s25.Overall_Funding_Rate) - rate19)*100:+.1f} pp vs FY2019" if rate19 else None,
            "trend":  "down",
            "alert":  True,
            "context": f"FY2019: {rate19*100:.1f}%  |  FY2024: {float(anh_su[anh_su.Year==2024].iloc[0].Overall_Funding_Rate)*100:.1f}%",
        },
        {
            "id":    "opportunityWidth",
            "label": "ALL NIH Opportunity Width",
            "year":  2025,
            "value":  _r(p25.Opportunity_Width, 2),
            "displayValue": f"{float(p25.Opportunity_Width):.1f} pp",
            "unit":   "percentile points",
            "delta":  _r(float(p25.Opportunity_Width) - float(p24.Opportunity_Width), 2),
            "deltaLabel": f"{float(p25.Opportunity_Width) - float(p24.Opportunity_Width):+.1f} pp vs FY2024",
            "trend":  "down",
            "alert":  False,
            "context": "EEP20 − EEP80; narrowest in 12-year dataset",
        },
        {
            "id":    "icsCompressed",
            "label": "ICs with Tighter Paylines (2024\u21922025)",
            "year":  2025,
            "value":  len(ics_neg[ics_neg.EEP50_YoY_Change < 0]),
            "displayValue": f"{len(ics_neg[ics_neg.EEP50_YoY_Change < 0])} of 19",
            "unit":   "ICs",
            "delta":  None,
            "deltaLabel": None,
            "trend":  "down",
            "alert":  True,
            "context": "First universal compression event in this dataset",
        },
        {
            "id":    "icsBelowEep10",
            "label": "ICs with EEP50 < 10 (FY2025)",
            "year":  2025,
            "value":  len(ics_below10),
            "displayValue": str(len(ics_below10)),
            "unit":   "ICs",
            "delta":  None,
            "deltaLabel": None,
            "trend":  "down",
            "alert":  False,
            "context": ", ".join(ics_below10),
        },
        {
            "id":    "modelFit",
            "label": "Model Fit (ALL NIH avg R\u00b2)",
            "year":  "2014\u20132025",
            "value":  _r(float(anh_pl["Pseudo_R2"].mean()), 3),
            "displayValue": f"R\u00b2 = {float(anh_pl['Pseudo_R2'].mean()):.3f}",
            "unit":   "McFadden pseudo-R\u00b2",
            "delta":  None,
            "deltaLabel": None,
            "trend":  "stable",
            "alert":  False,
            "context": "Near-perfect logistic fit; range 0.96\u20130.97 across all 12 years",
        },
    ]

    return {
        "_version":         1,
        "allNihByYear":     by_year,
        "fy2025Headlines":  headlines,
        "fy2025Compression": {
            "allNegative":    bool((ics_neg["EEP50_YoY_Change"] < 0).all()),
            "mostCompressed": {
                "institute":     str(most_drop.Institute),
                "eep50YoYChange": _r(most_drop.EEP50_YoY_Change, 2),
            },
            "leastCompressed": {
                "institute":     str(least_drop.Institute),
                "eep50YoYChange": _r(least_drop.EEP50_YoY_Change, 2),
            },
            "mostCompetitive": {
                "institute": str(most_comp.Institute),
                "eep50":     _r(most_comp.EEP50, 2),
            },
            "leastCompetitive": {
                "institute": str(least_comp.Institute),
                "eep50":     _r(least_comp.EEP50, 2),
            },
            "icsBelowEep50_10":  ics_below10,
            "historicalMeanEep50": round(hist_mean, 2),
            "historicalStdEep50":  round(hist_std,  2),
            "zScore2025":          round(z_2025,     2) if z_2025 else None,
        },
    }

write_json(f"{OUT}/kpi_summary.json", build_kpi_summary(), "dashboard KPI headline cards + sparklines")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 3 — payline_curves.json
# GLM parameters and EEP values per IC-year.
# Front end uses beta0/beta1 to draw smooth logistic curves in the browser.
# ══════════════════════════════════════════════════════════════════════════════
def build_payline_curves():
    rows = []
    for _, r in PL.sort_values(["Institute", "Year"]).iterrows():
        rows.append({
            "year":             int(r.Year),
            "institute":        r.Institute,
            "beta0":            _r(r.Beta0,            6),
            "beta1":            _r(r.Beta1,            6),
            "eep80":            _r(r.EEP80,            2),
            "eep50":            _r(r.EEP50,            2),
            "eep20":            _r(r.EEP20,            2),
            "opportunityWidth": _r(r.Opportunity_Width, 2),
            "pseudoR2":         _r(r.Pseudo_R2,         4),
            "glmConverged":     bool(r.GLM_Converged),
            "nObsFit":          int(r.N_Obs_Fit),
            "modelNote":        None if pd.isna(r.Model_Note) else str(r.Model_Note),
        })
    return rows

write_json(f"{OUT}/payline_curves.json", build_payline_curves(), "GLM β0/β1 + EEP values → smooth payline curves")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 4 — trend_eep.json
# EEP50/80/20 + funding rate time-series for every institute.
# Used by the Cross-Year Trends multi-line chart.
# ══════════════════════════════════════════════════════════════════════════════
def build_trend_eep():
    series = []
    for inst in INSTITUTES:
        pl_i = PL[PL.Institute == inst].set_index("Year")
        su_i = SU[SU.Institute == inst].set_index("Year")
        data = []
        for yr in YEARS:
            pr = pl_i.loc[yr] if yr in pl_i.index else None
            sr = su_i.loc[yr] if yr in su_i.index else None
            data.append({
                "year":        yr,
                "eep80":       _r(pr["EEP80"],            2) if pr is not None else None,
                "eep50":       _r(pr["EEP50"],            2) if pr is not None else None,
                "eep20":       _r(pr["EEP20"],            2) if pr is not None else None,
                "ow":          _r(pr["Opportunity_Width"], 2) if pr is not None else None,
                "overallRate": _r(sr["Overall_Funding_Rate"], 4) if sr is not None else None,
                "eep50YoY":   _r(sr["EEP50_YoY_Change"],   2) if sr is not None else None,
            })
        series.append({
            "institute":   inst,
            "isAggregate": inst == "ALL NIH",
            "data":        data,
        })
    return {"years": YEARS, "series": series}

write_json(f"{OUT}/trend_eep.json", build_trend_eep(), "EEP + rate time-series → cross-year line charts")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 5 — band_heatmap.json
# Funding rate for every Institute × Year × Band cell.
# Used by the band heatmap grid view.
# ══════════════════════════════════════════════════════════════════════════════
def build_band_heatmap():
    cells = []
    for _, r in BS.iterrows():
        cells.append({
            "year":        int(r.Year),
            "institute":   r.Institute,
            "band":        r.Percentile_Band,
            "rate":        _r(r.Funding_Rate,      4),
            "funded":      int(r.Funded_Total)       if not pd.isna(r.Funded_Total)       else None,
            "total":       int(r.Applications_Total) if not pd.isna(r.Applications_Total) else None,
            "shareOfApps": _r(r.Band_Share_of_Apps,  4),
        })
    return {
        "years":      YEARS,
        "institutes": INSTITUTES,
        "bands":      BAND_ORDER,
        "cells":      cells,
    }

write_json(f"{OUT}/band_heatmap.json", build_band_heatmap(), "rate per institute×year×band → heatmap grid")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 6 — band_landscape.json
# Band rates nested by Institute → Year → Band.
# Also includes a flat comparison table (ALL NIH, key years) for grouped bars.
# ══════════════════════════════════════════════════════════════════════════════
def build_band_landscape():
    by_inst: dict = {}
    for inst in INSTITUTES:
        by_yr: dict = {}
        for yr in YEARS:
            sub = BS[(BS.Institute == inst) & (BS.Year == yr)]
            if sub.empty:
                continue
            by_yr[str(yr)] = {
                row.Percentile_Band: {
                    "rate":  _r(row.Funding_Rate,      4),
                    "total": int(row.Applications_Total) if not pd.isna(row.Applications_Total) else None,
                }
                for _, row in sub.iterrows()
            }
        by_inst[inst] = by_yr

    # Flat comparison rows: ALL NIH, four benchmark years → for grouped bar chart
    CMP_YEARS = [2019, 2022, 2024, 2025]
    comparison_rows = []
    for band in BAND_ORDER:
        row_data: dict = {"band": band, "bandMidpoint": BAND_MIDPOINT[band]}
        for yr in CMP_YEARS:
            sub = BS[(BS.Institute == "ALL NIH") & (BS.Year == yr) & (BS.Percentile_Band == band)]
            row_data[f"fy{yr}"] = _r(sub["Funding_Rate"].values[0], 4) if len(sub) else None
        comparison_rows.append(row_data)

    return {
        "bands":           BAND_ORDER,
        "comparisonYears": CMP_YEARS,
        "allNihComparison": comparison_rows,
        "byInstitute":     by_inst,
    }

write_json(f"{OUT}/band_landscape.json", build_band_landscape(), "nested band rates → landscape grouped bar + drill-down")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 7 — resubmission_summary.json
# All transitions, all ICs, all years.
# FY2025 ranked tables pre-built for each transition.
# ══════════════════════════════════════════════════════════════════════════════
def build_resubmission_summary():
    # Nested: byYear[year][institute][transitionId]
    by_year: dict = {}
    for yr in YEARS:
        sub = RS[RS.Year == yr]
        by_inst: dict = {}
        for inst in INSTITUTES:
            inst_sub = sub[sub.Institute == inst]
            if inst_sub.empty:
                continue
            trans: dict = {}
            for _, row in inst_sub.iterrows():
                tid = row["_tid"]
                if tid is None:
                    continue
                trans[tid] = {
                    "probFrom":   _r(row.Prob_From,         4),
                    "probTo":     _r(row.Prob_To,           4),
                    "absGain":    _r(row.Absolute_Gain,      4),
                    "relGainPct": _r(row.Relative_Gain_Pct,  1),
                }
            if trans:
                by_inst[inst] = trans
        by_year[str(yr)] = by_inst

    # FY2025 ranked tables — useful for the "all-IC comparison" bar chart
    fy25 = RS[RS.Year == 2025]
    fy25_ranked: dict = {}
    for tm in TRANSITION_META:
        tid   = tm["id"]
        sub   = fy25[fy25["_tid"] == tid].copy()
        sub   = sub.dropna(subset=["Absolute_Gain"]).sort_values("Absolute_Gain", ascending=False)
        fy25_ranked[tid] = [
            {
                "institute":  row.Institute,
                "absGain":    _r(row.Absolute_Gain,      4),
                "relGainPct": _r(row.Relative_Gain_Pct,  1),
                "probFrom":   _r(row.Prob_From,           4),
                "probTo":     _r(row.Prob_To,             4),
            }
            for _, row in sub.iterrows()
        ]

    return {
        "transitions":   TRANSITION_META,
        "byYear":        by_year,
        "fy2025Ranked":  fy25_ranked,
    }

write_json(f"{OUT}/resubmission_summary.json", build_resubmission_summary(), "resubmission gains — all ICs, years, FY2025 ranked")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 8 — typology.json
# IC quadrant classifications and scatter-plot data for FY2025.
# ══════════════════════════════════════════════════════════════════════════════
def build_typology():
    fy25_su = SU[(SU.Year == 2025) & (SU.Institute != "ALL NIH")].copy()
    fy25_pl = PL[(PL.Year == 2025) & (PL.Institute != "ALL NIH")].set_index("Institute")

    ic_rows  = []
    quad_members: dict = {q: [] for q in QUADRANT_META}

    for inst in IC_ONLY:
        su_r = fy25_su[fy25_su.Institute == inst]
        if su_r.empty:
            continue
        su_r = su_r.iloc[0]
        pl_r = fy25_pl.loc[inst] if inst in fy25_pl.index else None

        eep50 = None if pd.isna(su_r.EEP50) else float(su_r.EEP50)
        ow    = None if pd.isna(su_r.Opportunity_Width) else float(su_r.Opportunity_Width)
        qid   = _qid(eep50, ow)

        entry = {
            "institute":              inst,
            "eep80":                  _r(su_r.EEP80,                  2),
            "eep50":                  _r(eep50,                        2),
            "eep20":                  _r(su_r.EEP20,                   2),
            "opportunityWidth":       _r(ow,                           2),
            "overallFundingRate":     _r(su_r.Overall_Funding_Rate,    4),
            "totalApplications":      int(su_r.Total_Applications) if not pd.isna(su_r.Total_Applications) else None,
            "eep50YoYChange":         _r(su_r.EEP50_YoY_Change,       2),
            "pseudoR2":               _r(pl_r.Pseudo_R2 if pl_r is not None else None, 4),
            "typologyQuadrant":       qid,
            "typologyQuadrantLabel":  QUADRANT_META[qid]["label"] if qid else None,
            "owIsNull":               ow is None,
        }
        ic_rows.append(entry)
        if qid:
            quad_members[qid].append(inst)

    quadrants = {
        qid: {
            **QUADRANT_META[qid],
            "id":         qid,
            "count":      len(members),
            "institutes": members,
        }
        for qid, members in quad_members.items()
    }

    return {
        "year":        2025,
        "thresholds":  {"eep50Median": round(EEP50_MED, 2), "owMedian": round(OW_MED, 2)},
        "quadrants":   quadrants,
        "institutes":  ic_rows,
    }

write_json(f"{OUT}/typology.json", build_typology(), "IC typology quadrant classifications for scatter plot")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 9 — institute_profiles.json
# Rich per-IC profile: FY2025 snapshot + band rates + resubmission gains + history.
# Used by the institute drill-down / profile card view.
# ══════════════════════════════════════════════════════════════════════════════
def build_institute_profiles():
    profiles = []
    for inst in INSTITUTES:
        su_i = SU[SU.Institute == inst].set_index("Year")
        pl_i = PL[PL.Institute == inst].set_index("Year")
        rs_i = RS[RS.Institute == inst]
        bs_i = BS[BS.Institute == inst]

        if 2025 not in su_i.index:
            warn(f"No FY2025 row for {inst} in institute_summary — skipping profile")
            continue

        s25 = su_i.loc[2025]
        p25 = pl_i.loc[2025] if 2025 in pl_i.index else None

        eep50_25 = None if pd.isna(s25.EEP50) else float(s25.EEP50)
        ow_25    = None if pd.isna(s25.Opportunity_Width) else float(s25.Opportunity_Width)
        qid_25   = _qid(eep50_25, ow_25)

        # FY2025 snapshot
        fy2025 = {
            "eep80":              _r(s25.EEP80,              2),
            "eep50":              _r(eep50_25,               2),
            "eep20":              _r(s25.EEP20,              2),
            "opportunityWidth":   _r(ow_25,                  2),
            "overallFundingRate": _r(s25.Overall_Funding_Rate, 4),
            "totalApplications":  int(s25.Total_Applications) if not pd.isna(s25.Total_Applications) else None,
            "totalFunded":        int(s25.Total_Funded) if not pd.isna(s25.Total_Funded) else None,
            "eep50YoYChange":     _r(s25.EEP50_YoY_Change,  2),
            "pseudoR2":           _r(p25.Pseudo_R2 if p25 is not None else None, 4),
            "typologyQuadrant":        qid_25,
            "typologyQuadrantLabel":   QUADRANT_META[qid_25]["label"] if qid_25 else None,
        }

        # FY2025 band rates
        bs25 = bs_i[bs_i.Year == 2025]
        band_rates_25 = {
            row.Percentile_Band: {
                "rate":  _r(row.Funding_Rate,      4),
                "total": int(row.Applications_Total) if not pd.isna(row.Applications_Total) else None,
            }
            for _, row in bs25.iterrows()
        }

        # FY2025 resubmission gains
        rs25 = rs_i[rs_i.Year == 2025]
        resub25: dict = {}
        for tm in TRANSITION_META:
            sub = rs25[rs25["_tid"] == tm["id"]]
            if len(sub):
                row = sub.iloc[0]
                resub25[tm["id"]] = {
                    "probFrom":   _r(row.Prob_From,         4),
                    "probTo":     _r(row.Prob_To,           4),
                    "absGain":    _r(row.Absolute_Gain,      4),
                    "relGainPct": _r(row.Relative_Gain_Pct,  1),
                }

        # Full EEP + rate history
        history = []
        for yr in YEARS:
            pr = pl_i.loc[yr] if yr in pl_i.index else None
            sr = su_i.loc[yr] if yr in su_i.index else None
            history.append({
                "year":        yr,
                "eep80":       _r(pr["EEP80"]            if pr is not None else None, 2),
                "eep50":       _r(pr["EEP50"]            if pr is not None else None, 2),
                "eep20":       _r(pr["EEP20"]            if pr is not None else None, 2),
                "ow":          _r(pr["Opportunity_Width"] if pr is not None else None, 2),
                "overallRate": _r(sr["Overall_Funding_Rate"] if sr is not None else None, 4),
                "eep50YoY":   _r(sr["EEP50_YoY_Change"]    if sr is not None else None, 2),
            })

        profiles.append({
            "institute":        inst,
            "isAggregate":      inst == "ALL NIH",
            "fy2025":           fy2025,
            "bandRates2025":    band_rates_25,
            "resubmission2025": resub25,
            "history":          history,
        })

    return profiles

write_json(f"{OUT}/institute_profiles.json", build_institute_profiles(), "per-IC rich profile → institute drill-down view")


# ══════════════════════════════════════════════════════════════════════════════
# FILE 10 — insight_cards.json
# Narrative content (section titles, descriptions, data insights, implications).
# Direct copy — no transformation.
# ══════════════════════════════════════════════════════════════════════════════
shutil.copy("outputs/insight_cards.json", f"{OUT}/insight_cards.json")
sz = os.path.getsize(f"{OUT}/insight_cards.json")
log(f"  {'insight_cards.json':<40} {sz:>8,} bytes   [narrative content → InsightCard components]")


# ── Final validation ───────────────────────────────────────────────────────────
log("\n── Validation ───────────────────────────────────────────────────────────────")
files   = sorted(os.listdir(OUT))
total_b = 0
errors  = []
for fn in files:
    fp = os.path.join(OUT, fn)
    sz = os.path.getsize(fp)
    total_b += sz
    try:
        with open(fp, encoding="utf-8") as f:
            json.load(f)
        log(f"  OK  {fn:<40} {sz:>8,} bytes")
    except json.JSONDecodeError as e:
        errors.append(fn)
        log(f"  ERR {fn:<40} INVALID JSON: {e}")

log()
log(f"  {len(files)} files  |  {total_b:,} bytes total  ({total_b/1024:.0f} KB)")
if errors:
    log(f"  ERRORS: {errors}")
else:
    log("  All files are valid JSON.")
log()
log("  app/public/data/ is ready for front-end consumption.")
