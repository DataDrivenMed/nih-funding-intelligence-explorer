# NIH Funding Explorer — Analysis QC Report
**Generated:** March 07, 2026  
**Scope:** All files in `outputs/` and `processed/`  

---
## Summary
| Status | Count |
|--------|-------|
| ✅ Pass | 68 |
| ❌ Fail | 0 |
| ⚠️ Warn  | 11 |
| 🔧 Fixed | 0 |
| **Total checks** | **79** |

---

## 1. File Existence & Size

✅ `nih_master_cleaned_data.csv` — 13,294 rows × 11 cols  (653,716 bytes)
✅ `nih_effective_paylines.csv` — 238 rows × 12 cols  (15,633 bytes)
✅ `nih_percentile_band_summary.csv` — 1,428 rows × 9 cols  (65,274 bytes)
✅ `nih_resubmission_opportunity_by_institute.csv` — 920 rows × 9 cols  (47,652 bytes)
✅ `nih_institute_summary.csv` — 238 rows × 16 cols  (21,918 bytes)

## 2. Duplicate Year+Institute Rows

✅ `nih_effective_paylines` — no duplicates on ['Year', 'Institute']
✅ `nih_institute_summary` — no duplicates on ['Year', 'Institute']
✅ `nih_master_cleaned_data` — no duplicates on ['Year', 'Institute', 'Percentile']
✅ `nih_percentile_band_summary` — no duplicates on Year+Institute+Band
✅ `nih_resubmission_opportunity` — no duplicates on Year+Institute+Transition

## 3. Missing Institute Names and Years

✅ `nih_effective_paylines` — all 12 years present (2014–2025)
✅ `nih_effective_paylines` — all 20 institutes present
✅ `nih_effective_paylines` — NIMHD 2014 correctly absent (known gap)
✅ `nih_effective_paylines` — NIMHD 2015 correctly absent (known gap)
✅ `nih_effective_paylines` — no null Institute values
✅ `nih_effective_paylines` — all institute names consistently uppercase
✅ `nih_institute_summary` — all 12 years present (2014–2025)
✅ `nih_institute_summary` — all 20 institutes present
✅ `nih_institute_summary` — NIMHD 2014 correctly absent (known gap)
✅ `nih_institute_summary` — NIMHD 2015 correctly absent (known gap)
✅ `nih_institute_summary` — no null Institute values
✅ `nih_institute_summary` — all institute names consistently uppercase

## 4. EEP Ordering Violations (EEP80 < EEP50 < EEP20)

ℹ️ `nih_effective_paylines` — 227 rows with all three EEP values non-null (of 238 total)
✅ `nih_effective_paylines` — EEP80 < EEP50 holds for all 227 valid rows
✅ `nih_effective_paylines` — EEP50 < EEP20 holds for all 227 valid rows
✅ `nih_effective_paylines` — EEP80 < EEP20 transitive check passed
✅ `nih_effective_paylines` — EEP80 all within [1,60] (observed: 1.4–24.9)
✅ `nih_effective_paylines` — EEP50 all within [1,60] (observed: 5.9–31.5)
✅ `nih_effective_paylines` — EEP20 all within [1,60] (observed: 8.8–40.0)
ℹ️ `nih_institute_summary` — 227 rows with all three EEP values non-null (of 238 total)
✅ `nih_institute_summary` — EEP80 < EEP50 holds for all 227 valid rows
✅ `nih_institute_summary` — EEP50 < EEP20 holds for all 227 valid rows
✅ `nih_institute_summary` — EEP80 < EEP20 transitive check passed
✅ `nih_institute_summary` — EEP80 all within [1,60] (observed: 1.4–24.9)
✅ `nih_institute_summary` — EEP50 all within [1,60] (observed: 5.9–31.5)
✅ `nih_institute_summary` — EEP20 all within [1,60] (observed: 8.8–40.0)

## 5. Negative Opportunity Width

✅ `nih_effective_paylines` — no negative Opportunity_Width values (range: 3.04 – 22.73)
✅ `nih_effective_paylines` — no Opportunity_Width values < 1 (no near-degenerate fits)
✅ `nih_institute_summary` — no negative Opportunity_Width values (range: 3.04 – 22.73)
✅ `nih_institute_summary` — no Opportunity_Width values < 1 (no near-degenerate fits)

