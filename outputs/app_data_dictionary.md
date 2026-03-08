# App Data Dictionary
**Generated:** March 2026
**Source:** NIH Data Book Report ID 302 (FY2014–FY2025), exported March 6, 2026
**Data pipeline:** `01_clean_nih_data.py` → `02_analyze_nih_data.py` → `03_validate_outputs.py` → `03_prepare_app_data.py`
**Output location:** `app/public/data/`
**QC status:** 68 passed | 0 failed | 11 warnings — cleared for production

---

## Overview

The app consumes **10 JSON files**, each purpose-built for a specific app view or component type. All files use camelCase field names, represent NaN as `null`, and round floats to 2–6 significant decimal places appropriate to the field. No file requires server-side processing.

| File | Size | Primary consumer |
|---|---|---|
| `meta.json` | 1.8 KB | All sections (global constants) |
| `kpi_summary.json` | 3.8 KB | KPI card row, Overview section |
| `payline_curves.json` | 47 KB | Payline Explorer (smooth curve rendering) |
| `trend_eep.json` | 25 KB | Cross-Year Trends line chart |
| `band_heatmap.json` | 150 KB | Band heatmap grid |
| `band_landscape.json` | 51 KB | Band Landscape grouped bar chart |
| `resubmission_summary.json` | 83 KB | Resubmission Map chart |
| `typology.json` | 6.6 KB | Institute Typology scatter plot |
| `institute_profiles.json` | 43 KB | Institute drill-down / profile cards |
| `insight_cards.json` | 29 KB | InsightCard narrative panels (all sections) |

---

## File-by-file reference

---

### `meta.json`

**Purpose:** Global reference constants. Every app section should import this once and use it to populate dropdowns, iterate over institutes/years/bands, and display labels without hardcoding.

**App sections:** All

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `years` | `number[]` | All data years in order: `[2014, …, 2025]` |
| `latestYear` | `number` | `2025` — default selection for year pickers |
| `institutes` | `string[]` | All 20 institutes including `"ALL NIH"` |
| `icOnly` | `string[]` | 19 institutes excluding `"ALL NIH"` |
| `bands` | `string[]` | Band labels in order: `["1-5","6-10","11-15","16-20","21-25","26+"]` |
| `bandMidpoints` | `object` | `{"1-5":3,"6-10":8,…}` — used to plot band data on a continuous percentile axis |
| `transitions` | `object[]` | Each has `id` (camelCase key), `label` (display string with →), `from`, `to` |
| `typologyThresholds` | `object` | `eep50Median` and `owMedian` for FY2025 — the quadrant dividing lines |
| `fy2025Caution` | `string` | Banner text for FY2025 preliminary data warning |
| `dataQuality.nullEepCombos` | `object[]` | 8 Institute×Year combos where GLM could not estimate EEP — render as "N/A" |

**Transformations:** None — derived directly from analysis outputs and hardcoded constants.

---

### `kpi_summary.json`

**Purpose:** Pre-computed headline metrics for the dashboard KPI card row. Includes sparkline data for ALL NIH over all 12 years, and pre-formatted display strings to avoid in-app computation.

**App sections:** Overview (KPI cards), header summary row

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `allNihByYear` | `object[]` | One row per year: `eep80`, `eep50`, `eep20`, `ow`, `overallFundingRate`, `eep50YoYChange` — use for sparklines |
| `fy2025Headlines` | `object[]` | 6 headline cards, each with `label`, `displayValue` (pre-formatted string), `delta`, `deltaLabel`, `trend` (`"up"/"down"/"stable"`), `alert` (boolean) |
| `fy2025Compression.allNegative` | `boolean` | `true` — all 19 ICs had negative EEP50 YoY change in 2025 |
| `fy2025Compression.mostCompressed` | `object` | IC with largest EEP50 drop: `{institute, eep50YoYChange}` |
| `fy2025Compression.leastCompressed` | `object` | IC with smallest EEP50 drop: `{institute, eep50YoYChange}` |
| `fy2025Compression.icsBelowEep50_10` | `string[]` | ICs where EEP50 < 10 in FY2025 |
| `fy2025Compression.zScore2025` | `number` | −5.8 — how many σ below the 2015–2024 mean the FY2025 ALL NIH EEP50 falls |

**Transformations:**
- `overallFundingRate` stored as proportion (0–1); multiply by 100 for display
- `displayValue` strings are pre-formatted: percentiles to 1 decimal, rates with `%`, widths with `pp`
- Historical mean and σ computed from 2015–2024 ALL NIH EEP50 (excludes FY2014 due to extended historical data range)

