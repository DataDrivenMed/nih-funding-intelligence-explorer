# NIH Funding Intelligence Explorer

**Effective Expected Payline Analysis · 20 Institutes & Centers · FY2014–2025**

https://datadrivenmed.github.io/nih-funding-intelligence-explorer/

---

## Overview

Standard NIH paylines are reported as single-percentile thresholds, but funding probability
is a continuous function of score. An application at the 14th percentile and one at the 19th
face meaningfully different odds — and that gap shifts across institutes and years in ways
that matter for portfolio management, resubmission strategy, and faculty development.

This project builds a principled quantitative alternative. Using NIH Data Book Report 302
(238 Excel files, FY2014–FY2025), a weighted binomial logistic regression model is fit per
institute-year pair. Each model yields two parameters that fully characterize the funding
probability curve for that year and institute. From these parameters, three key thresholds
are derived analytically:

- **EEP80** — percentile at which an application has a modeled 80% funding probability
- **EEP50** — percentile at which funding probability crosses 50% (the "statistical payline")
- **EEP20** — percentile at which funding probability falls to 20%

The span between EEP20 and EEP80 — the **Opportunity Width** — quantifies how sharp or
diffuse the funding transition is. A narrow width indicates a hard payline; a wider window
indicates that score improvement translates to meaningful probability gains across a broader
range.

The interactive dashboard makes this analysis accessible to research leadership without
requiring statistical expertise.

---

## What the data shows

The FY2025 ALL-NIH EEP50 of **11.1** represents a drop of 5.6 percentile points from
FY2024 (16.8) and 7.7 percentile points below the FY2015–2024 historical mean (~18.9),
placing it approximately 8.9 standard deviations below the decade baseline. This compression, combined with the narrowing of
the Opportunity Width across multiple institutes, has material implications for resubmission
strategy and portfolio risk.

The dashboard provides institute-level breakdowns, cross-year trend analysis, resubmission
probability gain estimates, and a typology framework that classifies each IC by its payline
structure and opportunity window.

---

## Methodology

**Data ingestion:** 238 Excel files from NIH Data Book Report 302 (Report ID 302),
covering FY2014–FY2025 across 20 institutes and centers.

**Cleaning:** Suppressed R56 values (coded "D") are treated as missing. Rows with
percentile = 0 are dropped. Funded_Total is computed as R01-equivalent awards plus
R56 awards (NaN-safe addition).

**Model:** Weighted binomial GLM with logit link, fit per institute-year pair.
Predictor: percentile score (1–50). Response: (Funded_Total, Not_Awarded).
Minimum 8 observations and 3 in the transition zone required for model inclusion.

**EEP computation:** EEP(q) = (logit(q) − β₀) / β₁, clamped to [0.5, 60.0].
Opportunity Width = EEP(0.20) − EEP(0.80).

**Quality control:** 68 automated checks across model convergence, parameter
plausibility, EEP ordering, and data completeness. 230 of 240 possible institute-year
pairs yielded converged, usable models. Mean McFadden pseudo-R² = 0.806;
ALL-NIH models average R² = 0.963.

**FY2025 status:** Data extracted March 2026. FY2025 is preliminary — late-cycle
pickup awards and administrative supplements may not yet be reflected. Values should
be confirmed against the final NIH Data Book before use in official reporting.

---

## Dashboard sections

| Section | Description |
|---|---|
| Overview | ALL-NIH EEP trend (FY2014–2025), key metrics, year-over-year context |
| IC Comparison | Cross-institute EEP50 and Opportunity Width ranked bar chart |
| Band Landscape | Funding rates by percentile band across selected years |
| Payline Explorer | Per-institute logistic curve with live probability calculator |
| Cross-Year Trends | Multi-line institute trend comparison with YoY change table |
| Resubmission Map | Probability gain from score improvement by transition tier |
| IC Typology | Scatter plot classifying institutes by payline structure |
| Methods & Caveats | Pipeline documentation, model equations, known limitations |

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Deployment | GitHub Pages via GitHub Actions |
| Data pipeline | Python 3 · pandas · statsmodels |