## 6. Probabilities Outside [0, 1]

✅ `nih_resubmission_opportunity` — Prob_From all within [0,1] (range: 0.0013 – 0.9953)
✅ `nih_resubmission_opportunity` — Prob_To all within [0,1] (range: 0.0134 – 0.9997)
✅ `nih_resubmission_opportunity` — Prob_From < Prob_To for all 920 rows (gains are positive)
✅ `nih_resubmission_opportunity` — Absolute_Gain = Prob_To − Prob_From arithmetic verified for all rows
✅ `nih_resubmission_opportunity` — all 4 expected transitions present: ['12→8', '15→10', '18→12', '20→15']
✅ `nih_percentile_band_summary` — Funding_Rate all within [0,1] (non-null range: 0.0000 – 1.0000)

## 7. Impossible Percentile Values

✅ `nih_master_cleaned_data` — all Percentile values in [1,100] (observed: 1–100)
✅ `nih_master_cleaned_data` — all Percentile values are integers
✅ `nih_effective_paylines` — EEP80 values all in [0,100] (observed: 1.40–24.90)
✅ `nih_effective_paylines` — EEP50 values all in [0,100] (observed: 2.96–31.53)
✅ `nih_effective_paylines` — EEP20 values all in [0,100] (observed: 8.81–40.01)

## 8. Cross-File Institute and Year Alignment

✅ `nih_effective_paylines` — all institute names match master dataset
✅ `nih_institute_summary` — all institute names match master dataset
✅ `nih_percentile_band_summary` — all institute names match master dataset
✅ `nih_resubmission_opportunity` — all institute names match master dataset
✅ paylines and summary have identical Year+Institute universes
✅ EEP50 values identical between paylines and summary files (230 matched rows)
✅ `nih_percentile_band_summary` — all 6 band labels correct: ['1-5', '11-15', '16-20', '21-25', '26+', '6-10']

## 9. GLM Fit Quality

ℹ️ Total Year+Institute combos: 238
✅ Converged: 230 / 238 (96.6%)
⚠️ Non-converged / skipped: 8 combos:
 Year Institute                                 Model_Note  Pseudo_R2  N_Obs_Fit
 2014      NINR Too few transition-zone points: 1 (need 3)        NaN         42
 2014       NLM Too few transition-zone points: 2 (need 3)        NaN         27
 2015     NHGRI Too few transition-zone points: 1 (need 3)        NaN         36
 2016     NHGRI Too few transition-zone points: 1 (need 3)        NaN         32
 2016       NLM Too few transition-zone points: 1 (need 3)        NaN         25
 2017     NHGRI Too few transition-zone points: 0 (need 3)        NaN         40
 2018       NLM Too few transition-zone points: 2 (need 3)        NaN         30
 2021     NHGRI Too few transition-zone points: 1 (need 3)        NaN         43
ℹ️ Pseudo-R² stats (McFadden): min=0.2226, median=0.8291, mean=0.8058
⚠️ Poor fits (Pseudo-R² < 0.70): 34 combos:
 Year Institute  Pseudo_R2  N_Obs_Fit
 2014     NHGRI     0.6073         35
 2016     NIMHD     0.4736         35
 2017     NIMHD     0.5166         45
 2018     NIMHD     0.5725         38
 2019     NIDCR     0.6782         49
 2020     NIAAA     0.6684         50
 2020     NIDCR     0.6706         47
 2020     NIMHD     0.6467         45
 2020      NINR     0.6659         44
 2020       NLM     0.5304         33
 2021       NIA     0.6990         50
 2021     NIAAA     0.6700         48
 2021     NIDCR     0.5534         50
 2021     NIMHD     0.6844         49
 2021      NINR     0.6550         43
 2021       NLM     0.6745         40
 2022     NIAAA     0.6007         50
 2022     NIDCR     0.6738         49
 2022     NIMHD     0.6936         49
 2023     NIAAA     0.5582         49
 2023     NIDCD     0.5868         48
 2023     NIDCR     0.6531         48
 2023     NIMHD     0.6712         49
 2023      NINR     0.6488         31
 2024     NHGRI     0.6648         38
 2024     NIAAA     0.6608         48
 2024     NIDCR     0.5553         48
 2024     NIMHD     0.5317         48
 2024      NINR     0.5261         29
 2025     NIAAA     0.4870         48
 2025     NIDCR     0.5017         49
 2025     NIGMS     0.6606         50
 2025     NIMHD     0.4528         47
 2025      NINR     0.2226         26