---

### `payline_curves.json`

**Purpose:** GLM parameters (`beta0`, `beta1`) and EEP threshold values for every Institute × Year combination. The front end uses `beta0` and `beta1` to generate smooth logistic curves in the browser without needing the raw percentile-level data.

**App sections:** Payline Explorer (smooth curve), Institute Comparison (EEP overlay)

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `beta0` | `number\|null` | GLM intercept — used in `P = 1/(1+exp(-(β₀+β₁×pct)))` |
| `beta1` | `number\|null` | GLM slope (negative — funding probability decreases with higher percentile) |
| `eep80` | `number\|null` | Percentile at which funding probability = 80% |
| `eep50` | `number\|null` | Percentile at which funding probability = 50% (statistical payline) |
| `eep20` | `number\|null` | Percentile at which funding probability = 20% |
| `opportunityWidth` | `number\|null` | `eep20 − eep80` in percentile points |
| `pseudoR2` | `number\|null` | McFadden pseudo-R² — model fit quality (>0.95 = near-perfect for ALL NIH) |
| `glmConverged` | `boolean` | `false` for 8 sparse IC-year combos; those rows have null EEP values |
| `nObsFit` | `number` | Number of percentile rows used to fit the model (typically 40–50 for large ICs) |

**Transformations:**
- `beta0` and `beta1` rounded to 6 decimal places for curve-generation precision
- EEP values clamped to `[0.5, 60.0]` during fitting and rounded to 2 decimal places
- `null` for any IC-year where fit had < 8 total observations or < 3 in the transition zone (0.05 < rate < 0.95)

**Usage example (browser):**
```js
function logisticProb(percentile, beta0, beta1) {
  return 1 / (1 + Math.exp(-(beta0 + beta1 * percentile)));
}
// At pct=12, ALL NIH FY2025 (β₀=2.8625, β₁=−0.257):
// → 1/(1+exp(-(2.8625 + −0.257×12))) = 44.5%
```

---

### `trend_eep.json`

**Purpose:** Complete EEP50/80/20 and overall funding rate time-series for every institute and year. Used to draw the multi-line trend chart. Each institute is a separate series object.

**App sections:** Cross-Year Trends (multi-line chart), Overview (sparkline)

**Structure:**
```json
{
  "years": [2014, …, 2025],
  "series": [
    {
      "institute": "ALL NIH",
      "isAggregate": true,
      "data": [
        { "year": 2014, "eep80": 13.26, "eep50": 18.80, "eep20": 24.33,
          "ow": 11.07, "overallRate": 0.38, "eep50YoY": null },
        …
      ]
    },
    …
  ]
}
```

**Key fields per data point:**

| Field | Type | Description |
|---|---|---|
| `eep50` | `number\|null` | 50% funding probability threshold; `null` for 8 sparse combos |
| `eep80` / `eep20` | `number\|null` | Outer EEP thresholds; `null` when model did not converge |
| `ow` | `number\|null` | Opportunity Width = `eep20 − eep80` |
| `overallRate` | `number\|null` | Proportion (0–1); overall funding rate across all percentiles for that IC-year |
| `eep50YoY` | `number\|null` | EEP50 change from prior year; `null` for first available year per IC |

**Transformations:**
- NIMHD has `null` for all fields in 2014 and 2015 (IC absent from data for those years)
- `isAggregate: true` flags the ALL NIH series for bold/reference rendering

---

### `band_heatmap.json`

**Purpose:** Flat array of every Institute × Year × Band funding rate cell. Used to render the 2D heatmap grid where rows = institutes (or years), columns = bands, and cell color encodes funding rate.

**App sections:** Band Heatmap grid view

**Structure:**
```json
{
  "years": […],
  "institutes": […],
  "bands": ["1-5", "6-10", "11-15", "16-20", "21-25", "26+"],
  "cells": [
    { "year": 2025, "institute": "ALL NIH", "band": "1-5",
      "rate": 0.915, "funded": 1234, "total": 1349, "shareOfApps": 0.18 },
    …
  ]
}
```

**Key fields per cell:**

| Field | Type | Description |
|---|---|---|
| `rate` | `number\|null` | Funding rate (proportion 0–1); `null` if zero applications in that band |
| `funded` | `number\|null` | Count of funded applications in this band |
| `total` | `number\|null` | Total applications in this band (funded + not funded) |
| `shareOfApps` | `number\|null` | Fraction of all IC-year applications falling in this band |

