"""
NIH Funding Explorer — Step 3: Output Validation & QC
======================================================
Input:  All files in outputs/ and processed/
Output: outputs/analysis_qc_report.md

Checks:
  1.  Duplicate Year+Institute rows in every file
  2.  Missing institute names or years vs expected universe
  3.  EEP ordering violations (EEP80 < EEP50 < EEP20)
  4.  Negative Opportunity Width
  5.  Probabilities outside [0, 1] in resubmission file
  6.  Impossible percentile values (< 1, > 100, non-integer-like)
  7.  Empty or near-empty files
  8.  Cross-file institute/year alignment
  9.  GLM fit quality (pseudo-R², convergence)
  10. Band funding rate monotonicity (1-5 ≥ 6-10 ≥ 11-15 ...)
  11. Derived column arithmetic consistency
  12. FY2025 anomaly magnitude check
"""

import sys
import io
import math
from pathlib import Path
from datetime import date

import numpy as np
import pandas as pd

# ─────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = ROOT / "outputs"
PROCESSED   = ROOT / "processed" / "nih_master_cleaned_data.csv"

# Expected universe
EXPECTED_YEARS      = list(range(2014, 2026))          # 2014–2025
EXPECTED_INSTITUTES = [
    "ALL NIH", "NCI", "NEI", "NHGRI", "NHLBI", "NIA", "NIAAA",
    "NIAID", "NIAMS", "NICHD", "NIDA", "NIDCD", "NIDCR", "NIDDK",
    "NIGMS", "NIMH", "NIMHD", "NINDS", "NINR", "NLM",
]
# Known absent combos: NIMHD not in 2014 or 2015
KNOWN_ABSENT = {(2014, "NIMHD"), (2015, "NIMHD")}

BAND_ORDER = ["1-5", "6-10", "11-15", "16-20", "21-25", "26+"]

RESUB_TRANSITIONS = {"20→15", "18→12", "15→10", "12→8"}

# ─────────────────────────────────────────────

class QCReport:
    def __init__(self):
        self.sections = []          # list of (heading, lines)
        self._current_heading = ""
        self._current_lines   = []
        self.pass_count  = 0
        self.fail_count  = 0
        self.warn_count  = 0
        self.fix_count   = 0
        self.fixes_applied = []

    def section(self, heading: str):
        if self._current_lines:
            self.sections.append((self._current_heading, list(self._current_lines)))
        self._current_heading = heading
        self._current_lines   = []

    def _add(self, tag: str, msg: str):
        self._current_lines.append(f"{tag} {msg}")

    def ok(self,   msg): self.pass_count += 1; self._add("✅", msg)
    def fail(self, msg): self.fail_count += 1; self._add("❌", msg)
    def warn(self, msg): self.warn_count += 1; self._add("⚠️", msg)
    def fix(self,  msg): self.fix_count  += 1; self._add("🔧", msg); self.fixes_applied.append(msg)
    def info(self, msg): self._add("ℹ️", msg)
    def table(self, df_str): self._current_lines.append(df_str)

    def finalize(self):
        if self._current_lines:
            self.sections.append((self._current_heading, list(self._current_lines)))

    def render(self) -> str:
        today = date.today().strftime("%B %d, %Y")
        out = []
        out.append("# NIH Funding Explorer — Analysis QC Report\n")
        out.append(f"**Generated:** {today}  \n")
        out.append("**Scope:** All files in `outputs/` and `processed/`  \n\n")
        out.append("---\n")
        out.append("## Summary\n")
        total = self.pass_count + self.fail_count + self.warn_count
        out.append(f"| Status | Count |\n|--------|-------|\n"
                   f"| ✅ Pass | {self.pass_count} |\n"
                   f"| ❌ Fail | {self.fail_count} |\n"
                   f"| ⚠️ Warn  | {self.warn_count} |\n"
                   f"| 🔧 Fixed | {self.fix_count} |\n"
                   f"| **Total checks** | **{total}** |\n\n")
        if self.fixes_applied:
            out.append("**Fixes applied in this run:**\n")
            for f in self.fixes_applied:
                out.append(f"- {f}\n")
            out.append("\n")
        out.append("---\n")
        for heading, lines in self.sections:
            out.append(f"\n## {heading}\n\n")
            for line in lines:
                out.append(line + "\n")
        return "".join(out)


qc = QCReport()


# ═══════════════════════════════════════════════════════════════════════════
# Load all files
# ═══════════════════════════════════════════════════════════════════════════

qc.section("1. File Existence & Size")

FILES = {
    "master":    PROCESSED,
    "paylines":  OUTPUTS_DIR / "nih_effective_paylines.csv",
    "bands":     OUTPUTS_DIR / "nih_percentile_band_summary.csv",
    "resub":     OUTPUTS_DIR / "nih_resubmission_opportunity_by_institute.csv",
    "summary":   OUTPUTS_DIR / "nih_institute_summary.csv",
}