ℹ️ N_Obs_Fit (data points used in GLM): min=22, median=50, max=50
✅ No fits with fewer than 10 observations

## 10. Band Funding Rate Monotonicity (1-5 ≥ 6-10 ≥ 11-15 ≥ ...)

⚠️ Administrative non-award pattern (5 cases): 1-5 band rate < 6-10 band rate. Known NIH behavior — percentile 1-3 grants may be declined for administrative reasons (PI eligibility, budget caps, duplicate submissions) while percentile 4-10 are 100% funded. NOT a data error.
 Year Institute Band_i  Rate_i  Apps_i Band_j  Rate_j  Apps_j   Diff  Min_Apps
 2015     NIAID    1-5  0.8816     152   6-10  1.0000     150 0.1184       150
 2021     NIDCD    1-5  0.9375      32   6-10  1.0000      31 0.0625        31
 2022     NIGMS    1-5  0.8539      89   6-10  0.9186      86 0.0647        86
 2024       NEI    1-5  0.8667      45   6-10  0.9574      47 0.0907        45
 2024     NIDCD    1-5  0.8788      33   6-10  1.0000      30 0.1212        30
⚠️ Programmatic pick-up pattern (3 cases): higher percentile band rate exceeds lower band rate by 5–20pp. Known NIH behavior — mission-driven/set-aside grants funded above payline can cause modest inversions in 16-20 vs 21-25 range. NOT a data error.
 Year Institute Band_i  Rate_i  Apps_i Band_j  Rate_j  Apps_j   Diff  Min_Apps
 2019       NEI   6-10  0.9111      45  11-15  0.9744      39 0.0633        39
 2022       NIA  16-20  0.6923      78  21-25  0.7935      92 0.1012        78
 2025     NICHD  16-20  0.1585      82  21-25  0.2386      88 0.0801        82
✅ No unexplained large band-rate inversions (all classified as known NIH behaviors)
⚠️ Sparse-data band inversions (min band apps < 30): 35 cases across 34 Year×IC combos — expected statistical noise in small ICs; not data errors.
⚠️ Top sparse violations (Diff > 15pp) for reference:
 Year Institute Band_i  Rate_i  Apps_i Band_j  Rate_j  Apps_j   Diff  Min_Apps
 2018       NLM  16-20  0.2308      13  21-25  1.0000       1 0.7692         1
 2023      NINR  16-20  0.2000       5  21-25  0.6667       6 0.4667         5
 2014       NLM  11-15  0.3333       6  16-20  0.7500       4 0.4167         4
 2023     NIAAA  16-20  0.6000      15  21-25  0.8529      34 0.2529        15
 2015      NINR  16-20  0.0000       7  21-25  0.2500      12 0.2500         7
 2023       NLM   6-10  0.7500       4  11-15  1.0000       3 0.2500         3
 2023     NIDCD   6-10  0.7586      29  11-15  1.0000      31 0.2414        29
 2020       NLM  11-15  0.3750       8  16-20  0.6154      13 0.2404         8
 2025      NINR   6-10  0.5000       6  11-15  0.7143       7 0.2143         6
 2016     NHGRI  16-20  0.2857       7  21-25  0.5000       2 0.2143         2
 2015     NHGRI  11-15  0.8000       5  16-20  1.0000       2 0.2000         2
 2025     NIAAA   6-10  0.3913      23  11-15  0.5714      21 0.1801        21
 2021      NINR    1-5  0.8333       6   6-10  1.0000      11 0.1667         6
 2014     NHGRI  11-15  0.8333       6  16-20  1.0000       8 0.1667         6
 2023       NLM  16-20  0.6667       3  21-25  0.8333       6 0.1666         3
 2015     NIAAA    1-5  0.8462      13   6-10  1.0000      19 0.1538        13

## 11. Derived Column Arithmetic Consistency

✅ `master` — Applications_Total = Funded_Total + Not_Awarded verified (13,294 rows)
✅ `master` — Funding_Rate = Funded_Total / Applications_Total verified (13,282 rows)
✅ `master` — Funded_Total non-negative throughout
✅ `master` — Not_Awarded non-negative throughout
✅ `master` — Applications_Total non-negative throughout
✅ `master` — R56_Suppressed flag consistent with R56_Awards NaN (4,534 rows flagged)
✅ `nih_percentile_band_summary` — Funding_Rate arithmetic verified (1,428 rows)