**Transformations:**
- `Funded_Total` in source = R01-equivalent + R56 awards (NaN-safe; R56 suppressed for 34% of IC-level rows)
- Rows with zero total applications have `rate: null`
- All 1,428 band × IC × year combinations from the source CSV are preserved

**Usage notes:**
- To build a "year × band" heatmap for one IC: filter `cells` by `institute`
- To build a "IC × band" heatmap for one year: filter by `year`
- Color scale: recommend red→yellow→green mapped to 0%→50%→100% (or 0%→payline→100%)

---

### `band_landscape.json`

**Purpose:** Band rates in two forms — a nested `byInstitute[ic][year][band]` lookup for drill-down views, and a flat `allNihComparison` table for the multi-year grouped bar chart.

**App sections:** Band Landscape grouped bar chart, Band drill-down per IC

**Structure:**
```json
{
  "bands": […],
  "comparisonYears": [2019, 2022, 2024, 2025],
  "allNihComparison": [
    { "band": "1-5", "bandMidpoint": 3,
      "fy2019": 0.9320, "fy2022": 0.9107, "fy2024": 0.9073, "fy2025": 0.9154 },
    …
  ],
  "byInstitute": {
    "ALL NIH": {
      "2025": { "1-5": {"rate":0.9154,"total":1349}, "6-10": {…}, … },
      "2024": { … },
      …
    },
    "NCI": { … },
    …
  }
}
```

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `allNihComparison[*].fy{year}` | `number\|null` | ALL NIH funding rate for that band in that year (proportion 0–1) |
| `allNihComparison[*].bandMidpoint` | `number` | Numeric center of the band — used to plot on a continuous percentile axis |
| `byInstitute[ic][year][band].rate` | `number\|null` | Funding rate (proportion 0–1) |
| `byInstitute[ic][year][band].total` | `number\|null` | Application count in that band |

**Transformations:**
- Comparison years are pre-selected as 2019 (pre-compression baseline), 2022, 2024, 2025
- `byInstitute` omits year-keys for years with no data (e.g., NIMHD 2014–2015)

---

### `resubmission_summary.json`

**Purpose:** All resubmission probability gains for every IC × Year × Transition combination. Includes a pre-sorted FY2025 ranked table for each transition, ready for the "all-IC comparison" bar chart.

**App sections:** Resubmission Map (IC-level bar chart, all-IC ranked bar chart)

**Structure:**
```json
{
  "transitions": [
    { "id":"20to15", "label":"20→15", "from":20, "to":15, "description":"…" },
    …
  ],
  "byYear": {
    "2025": {
      "ALL NIH": {
        "20to15": { "probFrom":0.093, "probTo":0.270, "absGain":0.177, "relGainPct":190.8 },
        "18to12": { … },
        "15to10": { … },
        "12to8":  { … }
      },
      "NCI": { … },
      …
    },
    "2024": { … },
    …
  },
  "fy2025Ranked": {
    "15to10": [
      { "institute":"NLM",   "absGain":0.4123, "probFrom":0.11, "probTo":0.52, "relGainPct":384 },
      { "institute":"NHLBI", "absGain":0.3812, … },
      …
    ],
    "20to15": [ … ],
    …
  }
}
```

**Key fields per transition record:**

| Field | Type | Description |
|---|---|---|
| `probFrom` | `number\|null` | Modeled funding probability at the "from" percentile (proportion 0–1) |
| `probTo` | `number\|null` | Modeled funding probability at the "to" percentile (proportion 0–1) |
| `absGain` | `number\|null` | `probTo − probFrom` — absolute probability gain from score improvement |
| `relGainPct` | `number\|null` | `(absGain / probFrom) × 100` — relative gain percentage |

**Transformations:**
- Transition CSV column (e.g., `"20→15"`) mapped to camelCase ID `"20to15"` via From/To percentile columns as fallback if the arrow character was encoded differently
- Probabilities derived from GLM logistic curve at the exact From/To percentile — not from raw band rates
- `fy2025Ranked[transitionId]` is sorted descending by `absGain`, excluding nulls

**Usage notes:**
- `absGain` is the primary metric for triage decisions (absolute probability gain per resubmission)
- `relGainPct` is useful for relative comparisons but misleads when `probFrom` is very small
- For ICs where `probFrom` or `probTo` is `null`, the GLM did not converge for that year — exclude from charts

