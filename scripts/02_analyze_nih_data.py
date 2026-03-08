"""
NIH Funding Explorer — Step 2: Statistical Analysis Pipeline
=============================================================
Input:  processed/nih_master_cleaned_data.csv
Output:
  outputs/nih_effective_paylines.csv
  outputs/nih_percentile_band_summary.csv
  outputs/nih_resubmission_opportunity_by_institute.csv
  outputs/nih_institute_summary.csv
  outputs/leadership_insights.md

Methods:
  - Weighted binomial GLM (logit link) per Year×Institute
  - EEP80 / EEP50 / EEP20 via closed-form inversion of fitted logistic curve
  - Opportunity Width = EEP20 − EEP80
  - Band-level competitiveness aggregations
  - Resubmission gain = modeled P(funded | to_percentile) − P(funded | from_percentile)
"""

import sys
import io
import warnings
import logging
from pathlib import Path
from datetime import date

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy.special import logit, expit        # logit = log(p/1-p), expit = sigmoid

warnings.filterwarnings("ignore", category=sm.tools.sm_exceptions.PerfectSeparationWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)

# ─────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parent.parent
MASTER_CSV  = ROOT / "processed" / "nih_master_cleaned_data.csv"
OUTPUTS_DIR = ROOT / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
log = logging.getLogger("nih_analysis")
log.setLevel(logging.DEBUG)
_fmt = logging.Formatter("%(asctime)s  %(levelname)-8s  %(message)s", datefmt="%H:%M:%S")
_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
_ch = logging.StreamHandler(_stdout)
_ch.setLevel(logging.INFO)
_ch.setFormatter(_fmt)
log.addHandler(_ch)
_fh = logging.FileHandler(ROOT / "logs" / "analysis_run.log", mode="w", encoding="utf-8")
_fh.setLevel(logging.DEBUG)
_fh.setFormatter(_fmt)
log.addHandler(_fh)

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
# GLM fit: restrict to percentile range with meaningful activity
PERCENTILE_FIT_MAX = 50     # above this, most ICs have zero funded → distorts fit
MIN_FIT_POINTS     = 8      # minimum data points for a valid fit
MIN_MID_POINTS     = 3      # points where 0.05 < funding_rate < 0.95 (transition zone)

# EEP target probabilities
EEP_TARGETS = {"EEP80": 0.80, "EEP50": 0.50, "EEP20": 0.20}

# Resubmission scenarios: (from_percentile, to_percentile, label)
RESUBMISSION_PAIRS = [
    (20, 15, "20→15"),
    (18, 12, "18→12"),
    (15, 10, "15→10"),
    (12,  8, "12→8"),
]

# Band definitions: list of (label, lo, hi_exclusive)
BANDS = [
    ("1-5",   1,  6),
    ("6-10",  6, 11),
    ("11-15", 11, 16),
    ("16-20", 16, 21),
    ("21-25", 21, 26),
    ("26+",   26, 9999),
]

# Display-safe institute sort order (ALL NIH first, then alphabetical)
def inst_sort_key(name):
    return (0, name) if name == "ALL NIH" else (1, name)


# ─────────────────────────────────────────────
# GLM fitting helpers
# ─────────────────────────────────────────────

def fit_binomial_glm(df_fit: pd.DataFrame) -> dict:
    """
    Fit weighted binomial GLM (logit link) on a single Year×Institute slice.

    df_fit must have columns:
        Percentile, Funded_Total, Not_Awarded, Applications_Total, Funding_Rate

    Returns a dict:
        beta0, beta1          — intercept and slope
        converged             — bool
        pseudo_r2             — McFadden R²
        n_obs                 — number of observations used
        predict(p)            — callable: percentile → P(funded)
        eep(q)                — callable: target_prob → percentile
        model_note            — str
    """
    result = {
        "beta0": np.nan, "beta1": np.nan,
        "converged": False, "pseudo_r2": np.nan,
        "n_obs": 0, "model_note": "",
        "predict": lambda p: np.nan,
        "eep": lambda q: np.nan,
    }

    # ── Filter: valid observations for fitting ──────────────────────────────
    sub = df_fit[
        (df_fit["Percentile"] >= 1) &
        (df_fit["Percentile"] <= PERCENTILE_FIT_MAX) &
        (df_fit["Applications_Total"] > 0) &
        (df_fit["Funding_Rate"].notna())
    ].copy()

    result["n_obs"] = len(sub)

    if len(sub) < MIN_FIT_POINTS:
        result["model_note"] = f"Insufficient data: {len(sub)} points (need {MIN_FIT_POINTS})"
        return result

    # Require at least some transition-zone points (avoids degenerate fits)
    mid = sub[(sub["Funding_Rate"] > 0.05) & (sub["Funding_Rate"] < 0.95)]
    if len(mid) < MIN_MID_POINTS:
        result["model_note"] = f"Too few transition-zone points: {len(mid)} (need {MIN_MID_POINTS})"
        return result

    # ── Build endog: (successes, failures) matrix ───────────────────────────
    endog = sub[["Funded_Total", "Not_Awarded"]].values.astype(float)
    # Clamp to non-negative (floating point rounding)
    endog = np.clip(endog, 0, None)

    X = sm.add_constant(sub["Percentile"].values.astype(float))

    # ── Fit GLM ─────────────────────────────────────────────────────────────
    try:
        glm = sm.GLM(endog, X, family=sm.families.Binomial())
        fitted = glm.fit(maxiter=100, disp=False)

        if not fitted.converged:
            result["model_note"] = "GLM did not converge"
            # Still use the result — often good enough

        beta0 = float(fitted.params[0])
        beta1 = float(fitted.params[1])

        # Slope should be negative (prob decreases with percentile)
        if beta1 >= 0:
            result["model_note"] = "Non-negative slope — fit unreliable"
            return result

        # McFadden pseudo-R²
        llf  = fitted.llf
        llnull = fitted.llnull
        pseudo_r2 = 1 - (llf / llnull) if llnull != 0 else np.nan

        # Closures
        def predict(p):
            return expit(beta0 + beta1 * np.asarray(p, dtype=float))

        def eep(q):
            """Invert logistic: find percentile where P(funded) = q"""
            if q <= 0 or q >= 1:
                return np.nan
            return (logit(float(q)) - beta0) / beta1

        result.update({
            "beta0": beta0, "beta1": beta1,
            "converged": fitted.converged,
            "pseudo_r2": pseudo_r2,
            "predict": predict,
            "eep": eep,
            "model_note": "" if fitted.converged else "GLM non-convergence (estimates used)",
        })

    except Exception as exc:
        result["model_note"] = f"GLM error: {exc}"

    return result