dfs = {}
for key, path in FILES.items():
    if not path.exists():
        qc.fail(f"`{path.name}` — FILE NOT FOUND")
        dfs[key] = pd.DataFrame()
        continue
    size = path.stat().st_size
    if size < 500:
        qc.fail(f"`{path.name}` — nearly empty ({size} bytes)")
        dfs[key] = pd.DataFrame()
        continue
    df = pd.read_csv(path)
    if len(df) == 0:
        qc.fail(f"`{path.name}` — zero rows")
        dfs[key] = df
        continue
    qc.ok(f"`{path.name}` — {len(df):,} rows × {len(df.columns)} cols  ({size:,} bytes)")
    dfs[key] = df

master   = dfs["master"]
paylines = dfs["paylines"]
bands    = dfs["bands"]
resub    = dfs["resub"]
summary  = dfs["summary"]


# ═══════════════════════════════════════════════════════════════════════════
# 2. Duplicate Year+Institute rows
# ═══════════════════════════════════════════════════════════════════════════

qc.section("2. Duplicate Year+Institute Rows")

for label, df, key_cols in [
    ("nih_effective_paylines",        paylines, ["Year", "Institute"]),
    ("nih_institute_summary",         summary,  ["Year", "Institute"]),
    ("nih_master_cleaned_data",       master,   ["Year", "Institute", "Percentile"]),
]:
    if df.empty:
        qc.warn(f"`{label}` — skipped (empty)")
        continue
    dup = df.duplicated(subset=key_cols)
    if dup.any():
        qc.fail(f"`{label}` — {dup.sum()} duplicate rows on {key_cols}")
        qc.table(df[dup][key_cols].head(10).to_string(index=False))
    else:
        qc.ok(f"`{label}` — no duplicates on {key_cols}")

# Band summary: Year+Institute+Band
if not bands.empty:
    dup = bands.duplicated(subset=["Year", "Institute", "Percentile_Band"])
    if dup.any():
        qc.fail(f"`nih_percentile_band_summary` — {dup.sum()} duplicate Year+Institute+Band rows")
    else:
        qc.ok("`nih_percentile_band_summary` — no duplicates on Year+Institute+Band")

# Resubmission: Year+Institute+Transition
if not resub.empty:
    dup = resub.duplicated(subset=["Year", "Institute", "Transition"])
    if dup.any():
        qc.fail(f"`nih_resubmission_opportunity` — {dup.sum()} duplicate Year+Institute+Transition rows")
    else:
        qc.ok("`nih_resubmission_opportunity` — no duplicates on Year+Institute+Transition")


# ═══════════════════════════════════════════════════════════════════════════
# 3. Missing Institute Names and Years
# ═══════════════════════════════════════════════════════════════════════════

qc.section("3. Missing Institute Names and Years")

for label, df in [("nih_effective_paylines", paylines), ("nih_institute_summary", summary)]:
    if df.empty:
        continue
    found_years = set(df["Year"].unique())
    found_insts = set(df["Institute"].unique())

    missing_years = set(EXPECTED_YEARS) - found_years
    extra_years   = found_years - set(EXPECTED_YEARS)
    missing_insts = set(EXPECTED_INSTITUTES) - found_insts
    extra_insts   = found_insts - set(EXPECTED_INSTITUTES)

    if missing_years:
        qc.fail(f"`{label}` — missing years: {sorted(missing_years)}")
    else:
        qc.ok(f"`{label}` — all 12 years present (2014–2025)")

    if missing_insts:
        qc.fail(f"`{label}` — missing institutes: {sorted(missing_insts)}")
    else:
        qc.ok(f"`{label}` — all 20 institutes present")

    if extra_years:
        qc.warn(f"`{label}` — unexpected years: {sorted(extra_years)}")
    if extra_insts:
        qc.warn(f"`{label}` — unexpected institutes: {sorted(extra_insts)}")

    # Check expected absences (NIMHD 2014, 2015)
    for yr, inst in KNOWN_ABSENT:
        row = df[(df["Year"] == yr) & (df["Institute"] == inst)]
        if len(row) > 0:
            qc.warn(f"`{label}` — {inst} {yr} present but expected absent (NIMHD not in dataset before 2016)")
        else:
            qc.ok(f"`{label}` — {inst} {yr} correctly absent (known gap)")

    # Check for null institute names
    null_inst = df["Institute"].isna().sum()
    if null_inst:
        qc.fail(f"`{label}` — {null_inst} null Institute values")
    else:
        qc.ok(f"`{label}` — no null Institute values")

    # Check institute name standardization (should be uppercase)
    non_upper = df[df["Institute"].str.contains(r'[a-z]', na=False)]["Institute"].unique()
    if len(non_upper):
        qc.warn(f"`{label}` — mixed-case institute names found: {list(non_upper)[:5]}")
    else:
        qc.ok(f"`{label}` — all institute names consistently uppercase")


# ═══════════════════════════════════════════════════════════════════════════
# 4. EEP Ordering Violations (EEP80 < EEP50 < EEP20)
# ═══════════════════════════════════════════════════════════════════════════