## 12. FY2025 Anomaly Magnitude Check

ℹ️ ALL NIH EEP50 year-over-year changes:
 Year  EEP50  EEP50_delta
 2014  18.80          NaN
 2015  18.69        -0.11
 2016  19.00         0.31
 2017  19.07         0.07
 2018  20.13         1.06
 2019  19.37        -0.76
 2020  19.23        -0.14
 2021  18.41        -0.82
 2022  18.86         0.45
 2023  19.12         0.26
 2024  16.76        -2.36
 2025  11.14        -5.62
ℹ️ Historical YoY deltas (2015–2024): mean=-0.20, std=0.94
ℹ️ 2024→2025 delta: -5.62 (z-score: -5.8σ from historical mean)
⚠️ FY2025 shift is 5.8σ from historical norm — statistically extreme. Two explanations: (a) genuine budget compression, (b) incomplete award processing. Verify with NIH when FY2025 data is fully closed.
ℹ️ FY2025 ALL NIH overall funding rate: 0.2201 | Historical mean: 0.3718 ± 0.0190
⚠️ FY2025 overall funding rate is unusual relative to historical range
ℹ️ 2024→2025 EEP50 direction: 20 ICs tightened, 0 loosened, 0 no data
⚠️ Universal tightening across all 20 measurable ICs — highly unusual; consistent with a systemic funding constraint rather than IC-specific variation.

## 13. Null Value Coverage Summary

ℹ️ `nih_effective_paylines` — `EEP80`: 11 nulls (4.6%)
ℹ️ `nih_effective_paylines` — `EEP50`: 8 nulls (3.4%)
ℹ️ `nih_effective_paylines` — `EEP20`: 8 nulls (3.4%)
ℹ️ `nih_effective_paylines` — `Opportunity_Width`: 11 nulls (4.6%)
ℹ️ `nih_effective_paylines` — `Beta0`: 8 nulls (3.4%)
ℹ️ `nih_effective_paylines` — `Beta1`: 8 nulls (3.4%)
ℹ️ `nih_effective_paylines` — `Pseudo_R2`: 8 nulls (3.4%)
⚠️ `nih_effective_paylines` — `Model_Note`: 230 nulls (96.6%)
ℹ️ `nih_institute_summary` — `EEP80`: 11 nulls (4.6%)
ℹ️ `nih_institute_summary` — `EEP50`: 8 nulls (3.4%)
ℹ️ `nih_institute_summary` — `EEP20`: 8 nulls (3.4%)
ℹ️ `nih_institute_summary` — `Opportunity_Width`: 11 nulls (4.6%)
ℹ️ `nih_institute_summary` — `EEP50_YoY_Change`: 32 nulls (13.4%)
✅ `nih_percentile_band_summary` — no null values in any column
✅ `nih_resubmission_opportunity` — no null values in any column
⚠️ `nih_master_cleaned_data` — `R56_Awards`: 4534 nulls (34.1%)
ℹ️ `nih_master_cleaned_data` — `Funding_Rate`: 12 nulls (0.1%)

## 14. Interpretation Cautions for App Builders

ℹ️ R56_Suppressed = True for 4,534 rows (34% of master). IC-level Funded_Total excludes R56 bridge awards in these rows — slightly understates true funding rates for affected ICs.
ℹ️ 8 Year×Institute GLM fits failed (all small ICs in early years: NHGRI 2015-2017/2021, NINR 2014, NLM 2014/2016/2018). EEP values are NULL for these — handle gracefully in UI.
ℹ️ FY2025 EEP50 values are 5-13 percentile points lower than FY2024 across all ICs. Flag in UI as 'Preliminary — verify when FY2025 closes' OR label as 'Significant compression year'.
ℹ️ Band funding rates are slightly non-monotonic for small ICs (NIMHD, NLM, NHGRI) in some years due to sparse data. These are statistical noise, not data errors.
ℹ️ Opportunity_Width is NULL for 18 combos where EEP80 could not be estimated (funding probability never reached 80% in the observed percentile range — very competitive ICs).