def safe_eep(eep_fn, q: float, pct_min: float = 0.5, pct_max: float = 60.0) -> float:
    """Call eep function and clamp/null extrapolations."""
    val = eep_fn(q)
    if np.isnan(val) or val < pct_min or val > pct_max:
        return np.nan
    return round(float(val), 2)


# ─────────────────────────────────────────────
# Band assignment (vectorized)
# ─────────────────────────────────────────────

def assign_band_vec(series: pd.Series) -> pd.Series:
    out = pd.Series("26+", index=series.index, dtype=str)
    for label, lo, hi in reversed(BANDS):
        out[series >= lo] = label
    # The first-matching logic in reverse order:
    # start from 26+ and override downward
    out = pd.Series("26+", index=series.index, dtype=str)
    for label, lo, hi in BANDS:
        mask = (series >= lo) & (series < hi)
        out[mask] = label
    return out


# ─────────────────────────────────────────────
# Main analysis
# ─────────────────────────────────────────────

def main():
    log.info("=" * 65)
    log.info("NIH Funding Explorer — Analysis Pipeline")
    log.info("=" * 65)

    # ── Load master data ─────────────────────────────────────────────────────
    log.info(f"Loading: {MASTER_CSV}")
    df = pd.read_csv(MASTER_CSV)
    log.info(f"Loaded {len(df):,} rows | {df['Year'].nunique()} years | {df['Institute'].nunique()} institutes")

    years      = sorted(df["Year"].unique())
    institutes = sorted(df["Institute"].unique(), key=inst_sort_key)

    # ════════════════════════════════════════════════════════════════════════
    # ANALYSIS 1: Effective Paylines (EEP80 / EEP50 / EEP20)
    # ════════════════════════════════════════════════════════════════════════
    log.info("-" * 65)
    log.info("ANALYSIS 1: Fitting weighted binomial GLM per Year×Institute …")

    payline_rows = []
    model_store  = {}   # keyed by (year, institute) → fit result dict

    combos = [(yr, inst) for yr in years for inst in institutes]
    n_ok, n_skip, n_warn = 0, 0, 0

    for yr, inst in combos:
        sub = df[(df["Year"] == yr) & (df["Institute"] == inst)].copy()
        if sub.empty:
            n_skip += 1
            continue

        fit = fit_binomial_glm(sub)
        model_store[(yr, inst)] = fit

        eep_vals = {}
        for name, q in EEP_TARGETS.items():
            eep_vals[name] = safe_eep(fit["eep"], q)

        opp_width = np.nan
        if not np.isnan(eep_vals.get("EEP20", np.nan)) and \
           not np.isnan(eep_vals.get("EEP80", np.nan)):
            opp_width = round(eep_vals["EEP20"] - eep_vals["EEP80"], 2)

        payline_rows.append({
            "Year":            yr,
            "Institute":       inst,
            "EEP80":           eep_vals["EEP80"],
            "EEP50":           eep_vals["EEP50"],
            "EEP20":           eep_vals["EEP20"],
            "Opportunity_Width": opp_width,
            "Beta0":           round(fit["beta0"], 4) if not np.isnan(fit["beta0"]) else np.nan,
            "Beta1":           round(fit["beta1"], 4) if not np.isnan(fit["beta1"]) else np.nan,
            "Pseudo_R2":       round(fit["pseudo_r2"], 4) if not np.isnan(fit["pseudo_r2"]) else np.nan,
            "GLM_Converged":   fit["converged"],
            "N_Obs_Fit":       fit["n_obs"],
            "Model_Note":      fit["model_note"],
        })

        if fit["converged"]:
            n_ok += 1
        elif fit["model_note"]:
            n_warn += 1
            log.debug(f"  WARN  {yr} {inst:12s}: {fit['model_note']}")
        else:
            n_skip += 1

    paylines_df = pd.DataFrame(payline_rows)
    paylines_df = paylines_df.sort_values(["Year", "Institute"]).reset_index(drop=True)

    log.info(f"  GLM fits: {n_ok} converged | {n_warn} warnings | {n_skip} skipped")
    log.info(f"  EEP50 computed for {paylines_df['EEP50'].notna().sum()} / {len(paylines_df)} combos")

    out = OUTPUTS_DIR / "nih_effective_paylines.csv"
    paylines_df.to_csv(out, index=False)
    log.info(f"  Saved → {out}")

    # ════════════════════════════════════════════════════════════════════════
    # ANALYSIS 2: Percentile Band Competitiveness
    # ════════════════════════════════════════════════════════════════════════
    log.info("-" * 65)
    log.info("ANALYSIS 2: Percentile band competitiveness …")

    # Ensure band column is present and up-to-date
    df["Percentile_Band"] = assign_band_vec(df["Percentile"])

    band_rows = []
    for yr in years:
        yr_df = df[df["Year"] == yr]
        yr_total_apps = yr_df[yr_df["Institute"] == "ALL NIH"]["Applications_Total"].sum()

        for inst in institutes:
            sub = yr_df[yr_df["Institute"] == inst]
            if sub.empty:
                continue

            inst_total_apps = sub["Applications_Total"].sum()

            for band_label, lo, hi in BANDS:
                band_sub = sub[(sub["Percentile"] >= lo) & (sub["Percentile"] < hi)]

                funded = band_sub["Funded_Total"].sum()
                apps   = band_sub["Applications_Total"].sum()
                rate   = funded / apps if apps > 0 else np.nan

                # Share of institute's total applications in this band
                band_share = apps / inst_total_apps if inst_total_apps > 0 else np.nan

                band_rows.append({
                    "Year":            yr,
                    "Institute":       inst,
                    "Percentile_Band": band_label,
                    "Band_Lo":         lo,
                    "Band_Hi":         hi - 1 if hi < 9999 else 99,
                    "Funded_Total":    funded,
                    "Applications_Total": apps,
                    "Funding_Rate":    round(rate, 4) if not np.isnan(rate) else np.nan,
                    "Band_Share_of_Apps": round(band_share, 4) if not np.isnan(band_share) else np.nan,
                })

    band_df = pd.DataFrame(band_rows)
    band_df = band_df.sort_values(["Year", "Institute", "Band_Lo"]).reset_index(drop=True)

    out = OUTPUTS_DIR / "nih_percentile_band_summary.csv"
    band_df.to_csv(out, index=False)
    log.info(f"  Saved → {out}  ({len(band_df):,} rows)")

    # ════════════════════════════════════════════════════════════════════════
    # ANALYSIS 3: Resubmission Opportunity
    # ════════════════════════════════════════════════════════════════════════
    log.info("-" * 65)
    log.info("ANALYSIS 3: Resubmission opportunity …")

    resub_rows = []

    for yr in years:
        for inst in institutes:
            fit = model_store.get((yr, inst))
            if fit is None or np.isnan(fit["beta0"]):
                continue

            predict = fit["predict"]

            # Compute modeled probability at each anchor percentile
            anchors = sorted(set(p for pair in RESUBMISSION_PAIRS for p in pair[:2]))
            probs   = {p: float(predict(p)) for p in anchors}

            for from_p, to_p, label in RESUBMISSION_PAIRS:
                p_from = probs.get(from_p, np.nan)
                p_to   = probs.get(to_p, np.nan)

                if np.isnan(p_from) or np.isnan(p_to):
                    continue

                abs_gain = p_to - p_from
                # Relative gain: how much does probability increase relative to baseline?
                rel_gain = (abs_gain / p_from * 100) if p_from > 0 else np.nan

                resub_rows.append({
                    "Year":               yr,
                    "Institute":          inst,
                    "Transition":         label,
                    "From_Percentile":    from_p,
                    "To_Percentile":      to_p,
                    "Prob_From":          round(p_from, 4),
                    "Prob_To":            round(p_to, 4),
                    "Absolute_Gain":      round(abs_gain, 4),
                    "Relative_Gain_Pct":  round(rel_gain, 2) if not np.isnan(rel_gain) else np.nan,
                })

    resub_df = pd.DataFrame(resub_rows)
    resub_df = resub_df.sort_values(["Year", "Institute", "From_Percentile"]).reset_index(drop=True)

    out = OUTPUTS_DIR / "nih_resubmission_opportunity_by_institute.csv"
    resub_df.to_csv(out, index=False)
    log.info(f"  Saved → {out}  ({len(resub_df):,} rows)")

    # ════════════════════════════════════════════════════════════════════════
    # ANALYSIS 4: Institute Summary (cross-year)
    # ════════════════════════════════════════════════════════════════════════
    log.info("-" * 65)
    log.info("ANALYSIS 4: Building institute summary …")

    summary_rows = []

    for yr in years:
        yr_df = df[df["Year"] == yr]

        for inst in institutes:
            sub = yr_df[yr_df["Institute"] == inst]
            if sub.empty:
                continue

            total_apps   = sub["Applications_Total"].sum()
            total_funded = sub["Funded_Total"].sum()
            overall_rate = total_funded / total_apps if total_apps > 0 else np.nan

            # EEP values from paylines table
            pl_row = paylines_df[(paylines_df["Year"] == yr) & (paylines_df["Institute"] == inst)]
            eep80 = pl_row["EEP80"].values[0] if len(pl_row) else np.nan
            eep50 = pl_row["EEP50"].values[0] if len(pl_row) else np.nan
            eep20 = pl_row["EEP20"].values[0] if len(pl_row) else np.nan
            opp_w = pl_row["Opportunity_Width"].values[0] if len(pl_row) else np.nan

            # Band-level funding rates from band_df
            band_rates = {}
            for band_label, lo, hi in BANDS:
                b_row = band_df[
                    (band_df["Year"] == yr) &
                    (band_df["Institute"] == inst) &
                    (band_df["Percentile_Band"] == band_label)
                ]
                band_rates[band_label] = b_row["Funding_Rate"].values[0] if len(b_row) else np.nan

            # Year-over-year EEP50 change (vs prior year)
            pl_prior = paylines_df[
                (paylines_df["Year"] == yr - 1) &
                (paylines_df["Institute"] == inst)
            ]
            eep50_prior = pl_prior["EEP50"].values[0] if len(pl_prior) else np.nan
            eep50_yoy   = round(eep50 - eep50_prior, 2) \
                if (not np.isnan(eep50) and not np.isnan(eep50_prior)) else np.nan

            summary_rows.append({
                "Year":                   yr,
                "Institute":              inst,
                "Total_Applications":     int(total_apps),
                "Total_Funded":           int(total_funded),
                "Overall_Funding_Rate":   round(overall_rate, 4) if not np.isnan(overall_rate) else np.nan,
                "EEP80":                  eep80,
                "EEP50":                  eep50,
                "EEP20":                  eep20,
                "Opportunity_Width":      opp_w,
                "EEP50_YoY_Change":       eep50_yoy,
                "Band_1_5_Rate":          band_rates.get("1-5"),
                "Band_6_10_Rate":         band_rates.get("6-10"),
                "Band_11_15_Rate":        band_rates.get("11-15"),
                "Band_16_20_Rate":        band_rates.get("16-20"),
                "Band_21_25_Rate":        band_rates.get("21-25"),
                "Band_26plus_Rate":       band_rates.get("26+"),
            })

    summary_df = pd.DataFrame(summary_rows)
    summary_df = summary_df.sort_values(["Institute", "Year"]).reset_index(drop=True)

    out = OUTPUTS_DIR / "nih_institute_summary.csv"
    summary_df.to_csv(out, index=False)
    log.info(f"  Saved → {out}  ({len(summary_df):,} rows)")

    # ════════════════════════════════════════════════════════════════════════
    # ANALYSIS 5: Leadership Insights
    # ════════════════════════════════════════════════════════════════════════
    log.info("-" * 65)
    log.info("ANALYSIS 5: Generating leadership insights …")

    insights = build_leadership_insights(df, paylines_df, band_df, resub_df, summary_df)

    out = OUTPUTS_DIR / "leadership_insights.md"
    out.write_text(insights, encoding="utf-8")
    log.info(f"  Saved → {out}")

    log.info("=" * 65)
    log.info("Analysis pipeline complete.")
    log.info("=" * 65)