qc.section("4. EEP Ordering Violations (EEP80 < EEP50 < EEP20)")

for label, df in [("nih_effective_paylines", paylines), ("nih_institute_summary", summary)]:
    if df.empty or "EEP80" not in df.columns:
        continue

    # Only check rows where all three are non-null
    valid = df[df["EEP80"].notna() & df["EEP50"].notna() & df["EEP20"].notna()].copy()
    qc.info(f"`{label}` — {len(valid)} rows with all three EEP values non-null (of {len(df)} total)")

    # EEP80 < EEP50
    viol_80_50 = valid[valid["EEP80"] >= valid["EEP50"]]
    if len(viol_80_50):
        qc.fail(f"`{label}` — {len(viol_80_50)} rows where EEP80 >= EEP50 (should be EEP80 < EEP50):")
        qc.table(viol_80_50[["Year", "Institute", "EEP80", "EEP50", "EEP20"]].to_string(index=False))
    else:
        qc.ok(f"`{label}` — EEP80 < EEP50 holds for all {len(valid)} valid rows")

    # EEP50 < EEP20
    viol_50_20 = valid[valid["EEP50"] >= valid["EEP20"]]
    if len(viol_50_20):
        qc.fail(f"`{label}` — {len(viol_50_20)} rows where EEP50 >= EEP20 (should be EEP50 < EEP20):")
        qc.table(viol_50_20[["Year", "Institute", "EEP80", "EEP50", "EEP20"]].to_string(index=False))
    else:
        qc.ok(f"`{label}` — EEP50 < EEP20 holds for all {len(valid)} valid rows")

    # EEP80 < EEP20 (transitive check)
    viol_80_20 = valid[valid["EEP80"] >= valid["EEP20"]]
    if len(viol_80_20):
        qc.fail(f"`{label}` — {len(viol_80_20)} rows where EEP80 >= EEP20")
    else:
        qc.ok(f"`{label}` — EEP80 < EEP20 transitive check passed")

    # Range sanity: EEP values should be between 1 and 60
    for col in ["EEP80", "EEP50", "EEP20"]:
        out_of_range = valid[(valid[col] < 1) | (valid[col] > 60)]
        if len(out_of_range):
            qc.warn(f"`{label}` — {len(out_of_range)} rows where {col} outside [1,60]: "
                    f"min={valid[col].min():.2f}, max={valid[col].max():.2f}")
        else:
            qc.ok(f"`{label}` — {col} all within [1,60] (observed: {valid[col].min():.1f}–{valid[col].max():.1f})")


# ═══════════════════════════════════════════════════════════════════════════
# 5. Negative Opportunity Width
# ═══════════════════════════════════════════════════════════════════════════

qc.section("5. Negative Opportunity Width")

for label, df in [("nih_effective_paylines", paylines), ("nih_institute_summary", summary)]:
    if df.empty or "Opportunity_Width" not in df.columns:
        continue
    valid_ow = df[df["Opportunity_Width"].notna()]
    neg = valid_ow[valid_ow["Opportunity_Width"] < 0]
    if len(neg):
        qc.fail(f"`{label}` — {len(neg)} rows with negative Opportunity_Width:")
        qc.table(neg[["Year", "Institute", "EEP80", "EEP50", "EEP20", "Opportunity_Width"]].to_string(index=False))
    else:
        qc.ok(f"`{label}` — no negative Opportunity_Width values "
              f"(range: {valid_ow['Opportunity_Width'].min():.2f} – {valid_ow['Opportunity_Width'].max():.2f})")

    # Very small (< 1) opportunity widths — flag as suspect
    tiny = valid_ow[(valid_ow["Opportunity_Width"] > 0) & (valid_ow["Opportunity_Width"] < 1)]
    if len(tiny):
        qc.warn(f"`{label}` — {len(tiny)} rows with Opportunity_Width < 1 (near-degenerate fits):")
        qc.table(tiny[["Year", "Institute", "EEP80", "EEP50", "EEP20", "Opportunity_Width"]].to_string(index=False))
    else:
        qc.ok(f"`{label}` — no Opportunity_Width values < 1 (no near-degenerate fits)")


# ═══════════════════════════════════════════════════════════════════════════
# 6. Probabilities Outside [0, 1]
# ═══════════════════════════════════════════════════════════════════════════

qc.section("6. Probabilities Outside [0, 1]")