All JSON data is bundled at build time via Vite static imports — no server, database,
or API calls at runtime.

---

## Repository structure

```
NIH-Funding-Explorer/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automatic GitHub Pages deployment on push to main
├── web/                        # React application
│   ├── src/
│   │   ├── data/               # JSON data files (bundled at build time)
│   │   ├── sections/           # One component per dashboard section
│   │   ├── components/         # Shared UI primitives (InsightCard, ui.tsx)
│   │   ├── theme.ts            # Shared chart color and style constants
│   │   └── utils.ts            # Logistic math, EEP helpers, quadrant logic
│   ├── vite.config.ts
│   └── package.json
├── scripts/                    # Python data pipeline (scripts 01–05)
├── outputs/                    # Analysis CSVs, validation reports, data dictionary
└── .gitignore
```

---

## Local development

```powershell
cd web
npm install
npm run dev
```

Open http://localhost:5173

---

## Deployment

### Automatic (GitHub Actions) — recommended

Every push to `main` triggers a build and deploy. One-time setup:

1. Create the repository on GitHub: `DataDrivenMed/nih-funding-intelligence-explorer`

2. Push the code:

   ```powershell
   cd C:\Users\rparag\NIH-Funding-Explorer
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DataDrivenMed/nih-funding-intelligence-explorer.git
   git push -u origin main
   ```

3. In the repository settings: **Settings → Pages → Source → GitHub Actions → Save**

4. The workflow runs automatically. The app is live at:
   https://datadrivenmed.github.io/nih-funding-intelligence-explorer/

Subsequent deploys: `git push` — no additional steps required.

---

### Manual (Windows PowerShell)

```powershell
cd C:\Users\rparag\NIH-Funding-Explorer\web

# Build with the correct base path for GitHub Pages
$env:VITE_BASE_PATH = '/nih-funding-intelligence-explorer/'
npm run build
Remove-Item Env:VITE_BASE_PATH

# Add .nojekyll to prevent Jekyll from ignoring _assets/
New-Item -ItemType File -Path dist\.nojekyll -Force

# Deploy to gh-pages branch
npx gh-pages --dist dist --repo https://github.com/DataDrivenMed/nih-funding-intelligence-explorer.git
```

In repository settings: **Settings → Pages → Source → Deploy from a branch → gh-pages / root**

> **Git Bash users:** use `MSYS_NO_PATHCONV=1 VITE_BASE_PATH='/nih-funding-intelligence-explorer/' npm run build`
> to prevent Git Bash from mangling the leading `/` in the base path.

---

## Updating data

When new NIH Data Book exports are available:

```powershell
cd C:\Users\rparag\NIH-Funding-Explorer

py -X utf8 scripts\01_ingest.py
py -X utf8 scripts\02_clean.py
py -X utf8 scripts\03_analyze.py
py -X utf8 scripts\04_insights.py
py -X utf8 scripts\05_convert_to_json.py

git add .
git commit -m "Data update: FY20XX"
git push
```

---

## Limitations

- EEP values are modeled estimates derived from aggregate award data, not administrative
  paylines. Individual grant outcomes depend on scientific merit review, program officer
  judgment, council action, and set-aside funding — none of which are captured in
  percentile-band award counts.

- Funded_Total understates true awards at the IC level by the number of suppressed R56
  bridge awards (coded "D" in source data). The bias is consistent and directionally
  downward across all affected ICs.

- The logistic model requires a minimum of 8 observations with at least 3 in the score
  transition zone. Institute-years that do not meet this threshold are excluded; their
  absence from a given chart reflects data sparsity, not a data error.

- NIMHD is absent from FY2014 and FY2015 because it was not independently tracked in
  Report 302 until FY2016.

---

## Data source

NIH Data Book Report ID 302 — Funding Patterns by Percentile Band, by Institute/Center.
National Institutes of Health, Office of Budget.
For research leadership and strategic planning use only. Not an official NIH publication.