---

### `typology.json`

**Purpose:** FY2025 IC quadrant classifications for the two-dimensional scatter plot (EEP50 vs Opportunity Width). Contains pre-computed quadrant membership and quadrant descriptions.

**App sections:** Institute Typology scatter plot, quadrant summary cards

**Structure:**
```json
{
  "year": 2025,
  "thresholds": { "eep50Median": 10.73, "owMedian": 9.71 },
  "quadrants": {
    "sharpPayline": {
      "id": "sharpPayline",
      "label": "Sharp Payline",
      "description": "…",
      "count": 5,
      "institutes": ["NCI","NHGRI","NIA","NIDDK","NINDS"]
    },
    "competitiveProbabilistic": { … },
    "moderateFocused": { … },
    "broadOpportunityWindow": { … }
  },
  "institutes": [
    { "institute": "NCI",  "eep50": 7.88, "opportunityWidth": 5.14,
      "typologyQuadrant": "sharpPayline",
      "typologyQuadrantLabel": "Sharp Payline",
      "overallFundingRate": 0.1639,
      "eep50YoYChange": -4.89,
      "owIsNull": false, … },
    …
  ]
}
```

**Quadrant definitions:**

| Quadrant ID | EEP50 | Opportunity Width | Meaning |
|---|---|---|---|
| `sharpPayline` | < median (10.73) | < median (9.71) | Competitive and binary — little probabilistic middle ground |
| `competitiveProbabilistic` | < median | ≥ median | Competitive but wide — resubmission still has leverage |
| `moderateFocused` | ≥ median | < median | Accessible but crisp — near-misses face sharp drop |
| `broadOpportunityWindow` | ≥ median | ≥ median | Accessible and wide — highest resubmission value |

**Key fields per institute entry:**

| Field | Type | Description |
|---|---|---|
| `eep50` / `opportunityWidth` | `number\|null` | X and Y coordinates for scatter plot |
| `typologyQuadrant` | `string\|null` | camelCase quadrant ID; `null` for NIGMS/NIMHD/NINR where OW is null |
| `owIsNull` | `boolean` | `true` for 3 ICs (NIGMS, NIMHD, NINR) with insufficient EEP20 data; cannot assign quadrant definitively |
| `eep50YoYChange` | `number\|null` | FY2024→FY2025 EEP50 change (negative = tightened) |
| `overallFundingRate` | `number\|null` | FY2025 overall rate (proportion 0–1); size the scatter dot by this |

**Transformations:**
- Thresholds computed from IC-only FY2025 median (excludes ALL NIH)
- OW-null ICs (NIGMS, NIMHD, NINR) assigned to the EEP50-based quadrant only; `owIsNull: true` signals this

---

### `institute_profiles.json`

**Purpose:** One object per institute containing everything needed to render a complete institute profile card: FY2025 snapshot, band-level rates, resubmission gains, and full 12-year history.

**App sections:** Institute Profile / drill-down view, Institute Comparison detail panel

**Structure:**
```json
[
  {
    "institute": "NIAID",
    "isAggregate": false,
    "fy2025": {
      "eep80": 7.11, "eep50": 13.06, "eep20": 19.01,
      "opportunityWidth": 9.90,
      "overallFundingRate": 0.2708,
      "totalApplications": 2127,
      "totalFunded": 576,
      "eep50YoYChange": -2.75,
      "pseudoR2": 0.9214,
      "typologyQuadrant": "broadOpportunityWindow",
      "typologyQuadrantLabel": "Broad Opportunity Window"
    },
    "bandRates2025": {
      "1-5":   { "rate": 0.9091, "total": 110 },
      "6-10":  { "rate": 0.8198, "total": 222 },
      "11-15": { "rate": 0.5641, "total": 195 },
      "16-20": { "rate": 0.2033, "total": 181 },
      "21-25": { "rate": 0.0556, "total": 126 },
      "26+":   { "rate": 0.0083, "total": 362 }
    },
    "resubmission2025": {
      "20to15": { "probFrom": 0.0839, "probTo": 0.2654, "absGain": 0.1815, "relGainPct": 216.4 },
      "18to12": { … }, "15to10": { … }, "12to8": { … }
    },
    "history": [
      { "year": 2014, "eep80": 13.4, "eep50": 19.2, "eep20": 25.0,
        "ow": 11.6, "overallRate": 0.3410, "eep50YoY": null },
      …
    ]
  },
  …
]
```

**Key sub-objects:**