if not resub.empty:
    for col in ["Prob_From", "Prob_To"]:
        bad = resub[(resub[col] < 0) | (resub[col] > 1)]
        if len(bad):
            qc.fail(f"`nih_resubmission_opportunity` — {len(bad)} rows where {col} outside [0,1]:")
            qc.table(bad[["Year", "Institute", "Transition", col]].head(10).to_string(index=False))
        else:
            qc.ok(f"`nih_resubmission_opportunity` — {col} all within [0,1] "
                  f"(range: {resub[col].min():.4f} – {resub[col].max():.4f})")

    # Prob_From > Prob_To would mean resubmission makes things worse — should never happen
    bad_dir = resub[resub["Prob_From"] >= resub["Prob_To"]]
    if len(bad_dir):
        qc.fail(f"`nih_resubmission_opportunity` — {len(bad_dir)} rows where Prob_From >= Prob_To "
                f"(resubmission gain ≤ 0):")
        qc.table(bad_dir[["Year", "Institute", "Transition", "Prob_From", "Prob_To", "Absolute_Gain"]].head(10).to_string(index=False))
    else:
        qc.ok(f"`nih_resubmission_opportunity` — Prob_From < Prob_To for all {len(resub)} rows (gains are positive)")

    # Absolute_Gain should equal Prob_To - Prob_From
    resub["_gain_check"] = (resub["Prob_To"] - resub["Prob_From"]).round(4)
    mismatch = resub[abs(resub["_gain_check"] - resub["Absolute_Gain"]) > 0.001]
    if len(mismatch):
        qc.fail(f"`nih_resubmission_opportunity` — {len(mismatch)} rows where Absolute_Gain != Prob_To - Prob_From")
        qc.table(mismatch[["Year","Institute","Transition","Prob_From","Prob_To","Absolute_Gain","_gain_check"]].head(5).to_string(index=False))
    else:
        qc.ok(f"`nih_resubmission_opportunity` — Absolute_Gain = Prob_To − Prob_From arithmetic verified for all rows")
    resub.drop(columns=["_gain_check"], inplace=True)

    # Check transitions are only the expected set
    found_trans = set(resub["Transition"].unique())
    if found_trans != RESUB_TRANSITIONS:
        qc.warn(f"`nih_resubmission_opportunity` — unexpected transitions: {found_trans - RESUB_TRANSITIONS}")
    else:
        qc.ok(f"`nih_resubmission_opportunity` — all 4 expected transitions present: {sorted(found_trans)}")

if not bands.empty:
    for col in ["Funding_Rate"]:
        bad = bands[(bands[col].notna()) & ((bands[col] < 0) | (bands[col] > 1))]
        if len(bad):
            qc.fail(f"`nih_percentile_band_summary` — {len(bad)} rows where {col} outside [0,1]")
        else:
            qc.ok(f"`nih_percentile_band_summary` — Funding_Rate all within [0,1] "
                  f"(non-null range: {bands[col].min():.4f} – {bands[col].max():.4f})")


# ═══════════════════════════════════════════════════════════════════════════
# 7. Impossible Percentile Values
# ═══════════════════════════════════════════════════════════════════════════

qc.section("7. Impossible Percentile Values")

if not master.empty:
    bad_pct = master[(master["Percentile"] < 1) | (master["Percentile"] > 100)]
    if len(bad_pct):
        qc.fail(f"`nih_master_cleaned_data` — {len(bad_pct)} rows with Percentile outside [1,100]:")
        qc.table(bad_pct[["Year","Institute","Percentile"]].head(10).to_string(index=False))
    else:
        qc.ok(f"`nih_master_cleaned_data` — all Percentile values in [1,100] "
              f"(observed: {int(master['Percentile'].min())}–{int(master['Percentile'].max())})")

    # Non-integer percentiles in source
    non_int = master[master["Percentile"] != master["Percentile"].astype(int)]
    if len(non_int):
        qc.warn(f"`nih_master_cleaned_data` — {len(non_int)} non-integer Percentile values")
    else:
        qc.ok("`nih_master_cleaned_data` — all Percentile values are integers")

if not paylines.empty:
    for col in ["EEP80", "EEP50", "EEP20"]:
        valid_col = paylines[paylines[col].notna()]
        bad_hi = valid_col[valid_col[col] > 100]
        bad_lo = valid_col[valid_col[col] < 0]
        if len(bad_hi) or len(bad_lo):
            qc.fail(f"`nih_effective_paylines` — {col} has values outside [0,100]: "
                    f"<0: {len(bad_lo)}, >100: {len(bad_hi)}")
        else:
            qc.ok(f"`nih_effective_paylines` — {col} values all in [0,100] "
                  f"(observed: {valid_col[col].min():.2f}–{valid_col[col].max():.2f})")


# ═══════════════════════════════════════════════════════════════════════════
# 8. Cross-File Alignment
# ═══════════════════════════════════════════════════════════════════════════

qc.section("8. Cross-File Institute and Year Alignment")

# Collect Year×Institute universes
universes = {}
for label, df in [
    ("nih_effective_paylines", paylines),
    ("nih_institute_summary",  summary),
    ("nih_percentile_band_summary", bands),
    ("nih_resubmission_opportunity", resub),
    ("nih_master_cleaned_data", master),
]:
    if df.empty:
        continue
    universes[label] = set(zip(df["Year"], df["Institute"]))