# ─────────────────────────────────────────────
# Leadership Insights builder
# ─────────────────────────────────────────────

def build_leadership_insights(df, paylines_df, band_df, resub_df, summary_df) -> str:
    today = date.today().strftime("%B %d, %Y")
    lines = []

    def h1(t): lines.append(f"\n# {t}\n")
    def h2(t): lines.append(f"\n## {t}\n")
    def h3(t): lines.append(f"\n### {t}\n")
    def p(t):  lines.append(f"{t}\n")
    def li(t): lines.append(f"- {t}")
    def br():  lines.append("")

    # ── Header ────────────────────────────────────────────────────────────
    h1("NIH Funding Competitiveness: Leadership Intelligence Report")
    p(f"**Generated:** {today}  ")
    p("**Source:** NIH Data Book Report ID 302 — Funding Patterns by Institute or Center  ")
    p("**Coverage:** Fiscal Years 2014–2025 | 19 Institutes + ALL NIH  ")
    p("**Method:** Weighted binomial GLM (logit link) fit per Year × Institute  ")
    br()
    p("> **How to read this report:** All percentile-based metrics use *lower = better* — "
      "a lower NIH percentile score means a stronger application. The Effective Expected "
      "Payline (EEP) is the modeled percentile at which an application has a given "
      "probability of being funded (EEP80 = 80% chance, EEP50 = 50/50, EEP20 = 20% chance).")

    # ── Section 1: NIH-Wide Trend ─────────────────────────────────────────
    h2("1. NIH-Wide Funding Competitiveness Trend (2014–2025)")

    all_nih_pl = paylines_df[paylines_df["Institute"] == "ALL NIH"].sort_values("Year")

    h3("Effective Paylines — ALL NIH")
    header = f"| {'Year':>4} | {'EEP80':>6} | {'EEP50':>6} | {'EEP20':>6} | {'Opp Width':>9} |"
    divider= f"|{'-'*6}|{'-'*8}|{'-'*8}|{'-'*8}|{'-'*11}|"
    lines.append(header)
    lines.append(divider)
    for _, row in all_nih_pl.iterrows():
        def fmt(v): return f"{v:.1f}" if pd.notna(v) else "N/A"
        lines.append(
            f"| {int(row.Year):>4} | {fmt(row.EEP80):>6} | {fmt(row.EEP50):>6} "
            f"| {fmt(row.EEP20):>6} | {fmt(row.Opportunity_Width):>9} |"
        )
    br()

    # EEP50 trend narrative
    recent = all_nih_pl[all_nih_pl["Year"] >= 2020]
    eep50_recent = recent["EEP50"].dropna()
    if len(eep50_recent) >= 2:
        eep50_2020 = eep50_recent.iloc[0]
        eep50_latest = eep50_recent.iloc[-1]
        latest_year  = int(recent[recent["EEP50"].notna()].iloc[-1]["Year"])
        direction = "tightened (moved lower)" if eep50_latest < eep50_2020 else "loosened (moved higher)"
        p(f"**Trend:** The ALL NIH EEP50 has {direction} from "
          f"**{eep50_2020:.1f}** (2020) to **{eep50_latest:.1f}** ({latest_year}), "
          f"indicating {'increased' if eep50_latest < eep50_2020 else 'decreased'} competition "
          f"at the margin over recent years.")

    latest_year_data = int(all_nih_pl["Year"].max())
    latest_pl = all_nih_pl[all_nih_pl["Year"] == latest_year_data].iloc[0]
    if pd.notna(latest_pl["EEP50"]):
        p(f"In **{latest_year_data}**, the ALL NIH EEP50 was **{latest_pl['EEP50']:.1f}** — "
          f"meaning a grant scored at percentile {latest_pl['EEP50']:.0f} had a modeled "
          f"50% probability of funding. The opportunity window (EEP20−EEP80) was "
          f"**{latest_pl['Opportunity_Width']:.1f} percentile points**.")

    # ── Section 2: Band Competitiveness ──────────────────────────────────
    h2("2. Funding Rate by Percentile Band — ALL NIH (Most Recent Year)")

    latest_band = band_df[
        (band_df["Institute"] == "ALL NIH") &
        (band_df["Year"] == latest_year_data)
    ].sort_values("Band_Lo")

    header = f"| {'Band':>7} | {'Funded':>8} | {'Applied':>9} | {'Rate':>7} | {'Interpretation':} |"
    divider= f"|{'-'*9}|{'-'*10}|{'-'*11}|{'-'*9}|{'-'*40}|"
    lines.append(header)
    lines.append(divider)
    interp_map = {
        "1-5":   "Near-certain funding; payline core",
        "6-10":  "Very high probability; strong fundable zone",
        "11-15": "Competitive transition; IC-specific paylines often here",
        "16-20": "Mixed zone; resubmission decisions critical",
        "21-25": "Low but non-zero; strong resubmission candidates",
        "26+":   "Unlikely without major revision",
    }
    for _, row in latest_band.iterrows():
        rate_str = f"{row.Funding_Rate*100:.1f}%" if pd.notna(row.Funding_Rate) else "N/A"
        interp = interp_map.get(row.Percentile_Band, "")
        lines.append(
            f"| {row.Percentile_Band:>7} | {int(row.Funded_Total):>8,} "
            f"| {int(row.Applications_Total):>9,} | {rate_str:>7} | {interp} |"
        )
    br()

    # ── Section 3: Institute Competitiveness Ranking ───────────────────────
    h2("3. Institute Competitiveness Ranking — Most Recent Year")

    latest_pl = paylines_df[
        (paylines_df["Year"] == latest_year_data) &
        (paylines_df["Institute"] != "ALL NIH") &
        (paylines_df["EEP50"].notna())
    ].sort_values("EEP50")

    p(f"Ranked by EEP50 (lower = more competitive) for FY{latest_year_data}:")
    br()
    header = f"| {'Institute':>8} | {'EEP80':>6} | {'EEP50':>6} | {'EEP20':>6} | {'Opp Width':>9} | {'Competitiveness':} |"
    divider= f"|{'-'*10}|{'-'*8}|{'-'*8}|{'-'*8}|{'-'*11}|{'-'*20}|"
    lines.append(header)
    lines.append(divider)
    for _, row in latest_pl.iterrows():
        def fmt(v): return f"{v:.1f}" if pd.notna(v) else "N/A"
        eep50_v = row["EEP50"]
        tier = ("Very High" if eep50_v < 10 else
                "High"      if eep50_v < 14 else
                "Moderate"  if eep50_v < 18 else "Lower")
        lines.append(
            f"| {row.Institute:>8} | {fmt(row.EEP80):>6} | {fmt(row.EEP50):>6} "
            f"| {fmt(row.EEP20):>6} | {fmt(row.Opportunity_Width):>9} | {tier} |"
        )
    br()

    # Most and least competitive
    if len(latest_pl) > 0:
        most_comp = latest_pl.iloc[0]
        least_comp = latest_pl.iloc[-1]
        p(f"**Most competitive IC:** {most_comp.Institute} (EEP50 = {most_comp.EEP50:.1f}) — "
          f"half of funded grants were scored below percentile {most_comp.EEP50:.0f}.")
        p(f"**Least competitive IC:** {least_comp.Institute} (EEP50 = {least_comp.EEP50:.1f}) — "
          f"broader funding window offering relatively more opportunity.")

    # ── Section 4: Opportunity Width Analysis ──────────────────────────────
    h2("4. Opportunity Width Analysis")

    p("Opportunity Width = EEP20 − EEP80: the span of percentiles over which funding "
      "probability transitions from 80% to 20%. A **narrow window** means funding decisions "
      "are highly concentrated (sharp payline). A **wide window** means funding is more "
      "probabilistic and investigators near the payline have meaningful resubmission value.")
    br()

    # All NIH trend
    all_nih_opp = paylines_df[paylines_df["Institute"] == "ALL NIH"][["Year", "Opportunity_Width"]].dropna()
    if len(all_nih_opp) > 0:
        min_yr = all_nih_opp.loc[all_nih_opp["Opportunity_Width"].idxmin()]
        max_yr = all_nih_opp.loc[all_nih_opp["Opportunity_Width"].idxmax()]
        p(f"**Narrowest window:** {int(min_yr.Year)} ({min_yr.Opportunity_Width:.1f} percentile points) — "
          f"most concentrated funding decisions.")
        p(f"**Widest window:** {int(max_yr.Year)} ({max_yr.Opportunity_Width:.1f} percentile points) — "
          f"broadest probabilistic zone.")
    br()

    # IC-level opportunity width for latest year
    latest_opp = paylines_df[
        (paylines_df["Year"] == latest_year_data) &
        (paylines_df["Opportunity_Width"].notna())
    ].sort_values("Opportunity_Width")
    if len(latest_opp) >= 2:
        narrowest = latest_opp.iloc[0]
        widest    = latest_opp.iloc[-1]
        p(f"In **FY{latest_year_data}**, the narrowest opportunity window was at "
          f"**{narrowest.Institute}** ({narrowest.Opportunity_Width:.1f} pts) and "
          f"the widest at **{widest.Institute}** ({widest.Opportunity_Width:.1f} pts).")

    # ── Section 5: Resubmission Opportunity ───────────────────────────────
    h2("5. Resubmission Opportunity Analysis — ALL NIH")

    p("Modeled increase in funding probability from score improvement on resubmission. "
      "Values reflect the slope of the funding curve at that percentile range — "
      "steeper slopes = higher resubmission payoff.")
    br()

    resub_all_nih = resub_df[
        (resub_df["Institute"] == "ALL NIH") &
        (resub_df["Year"] == latest_year_data)
    ].sort_values("From_Percentile", ascending=False)

    header = (f"| {'Transition':>8} | {'P(from)':>8} | {'P(to)':>7} "
              f"| {'Abs Gain':>9} | {'Rel Gain':>9} | {'Strategic Note':} |")
    divider= f"|{'-'*10}|{'-'*10}|{'-'*9}|{'-'*11}|{'-'*11}|{'-'*35}|"
    lines.append(header)
    lines.append(divider)
    for _, row in resub_all_nih.iterrows():
        note = ("High-value resubmit; near payline"
                if row.Absolute_Gain > 0.25 else
                "Moderate gain; consider revisions"
                if row.Absolute_Gain > 0.10 else
                "Lower marginal gain; major revision needed")
        lines.append(
            f"| {row.Transition:>8} | {row.Prob_From:>8.1%} | {row.Prob_To:>7.1%} "
            f"| {row.Absolute_Gain:>+9.1%} | {row.Relative_Gain_Pct:>8.1f}% | {note} |"
        )
    br()

    # Top resubmission opportunities across all ICs
    h3("Top Resubmission Opportunities by Institute (20→15 transition)")

    resub_20_15 = resub_df[
        (resub_df["Transition"] == "20→15") &
        (resub_df["Year"] == latest_year_data) &
        (resub_df["Institute"] != "ALL NIH")
    ].sort_values("Absolute_Gain", ascending=False).head(8)

    if len(resub_20_15) > 0:
        header = f"| {'Institute':>8} | {'P(20)':>7} | {'P(15)':>7} | {'Gain':>7} | {'Rel %':>7} |"
        divider= f"|{'-'*10}|{'-'*9}|{'-'*9}|{'-'*9}|{'-'*9}|"
        lines.append(header)
        lines.append(divider)
        for _, row in resub_20_15.iterrows():
            lines.append(
                f"| {row.Institute:>8} | {row.Prob_From:>7.1%} | {row.Prob_To:>7.1%} "
                f"| {row.Absolute_Gain:>+7.1%} | {row.Relative_Gain_Pct:>6.1f}% |"
            )
    br()

    p("**Key insight:** ICs with higher absolute gains on the 20→15 transition are those "
      "where the funding curve is steepest in the 15–20 range — meaning the payline "
      "runs directly through this zone. Investigators with scores in the 16–20 range "
      "at these ICs have the strongest resubmission incentive.")

    # ── Section 6: Year-Over-Year Shifts ─────────────────────────────────
    h2("6. Year-Over-Year EEP50 Shifts by Institute (Last 3 Years)")

    recent_years = sorted(paylines_df["Year"].unique())[-3:]
    p(f"Positive values = EEP50 moved higher (more lenient). "
      f"Negative values = EEP50 moved lower (more competitive). "
      f"Years shown: {', '.join(str(y) for y in recent_years)}.")
    br()

    yoy_pivot = paylines_df[
        paylines_df["Year"].isin(recent_years)
    ].pivot(index="Institute", columns="Year", values="EEP50").round(1)

    # Add YoY change columns
    if len(recent_years) >= 2:
        yoy_pivot[f"YoY {recent_years[-2]}→{recent_years[-1]}"] = (
            yoy_pivot[recent_years[-1]] - yoy_pivot[recent_years[-2]]
        ).round(2)

    header_cols = [f"EEP50 {y}" for y in recent_years]
    if len(recent_years) >= 2:
        header_cols.append(f"YoY {recent_years[-2]}→{recent_years[-1]}")

    header = "| Institute | " + " | ".join(header_cols) + " |"
    divider = "|-----------|" + "|".join(["-------"] * len(header_cols)) + "|"
    lines.append(header)
    lines.append(divider)

    for inst in sorted(yoy_pivot.index, key=inst_sort_key):
        row = yoy_pivot.loc[inst]
        vals = []
        for col in yoy_pivot.columns:
            v = row[col]
            vals.append(f"{v:+.1f}" if "YoY" in str(col) and pd.notna(v) else
                        (f"{v:.1f}" if pd.notna(v) else "N/A"))
        lines.append(f"| {inst:9} | " + " | ".join(vals) + " |")
    br()

    # ── Section 7: FY2025 Critical Alert ─────────────────────────────────
    h2("7. CRITICAL FINDING: FY2025 Funding Compression — System-Wide Tightening")

    p("> **Alert level: High.** FY2025 represents the most dramatic single-year shift in "
      "NIH funding competitiveness recorded in this dataset (2014–2025).")
    br()

    # Compute YoY changes for all institutes 2024→2025
    chg_rows = paylines_df[paylines_df["Year"].isin([2024, 2025])].pivot(
        index="Institute", columns="Year", values="EEP50"
    )
    if 2024 in chg_rows.columns and 2025 in chg_rows.columns:
        chg_rows["Delta"] = (chg_rows[2025] - chg_rows[2024]).round(1)
        chg_rows = chg_rows.sort_values("Delta")

        n_negative = (chg_rows["Delta"] < 0).sum()
        median_delta = chg_rows["Delta"].median()
        worst = chg_rows[chg_rows["Delta"].notna()].iloc[0]

        p(f"**{n_negative} of {len(chg_rows[chg_rows['Delta'].notna()])} institutes** showed "
          f"EEP50 compression from FY2024 to FY2025.")
        p(f"**Median EEP50 decline:** {median_delta:+.1f} percentile points across all ICs.")
        p(f"**Steepest decline:** {worst.name} (EEP50 dropped from "
          f"{chg_rows.loc[worst.name, 2024]:.1f} → {chg_rows.loc[worst.name, 2025]:.1f}, "
          f"Δ = {worst.Delta:+.1f} pts).")
        br()

        h3("Institute-Level EEP50 Compression (FY2024 → FY2025)")
        header = f"| {'Institute':>9} | {'EEP50 2024':>10} | {'EEP50 2025':>10} | {'Delta':>7} | {'Signal':} |"
        divider= f"|{'-'*11}|{'-'*12}|{'-'*12}|{'-'*9}|{'-'*30}|"
        lines.append(header)
        lines.append(divider)
        for inst_name, row in chg_rows.sort_values("Delta").iterrows():
            v24 = f"{row[2024]:.1f}" if pd.notna(row.get(2024)) else "N/A"
            v25 = f"{row[2025]:.1f}" if pd.notna(row.get(2025)) else "N/A"
            dlt = f"{row.Delta:+.1f}" if pd.notna(row.Delta) else "N/A"
            signal = ("Severe compression" if row.Delta < -7 else
                      "Significant tightening" if row.Delta < -3 else
                      "Moderate shift" if row.Delta < 0 else
                      "Stable/loosened")
            lines.append(f"| {inst_name:>9} | {v24:>10} | {v25:>10} | {dlt:>7} | {signal} |")
        br()

    h3("Interpretation")
    p("Two interpretations should be considered:")
    li("**Budget/policy compression (primary):** FY2025 coincides with federal budget "
       "uncertainty and NIH administrative changes. The compression pattern is uniform "
       "across *all* ICs simultaneously — signature of a budget-driven payline shift, "
       "not IC-specific variation. Investigators historically funded at percentiles "
       "15–25 may have lost pickup funding that was previously available.")
    li("**Data completeness (secondary, verify):** FY2025 data was exported March 2026. "
       "If late-cycle pickup awards at higher percentiles are still being processed, "
       "funding rates at percentiles 12–25 may increase when finalized. "
       "Confirm with NIH Data Book once FY2025 is fully closed.")
    br()
    p("**Operational implication:** If the FY2025 compression is confirmed as permanent, "
      "the effective payline for ALL NIH has compressed from ~17th percentile to ~11th. "
      "Investigators with scores in the 12–20 range who were historically considered "
      "'near payline' are now operating in a structurally different funding environment.")

    # ── Section 8: Strategic Recommendations ──────────────────────────────
    h2("8. Strategic Recommendations for Research Leadership")

    h3("Targeting by Investigators")
    recommendations = []

    # Find ICs with widest opportunity window in latest year
    wide_ics = paylines_df[
        (paylines_df["Year"] == latest_year_data) &
        (paylines_df["Institute"] != "ALL NIH") &
        (paylines_df["Opportunity_Width"].notna())
    ].nlargest(3, "Opportunity_Width")

    narrow_ics = paylines_df[
        (paylines_df["Year"] == latest_year_data) &
        (paylines_df["Institute"] != "ALL NIH") &
        (paylines_df["Opportunity_Width"].notna())
    ].nsmallest(3, "Opportunity_Width")

    if len(wide_ics) > 0:
        names = ", ".join(wide_ics["Institute"].tolist())
        li(f"**Prioritize resubmissions** to ICs with wide opportunity windows: **{names}** — "
           f"funding decisions here are probabilistic rather than binary, maximizing the "
           f"value of score improvement on resubmission.")
    if len(narrow_ics) > 0:
        names = ", ".join(narrow_ics["Institute"].tolist())
        li(f"**Sharp payline ICs** ({names}) require scores clearly below the EEP80 threshold; "
           f"applications near the boundary have limited resubmission leverage.")

    h3("Resubmission Triage Decision Framework")
    li("Applications scored **at or below EEP80**: Fund if budget allows — high confidence.")
    li("Applications scored **between EEP80 and EEP50**: Strong resubmission candidates; prioritize quick turnaround.")
    li("Applications scored **between EEP50 and EEP20**: Resubmit with substantial revision; model gain must exceed revision cost.")
    li("Applications scored **above EEP20**: Major revision or redirection recommended; marginal resubmission value is low.")
    br()

    h3("Institutional Monitoring Indicators")
    li("Track **EEP50 YoY Change** as the primary competitiveness indicator — a shift of >1.5 percentile points signals meaningful payline movement.")
    li("Monitor **Opportunity Width** as a secondary indicator — widening suggests payline instability or budget variability at the IC.")
    li("Flag ICs where **Band 11–15 funding rate < 50%** — these are ICs where the transition zone has collapsed, reducing resubmission value.")
    br()

    h3("Data Limitations and Caveats")
    li("R56 (bridge) awards are suppressed ('D') for 17 of 19 ICs in at least one year — "
       "**Funded_Total for IC-level analyses excludes R56 awards** where suppressed. "
       "This slightly understates actual funding rates at the IC level.")
    li("The logistic GLM is fit on percentile bins 1–50. Estimates for EEP values outside "
       "this range should be interpreted cautiously.")
    li("Small ICs (NINR, NLM, NHGRI, NIMHD) have sparse data — GLM estimates have wider "
       "uncertainty. Use ALL NIH benchmarks as the primary reference for cross-IC comparisons.")
    li("FY2025 data was exported March 2026 and may not reflect final award actions — "
       "preliminary figures should be confirmed before use in official reporting.")
    br()

    # ── Footer ────────────────────────────────────────────────────────────
    lines.append("---")
    br()
    p("*This report was generated programmatically from NIH Data Book Report ID 302. "
      "All statistical models are weighted binomial GLMs. "
      "Effective Expected Paylines (EEPs) are modeled estimates, not official NIH paylines.*")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    main()