| Sub-object | Use |
|---|---|
| `fy2025` | KPI values for the profile header card |
| `bandRates2025` | Render a horizontal bar chart of rate-by-band |
| `resubmission2025` | Show 4 transition bars with before/after probabilities |
| `history` | Render a sparkline or expanded trend line for EEP50 over time |

**Transformations:**
- ALL NIH is included as the first profile with `isAggregate: true`
- NIMHD is absent from `history` years 2014 and 2015 (those points have all-null fields)
- `bandRates2025` omits bands with no applications in FY2025
- `resubmission2025` omits transitions where GLM did not converge (no `absGain` available)

---

### `insight_cards.json`

**Purpose:** Narrative content for all 8 app sections. Each section card contains the data insight, interpretation, leadership implication, caution notice, and pre-computed key statistics. Copied unchanged from `outputs/insight_cards.json`.

**App sections:** All — the `InsightCard` component uses this file exclusively for text content.

**Structure:**
```json
{
  "meta": {
    "generated": "March 07, 2026",
    "dataVintage": "FY2014–FY2025",
    "source": "NIH Data Book Report ID 302 …",
    "audience": ["Medical School Research Leadership", …],
    "qcStatus": "68 passed | 0 failed | 11 warnings — cleared for production",
    "fy2025Caution": "…"
  },
  "sections": [
    {
      "id": "overview",
      "title": "NIH Funding Landscape: 2014–2025 Overview",
      "description": "…",
      "data_insight": "…",
      "interpretation": "…",
      "leadership_implication": "…",
      "caution": "…",
      "key_stats": [
        { "label": "ALL NIH EEP50 (FY2025)", "value": "11.1", "note": "…" },
        …
      ]
    },
    …
  ]
}
```

**Section IDs:** `overview`, `institute_comparison`, `band_landscape`, `payline_explorer`, `cross_year_trends`, `resubmission_map`, `institute_typology`, `methods_caveats`

**Key fields per section:**

| Field | Use |
|---|---|
| `title` | Section heading |
| `description` | Subtitle / section overview paragraph |
| `data_insight` | What the data actually shows — factual, cites specific numbers |
| `interpretation` | What it means in context |
| `leadership_implication` | Actionable guidance for research deans, department chairs |
| `caution` | Known limitations specific to this section's analysis; empty string if none |
| `key_stats` | Pre-computed statistics for the `KeyStatGrid` component |

**Transformations:** None — generated by `04_generate_narrative.py` from validated analysis outputs and copied verbatim.

---

## Field name conventions

All JSON files use **camelCase** field names for JavaScript compatibility. Mapping from source CSV:

| CSV column | JSON field | Notes |
|---|---|---|
| `EEP50` | `eep50` | Effective Expected Payline at 50% probability |
| `EEP80` | `eep80` | 80% probability threshold |
| `EEP20` | `eep20` | 20% probability threshold |
| `Opportunity_Width` | `opportunityWidth` | `eep20 − eep80` |
| `Overall_Funding_Rate` | `overallFundingRate` | Proportion 0–1 (not %) |
| `EEP50_YoY_Change` | `eep50YoY` / `eep50YoYChange` | Negative = tightened |
| `Total_Applications` | `totalApplications` | Count |
| `GLM_Converged` | `glmConverged` | boolean |
| `Pseudo_R2` | `pseudoR2` | McFadden R² |
| `Absolute_Gain` | `absGain` | Proportion — multiply × 100 for display in pp |
| `Relative_Gain_Pct` | `relGainPct` | Already a percentage |
| `Transition` (e.g., `"20→15"`) | `"20to15"` | camelCase key; original label in `transitions[].label` |

## Null handling

- All `NaN` values from the source CSV are represented as JSON `null`
- `null` EEP values indicate the GLM did not have sufficient data (8 specific IC-year combos)
- `null` Opportunity Width indicates `EEP20` was null (applies to 11 combos — includes NIGMS, NIMHD, NINR in FY2025)
- Front-end components should render `null` values as `"N/A"` and exclude them from chart series

## Funding rate conventions

Funding rates are stored as **proportions (0–1)**, not percentages, throughout all files. Multiply by 100 for display. Exception: `relGainPct` is already a percentage.

## FY2025 data caution

FY2025 data was extracted from the NIH Data Book in March 2026. Late-cycle pickup awards at higher percentiles may still be processing. All FY2025 values should be treated as preliminary and confirmed against the final NIH Data Book release before use in official institutional reporting.