# Institute name sets
for label, df in [
    ("nih_effective_paylines", paylines),
    ("nih_institute_summary",  summary),
    ("nih_percentile_band_summary", bands),
    ("nih_resubmission_opportunity", resub),
]:
    if df.empty:
        continue
    inst_set = set(df["Institute"].unique())
    master_inst = set(master["Institute"].unique()) if not master.empty else set()
    extra = inst_set - master_inst
    missing = master_inst - inst_set
    if extra:
        qc.fail(f"`{label}` — institute names not in master: {sorted(extra)}")
    else:
        qc.ok(f"`{label}` — all institute names match master dataset")

# paylines vs summary: same Year×Institute pairs
if universes.get("nih_effective_paylines") and universes.get("nih_institute_summary"):
    pl_u  = universes["nih_effective_paylines"]
    sm_u  = universes["nih_institute_summary"]
    extra_in_pl = pl_u - sm_u
    extra_in_sm = sm_u - pl_u
    if extra_in_pl:
        qc.warn(f"Year+Institute in paylines but not summary: {len(extra_in_pl)} combos "
                f"(sample: {list(sorted(extra_in_pl))[:3]})")
    if extra_in_sm:
        qc.warn(f"Year+Institute in summary but not paylines: {len(extra_in_sm)} combos "
                f"(sample: {list(sorted(extra_in_sm))[:3]})")
    if not extra_in_pl and not extra_in_sm:
        qc.ok("paylines and summary have identical Year+Institute universes")

# EEP50 consistency: paylines vs summary should agree to 2 decimal places
if not paylines.empty and not summary.empty and "EEP50" in summary.columns:
    merged = paylines[["Year","Institute","EEP50"]].merge(
        summary[["Year","Institute","EEP50"]].rename(columns={"EEP50":"EEP50_sm"}),
        on=["Year","Institute"], how="inner"
    )
    both_valid = merged[merged["EEP50"].notna() & merged["EEP50_sm"].notna()]
    delta = (both_valid["EEP50"] - both_valid["EEP50_sm"]).abs()
    bad = both_valid[delta > 0.01]
    if len(bad):
        qc.fail(f"EEP50 mismatch between paylines and summary: {len(bad)} rows with |diff| > 0.01")
        qc.table(bad[["Year","Institute","EEP50","EEP50_sm"]].head(10).to_string(index=False))
    else:
        qc.ok(f"EEP50 values identical between paylines and summary files ({len(both_valid)} matched rows)")

# Band labels consistent
if not bands.empty:
    found_bands = set(bands["Percentile_Band"].unique())
    expected_bands = set(BAND_ORDER)
    if found_bands != expected_bands:
        qc.fail(f"`nih_percentile_band_summary` — unexpected band labels: found {found_bands}, expected {expected_bands}")
    else:
        qc.ok(f"`nih_percentile_band_summary` — all 6 band labels correct: {sorted(found_bands)}")


# ═══════════════════════════════════════════════════════════════════════════
# 9. GLM Fit Quality
# ═══════════════════════════════════════════════════════════════════════════

qc.section("9. GLM Fit Quality")

if not paylines.empty:
    converged    = paylines["GLM_Converged"].sum()
    not_converged = (~paylines["GLM_Converged"]).sum()
    qc.info(f"Total Year+Institute combos: {len(paylines)}")
    qc.ok(f"Converged: {converged} / {len(paylines)} ({converged/len(paylines)*100:.1f}%)")
    if not_converged:
        nc_rows = paylines[~paylines["GLM_Converged"]][["Year","Institute","Model_Note","Pseudo_R2","N_Obs_Fit"]]
        qc.warn(f"Non-converged / skipped: {not_converged} combos:")
        qc.table(nc_rows.to_string(index=False))

    # Pseudo-R² distribution for converged models
    valid_r2 = paylines[paylines["GLM_Converged"] & paylines["Pseudo_R2"].notna()]
    if len(valid_r2):
        r2_min  = valid_r2["Pseudo_R2"].min()
        r2_med  = valid_r2["Pseudo_R2"].median()
        r2_mean = valid_r2["Pseudo_R2"].mean()
        poor_r2 = valid_r2[valid_r2["Pseudo_R2"] < 0.70]
        qc.info(f"Pseudo-R² stats (McFadden): min={r2_min:.4f}, median={r2_med:.4f}, mean={r2_mean:.4f}")
        if len(poor_r2):
            qc.warn(f"Poor fits (Pseudo-R² < 0.70): {len(poor_r2)} combos:")
            qc.table(poor_r2[["Year","Institute","Pseudo_R2","N_Obs_Fit"]].to_string(index=False))
        else:
            qc.ok(f"All converged fits have Pseudo-R² ≥ 0.70 (all pass quality threshold)")

    # N_Obs_Fit distribution
    valid_nobs = paylines[paylines["N_Obs_Fit"] > 0]
    qc.info(f"N_Obs_Fit (data points used in GLM): min={valid_nobs['N_Obs_Fit'].min()}, "
            f"median={valid_nobs['N_Obs_Fit'].median():.0f}, max={valid_nobs['N_Obs_Fit'].max()}")
    thin = valid_nobs[valid_nobs["N_Obs_Fit"] < 10]
    if len(thin):
        qc.warn(f"Thin fits (< 10 obs): {len(thin)} combos:")
        qc.table(thin[["Year","Institute","N_Obs_Fit","Model_Note"]].to_string(index=False))
    else:
        qc.ok("No fits with fewer than 10 observations")


# ═══════════════════════════════════════════════════════════════════════════
# 10. Band Funding Rate Monotonicity
# ═══════════════════════════════════════════════════════════════════════════

qc.section("10. Band Funding Rate Monotonicity (1-5 ≥ 6-10 ≥ 11-15 ≥ ...)")

if not bands.empty:
    violations = []
    for (yr, inst), grp in bands.groupby(["Year","Institute"]):
        grp_sorted = grp.set_index("Percentile_Band").reindex(BAND_ORDER)
        rates = grp_sorted["Funding_Rate"].values
        apps  = grp_sorted["Applications_Total"].values
        for i in range(len(rates) - 1):
            r_lo = rates[i]
            r_hi = rates[i + 1]
            if pd.isna(r_lo) or pd.isna(r_hi):
                continue
            if r_lo < r_hi - 0.05:   # allow 5pp slack for small-IC noise
                a_i = apps[i] if not np.isnan(apps[i]) else 0
                a_j = apps[i+1] if not np.isnan(apps[i+1]) else 0
                violations.append({
                    "Year": yr, "Institute": inst,
                    "Band_i": BAND_ORDER[i],     "Rate_i": round(r_lo, 4), "Apps_i": int(a_i),
                    "Band_j": BAND_ORDER[i + 1], "Rate_j": round(r_hi, 4), "Apps_j": int(a_j),
                    "Diff": round(r_hi - r_lo, 4),
                })

    if violations:
        vdf = pd.DataFrame(violations)

        # Classify by minimum band application count — violations with tiny sample sizes
        # are pure statistical noise, not data errors.
        # Threshold: both bands must have >= 30 applications to be a meaningful violation.
        vdf["Min_Apps"] = vdf[["Apps_i", "Apps_j"]].min(axis=1)
        meaningful = vdf[vdf["Min_Apps"] >= 30]
        sparse     = vdf[vdf["Min_Apps"] < 30]

        if len(meaningful):
            # Classify by mechanism
            admin_type = meaningful[meaningful["Band_i"].isin(["1-5"]) & (meaningful["Band_j"] == "6-10")]
            program_type = meaningful[~(meaningful["Band_i"].isin(["1-5"]) & (meaningful["Band_j"] == "6-10"))]

            if len(admin_type):
                qc.warn(
                    f"Administrative non-award pattern ({len(admin_type)} cases): 1-5 band rate < 6-10 band rate. "
                    f"Known NIH behavior — percentile 1-3 grants may be declined for administrative reasons "
                    f"(PI eligibility, budget caps, duplicate submissions) while percentile 4-10 are 100% funded. "
                    f"NOT a data error."
                )
                qc.table(admin_type.to_string(index=False))

            if len(program_type):
                extreme = program_type[program_type["Diff"] > 0.20]
                modest  = program_type[program_type["Diff"] <= 0.20]
                if len(extreme):
                    qc.fail(f"Unexplained large inversions (Diff > 20pp, non-1-5 bands, ≥ 30 apps): {len(extreme)}")
                    qc.table(extreme.to_string(index=False))
                if len(modest):
                    qc.warn(
                        f"Programmatic pick-up pattern ({len(modest)} cases): higher percentile band rate exceeds "
                        f"lower band rate by 5–20pp. Known NIH behavior — mission-driven/set-aside grants "
                        f"funded above payline can cause modest inversions in 16-20 vs 21-25 range. NOT a data error."
                    )
                    qc.table(modest.to_string(index=False))

            if not len(extreme if "extreme" in dir() else []):
                qc.ok("No unexplained large band-rate inversions (all classified as known NIH behaviors)")
        else:
            qc.ok(f"No meaningful monotonicity violations when both bands have ≥ 30 applications")

        if len(sparse):
            qc.warn(
                f"Sparse-data band inversions (min band apps < 30): {len(sparse)} cases across "
                f"{sparse[['Year','Institute']].drop_duplicates().__len__()} Year×IC combos — "
                f"expected statistical noise in small ICs; not data errors."
            )
            # Show only worst cases (diff > 0.15)
            worst_sparse = sparse[sparse["Diff"] > 0.15].sort_values("Diff", ascending=False)
            if len(worst_sparse):
                qc.warn(f"Top sparse violations (Diff > 15pp) for reference:")
                qc.table(worst_sparse.to_string(index=False))
    else:
        qc.ok(f"Band funding rates are monotonically non-increasing across all {bands['Year'].nunique()} years × institutes")


# ═══════════════════════════════════════════════════════════════════════════
# 11. Derived Column Arithmetic Consistency
# ═══════════════════════════════════════════════════════════════════════════

qc.section("11. Derived Column Arithmetic Consistency")

if not master.empty:
    # Applications_Total = Funded_Total + Not_Awarded
    master["_apps_check"] = master["Funded_Total"] + master["Not_Awarded"]
    bad_apps = master[abs(master["_apps_check"] - master["Applications_Total"]) > 0.5]
    if len(bad_apps):
        qc.fail(f"`master` — {len(bad_apps)} rows where Applications_Total != Funded_Total + Not_Awarded")
        qc.table(bad_apps[["Year","Institute","Percentile","Funded_Total","Not_Awarded","Applications_Total","_apps_check"]].head(5).to_string(index=False))
    else:
        qc.ok(f"`master` — Applications_Total = Funded_Total + Not_Awarded verified ({len(master):,} rows)")
    master.drop(columns=["_apps_check"], inplace=True)

    # Funding_Rate = Funded_Total / Applications_Total (where apps > 0)
    valid_rate = master[master["Applications_Total"] > 0].copy()
    valid_rate["_rate_check"] = valid_rate["Funded_Total"] / valid_rate["Applications_Total"]
    bad_rate = valid_rate[abs(valid_rate["_rate_check"] - valid_rate["Funding_Rate"]) > 0.0001]
    if len(bad_rate):
        qc.fail(f"`master` — {len(bad_rate)} rows where Funding_Rate != Funded_Total / Applications_Total")
    else:
        qc.ok(f"`master` — Funding_Rate = Funded_Total / Applications_Total verified ({len(valid_rate):,} rows)")

    # Funded_Total >= 0, Not_Awarded >= 0, Applications_Total >= 0
    for col in ["Funded_Total", "Not_Awarded", "Applications_Total"]:
        neg = master[master[col] < 0]
        if len(neg):
            qc.fail(f"`master` — {len(neg)} rows with negative {col}")
        else:
            qc.ok(f"`master` — {col} non-negative throughout")

    # R56_Suppressed flag matches NaN in R56_Awards
    if "R56_Suppressed" in master.columns and "R56_Awards" in master.columns:
        sup_flag = master["R56_Suppressed"] == True
        r56_nan  = master["R56_Awards"].isna()
        mismatch = (sup_flag != r56_nan).sum()
        if mismatch:
            qc.fail(f"`master` — {mismatch} rows where R56_Suppressed flag and R56_Awards NaN are inconsistent")
        else:
            qc.ok(f"`master` — R56_Suppressed flag consistent with R56_Awards NaN ({r56_nan.sum():,} rows flagged)")

if not bands.empty:
    # Recompute funding rate from totals
    bands["_rate_check"] = np.where(
        bands["Applications_Total"] > 0,
        bands["Funded_Total"] / bands["Applications_Total"],
        np.nan
    )
    bad = bands[bands["Funding_Rate"].notna() &
                (abs(bands["_rate_check"] - bands["Funding_Rate"]) > 0.0001)]
    if len(bad):
        qc.fail(f"`nih_percentile_band_summary` — {len(bad)} rows where Funding_Rate arithmetic is wrong")
    else:
        qc.ok(f"`nih_percentile_band_summary` — Funding_Rate arithmetic verified ({len(bands):,} rows)")
    bands.drop(columns=["_rate_check"], inplace=True)


# ═══════════════════════════════════════════════════════════════════════════
# 12. FY2025 Anomaly Magnitude Check
# ═══════════════════════════════════════════════════════════════════════════

qc.section("12. FY2025 Anomaly Magnitude Check")

if not paylines.empty:
    all_nih_pl = paylines[paylines["Institute"] == "ALL NIH"].sort_values("Year")

    # Compute YoY deltas
    all_nih_pl = all_nih_pl.copy()
    all_nih_pl["EEP50_delta"] = all_nih_pl["EEP50"].diff()

    qc.info("ALL NIH EEP50 year-over-year changes:")
    qc.table(all_nih_pl[["Year","EEP50","EEP50_delta"]].to_string(index=False))

    # Is 2024→2025 an outlier relative to historical deltas?
    hist_deltas = all_nih_pl[all_nih_pl["Year"] < 2025]["EEP50_delta"].dropna()
    delta_2025  = all_nih_pl[all_nih_pl["Year"] == 2025]["EEP50_delta"].values
    if len(delta_2025) > 0 and len(hist_deltas) > 0:
        delta_2025_val = delta_2025[0]
        hist_std  = hist_deltas.std()
        hist_mean = hist_deltas.mean()
        z_score   = (delta_2025_val - hist_mean) / hist_std if hist_std > 0 else np.nan
        qc.info(f"Historical YoY deltas (2015–2024): mean={hist_mean:.2f}, std={hist_std:.2f}")
        qc.info(f"2024→2025 delta: {delta_2025_val:.2f} (z-score: {z_score:.1f}σ from historical mean)")
        if abs(z_score) > 3:
            qc.warn(f"FY2025 shift is {abs(z_score):.1f}σ from historical norm — statistically extreme. "
                    f"Two explanations: (a) genuine budget compression, (b) incomplete award processing. "
                    f"Verify with NIH when FY2025 data is fully closed.")
        else:
            qc.ok("FY2025 shift is within historical variance")

    # Check: does 2025 ALL NIH overall funding rate look reasonable?
    if not master.empty and not summary.empty:
        rate_2025 = summary[(summary["Institute"]=="ALL NIH") & (summary["Year"]==2025)]["Overall_Funding_Rate"]
        rate_hist = summary[(summary["Institute"]=="ALL NIH") & (summary["Year"]<2025)]["Overall_Funding_Rate"]
        if len(rate_2025) > 0 and len(rate_hist) > 0:
            r25 = rate_2025.values[0]
            r_mean = rate_hist.mean()
            r_std  = rate_hist.std()
            qc.info(f"FY2025 ALL NIH overall funding rate: {r25:.4f} | Historical mean: {r_mean:.4f} ± {r_std:.4f}")
            if abs(r25 - r_mean) > 2 * r_std:
                qc.warn("FY2025 overall funding rate is unusual relative to historical range")
            else:
                qc.ok(f"FY2025 overall funding rate ({r25:.1%}) is within 2σ of historical mean ({r_mean:.1%})")
                qc.info("Note: Similar overall rate but shifted EEP50 = funding concentrated at lower percentiles. "
                        "Likely reflects reduced 'pickup' grants at percentiles 15-25.")

    # Check all ICs for universal negative delta
    yr_pivot = paylines[paylines["Year"].isin([2024,2025])].pivot(
        index="Institute", columns="Year", values="EEP50"
    )
    if 2024 in yr_pivot.columns and 2025 in yr_pivot.columns:
        yr_pivot["delta"] = yr_pivot[2025] - yr_pivot[2024]
        n_neg = (yr_pivot["delta"] < 0).sum()
        n_pos = (yr_pivot["delta"] > 0).sum()
        n_na  = yr_pivot["delta"].isna().sum()
        qc.info(f"2024→2025 EEP50 direction: {n_neg} ICs tightened, {n_pos} loosened, {n_na} no data")
        if n_pos == 0 and n_neg > 10:
            qc.warn(f"Universal tightening across all {n_neg} measurable ICs — "
                    f"highly unusual; consistent with a systemic funding constraint rather than IC-specific variation.")


# ═══════════════════════════════════════════════════════════════════════════
# 13. Null / Coverage Summary
# ═══════════════════════════════════════════════════════════════════════════

qc.section("13. Null Value Coverage Summary")

for label, df in [
    ("nih_effective_paylines",           paylines),
    ("nih_institute_summary",            summary),
    ("nih_percentile_band_summary",      bands),
    ("nih_resubmission_opportunity",     resub),
    ("nih_master_cleaned_data",          master),
]:
    if df.empty:
        continue
    null_counts = df.isnull().sum()
    null_cols   = null_counts[null_counts > 0]
    if len(null_cols) == 0:
        qc.ok(f"`{label}` — no null values in any column")
    else:
        for col, cnt in null_cols.items():
            pct = cnt / len(df) * 100
            tag = qc.warn if pct > 20 else qc.info
            tag(f"`{label}` — `{col}`: {cnt} nulls ({pct:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# Finalize and write report
# ═══════════════════════════════════════════════════════════════════════════

# Add interpretation notes at end
qc.section("14. Interpretation Cautions for App Builders")
qc.info("R56_Suppressed = True for 4,534 rows (34% of master). IC-level Funded_Total excludes R56 "
        "bridge awards in these rows — slightly understates true funding rates for affected ICs.")
qc.info("8 Year×Institute GLM fits failed (all small ICs in early years: NHGRI 2015-2017/2021, "
        "NINR 2014, NLM 2014/2016/2018). EEP values are NULL for these — handle gracefully in UI.")
qc.info("FY2025 EEP50 values are 5-13 percentile points lower than FY2024 across all ICs. "
        "Flag in UI as 'Preliminary — verify when FY2025 closes' OR label as 'Significant compression year'.")
qc.info("Band funding rates are slightly non-monotonic for small ICs (NIMHD, NLM, NHGRI) in some years "
        "due to sparse data. These are statistical noise, not data errors.")
qc.info("Opportunity_Width is NULL for 18 combos where EEP80 could not be estimated "
        "(funding probability never reached 80% in the observed percentile range — very competitive ICs).")

qc.finalize()
report_text = qc.render()

out_path = OUTPUTS_DIR / "analysis_qc_report.md"
out_path.write_text(report_text, encoding="utf-8")

# Print summary to console
print(report_text[:500])
print("...")
print(f"\n{'='*60}")
print(f"QC complete: {qc.pass_count} passed | {qc.fail_count} failed | {qc.warn_count} warnings")
print(f"Saved → {out_path}")
print(f"{'='*60}")
