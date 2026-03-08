import type { Payline, BandSummary, ResubmissionOpp } from './types'

export interface InsightResult {
  dataInsight: string
  interpretation: string
  leadershipImplication: string
  caution: string
}

// ─── Payline Explorer ────────────────────────────────────────────────────────

export function generatePaylineInsight(
  institute: string,
  year: number,
  plRow: Payline | undefined,
): InsightResult {
  if (!plRow || plRow.EEP50 === null) {
    return {
      dataInsight: `Insufficient model data for ${institute} FY${year}. The GLM could not be reliably fit, typically due to sparse application data.`,
      interpretation: 'Sparse data prevents reliable EEP estimation. This commonly occurs for smaller institutes (e.g., NHGRI, NINR, NLM) in earlier years.',
      leadershipImplication: `Avoid basing strategic decisions on this ${institute} FY${year} combination. Use ALL NIH as a reference benchmark for this fiscal year.`,
      caution: year === 2025 ? 'FY2025 data is preliminary (extracted March 2026). Confirm before official reporting.' : '',
    }
  }

  const eep50 = plRow.EEP50.toFixed(1)
  const eep80 = plRow.EEP80 !== null ? plRow.EEP80.toFixed(1) : 'N/A'
  const eep20 = plRow.EEP20 !== null ? plRow.EEP20.toFixed(1) : 'N/A'
  const width = plRow.Opportunity_Width !== null ? plRow.Opportunity_Width.toFixed(1) : 'N/A'
  const r2    = plRow.Pseudo_R2 !== null ? plRow.Pseudo_R2.toFixed(3) : 'N/A'

  const isAlert  = plRow.EEP50 < 12
  const isHigh   = plRow.EEP50 > 18
  const isBroad  = plRow.Opportunity_Width !== null && plRow.Opportunity_Width > 12
  const isNarrow = plRow.Opportunity_Width !== null && plRow.Opportunity_Width < 6
  const widthDesc = isBroad ? 'broad' : isNarrow ? 'narrow (steep cliff)' : 'moderate'

  const dataInsight =
    `${institute} FY${year}: EEP50 = ${eep50} (50% funding probability threshold). ` +
    `Opportunity window: ${eep80}–${eep20} · ${widthDesc} · ${width} pp wide. ` +
    `Model fit: R² = ${r2} from ${plRow.N_Obs_Fit} observed percentile bins.`

  let interpretation = ''
  if (isAlert) {
    interpretation =
      `An EEP50 of ${eep50} signals a highly compressed, highly selective funding environment at ${institute} in FY${year}. ` +
      `Only applications scoring at or below ~${eep80} carry high funding confidence (≥80% probability). `
  } else if (isHigh) {
    interpretation =
      `An EEP50 of ${eep50} is above the historical ALL-NIH average (~18.9), indicating a relatively more permissive environment at ${institute} in FY${year}. ` +
      `Applications scoring below ${eep80} have at least 80% probability of funding. `
  } else {
    interpretation =
      `An EEP50 of ${eep50} is near the historical ALL-NIH average (~18.9), reflecting a moderately competitive environment at ${institute} in FY${year}. `
  }

  if (isBroad) {
    interpretation +=
      `The ${width} pp opportunity window indicates gradual probability decay — this broader gray zone means applications near ${eep20} still retain meaningful probability (~20%).`
  } else if (isNarrow) {
    interpretation +=
      `The narrow ${width} pp window indicates a steep funding cliff — small score differences near the payline produce large changes in funding probability.`
  } else {
    interpretation +=
      `The ${width} pp opportunity window reflects moderate gradient — scores in the ${eep80}–${eep20} range face meaningful uncertainty and warrant careful resubmission assessment.`
  }

  let leadershipImplication = ''
  if (isAlert) {
    leadershipImplication =
      `Advise investigators that ${institute} FY${year} is unusually competitive. ` +
      `Applications should target scores well below ${eep50} to achieve reliable funding. ` +
      `Even the outer edge (${eep20}) carries only 20% probability, so resubmission strategy must be realistic.`
  } else if (isBroad) {
    leadershipImplication =
      `The broad opportunity window at ${institute} FY${year} supports a less conservative resubmission posture. ` +
      `Applications scoring up to ~${eep20} retain meaningful probability (~20%) and may warrant resubmission investment.`
  } else if (isNarrow) {
    leadershipImplication =
      `The steep payline at ${institute} FY${year} demands score precision. ` +
      `Target scores at or below ${eep80} for high-confidence funding. ` +
      `Applications scoring above ${eep50} face rapidly declining odds.`
  } else {
    leadershipImplication =
      `${institute} FY${year} reflects a moderate funding environment. ` +
      `Applications in the ${eep80}–${eep50} range carry good probability; those between ${eep50} and ${eep20} ` +
      `should be evaluated for resubmission based on scientific merit and portfolio priorities.`
  }

  const caution = year === 2025
    ? 'FY2025 data is preliminary (extracted March 2026). Confirm before official reporting.'
    : ''

  return { dataInsight, interpretation, leadershipImplication, caution }
}

// ─── Funding Landscape ───────────────────────────────────────────────────────

export function generateFundingLandscapeInsight(
  institute: string,
  selectedYears: number[],
  bandData: BandSummary[],
): InsightResult {
  const sortedYears = [...selectedYears].sort((a, b) => a - b)

  if (sortedYears.length === 0) {
    return {
      dataInsight: `No years selected for ${institute}.`,
      interpretation: 'Select at least one fiscal year using the year toggle buttons above.',
      leadershipImplication: 'Year-over-year band comparisons require at least one year to be selected.',
      caution: '',
    }
  }

  const latestYear = sortedYears[sortedYears.length - 1]

  const getBandRate = (yr: number, band: string): number | null => {
    const rec = bandData.find(
      (b) => b.Institute === institute && b.Year === yr && b.Percentile_Band === band,
    )
    return rec?.Funding_Rate !== null && rec?.Funding_Rate !== undefined
      ? rec.Funding_Rate * 100
      : null
  }

  const rate_1_5   = getBandRate(latestYear, '1-5')
  const rate_6_10  = getBandRate(latestYear, '6-10')
  const rate_11_15 = getBandRate(latestYear, '11-15')
  const rate_16_20 = getBandRate(latestYear, '16-20')
  const hasCurrent = rate_1_5 !== null || rate_6_10 !== null

  // FY2024→2025 comparison if both years selected
  let comparisonText = ''
  if (sortedYears.includes(2024) && sortedYears.includes(2025)) {
    const changes: string[] = []
    const d1 = (() => {
      const r25 = getBandRate(2025, '1-5'); const r24 = getBandRate(2024, '1-5')
      return r25 !== null && r24 !== null ? r25 - r24 : null
    })()
    const d2 = (() => {
      const r25 = getBandRate(2025, '6-10'); const r24 = getBandRate(2024, '6-10')
      return r25 !== null && r24 !== null ? r25 - r24 : null
    })()
    if (d1 !== null) changes.push(`band 1–5: ${d1 >= 0 ? '+' : ''}${d1.toFixed(1)} pp`)
    if (d2 !== null) changes.push(`band 6–10: ${d2 >= 0 ? '+' : ''}${d2.toFixed(1)} pp`)
    if (changes.length > 0) comparisonText = ` FY2024→FY2025 changes — ${changes.join(', ')}.`
  }

  const dataInsight = hasCurrent
    ? `${institute} FY${latestYear} funding rates — band 1–5: ${rate_1_5?.toFixed(1) ?? 'N/A'}%, ` +
      `6–10: ${rate_6_10?.toFixed(1) ?? 'N/A'}%, ` +
      `11–15: ${rate_11_15?.toFixed(1) ?? 'N/A'}%, ` +
      `16–20: ${rate_16_20?.toFixed(1) ?? 'N/A'}%.` + comparisonText
    : `No band data available for ${institute} FY${latestYear}.`

  const isHighComp = rate_1_5 !== null && rate_1_5 < 60
  const isLowRate  = rate_6_10 !== null && rate_6_10 < 20

  let interpretation = ''
  if (isHighComp && isLowRate) {
    interpretation =
      `${institute} shows a compressed funding profile in FY${latestYear}: even the top band (1–5) has a ` +
      `funding rate below 60%, and the 6–10 band drops to under 20%. ` +
      `This indicates a highly selective environment where most funded applications cluster in the top score tier.`
  } else if (rate_1_5 !== null && rate_1_5 >= 80) {
    interpretation =
      `${institute} shows a relatively generous profile in FY${latestYear}: the 1–5 band achieves an ` +
      `${rate_1_5.toFixed(1)}% funding rate, suggesting strong institutional support for highly-scored applications.`
  } else {
    interpretation =
      `${institute} FY${latestYear} band data shows how funding probability varies across score tiers. ` +
      `Higher bands (lower percentile numbers) achieve substantially higher funding rates, ` +
      `with meaningful declines in the 11–20 range.`
  }

  if (comparisonText) {
    interpretation +=
      ` The FY2024–FY2025 comparison reflects the system-wide payline compression observed in FY2025 ` +
      `and shows how it affected the ${institute} band profile specifically.`
  }

  const leadershipImplication =
    `Applications targeting ${institute} should aim for the 1–5 or 6–10 percentile band for the highest ` +
    `funding confidence. The band profile guides where to focus resubmission investment and score-improvement targets.`

  const caution = sortedYears.includes(2025)
    ? 'FY2025 data is preliminary. Band-level rates may shift as final awards are processed.'
    : ''

  return { dataInsight, interpretation, leadershipImplication, caution }
}

// ─── Cross-Year Trends ───────────────────────────────────────────────────────

export function generateTrendInsight(
  selectedInstitutes: string[],
  paylines: Payline[],
): InsightResult {
  if (selectedInstitutes.length === 0) {
    return {
      dataInsight: 'No institutes selected.',
      interpretation: 'Use the institute selector above to add one or more institutes to the trend view.',
      leadershipImplication: 'Select at least one institute to see EEP50 trend insights.',
      caution: '',
    }
  }

  const changes = selectedInstitutes.map((ic) => {
    const r25 = paylines.find((p) => p.Institute === ic && p.Year === 2025)
    const r24 = paylines.find((p) => p.Institute === ic && p.Year === 2024)
    const delta =
      r25?.EEP50 != null && r24?.EEP50 != null ? r25.EEP50 - r24.EEP50 : null
    return { ic, eep2024: r24?.EEP50, eep2025: r25?.EEP50, delta }
  })
  const validChanges = changes.filter((c) => c.delta !== null).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
  const mostSevere   = validChanges[0]
  const leastSevere  = validChanges[validChanges.length - 1]
  const allDeclined  = validChanges.length > 0 && validChanges.every((c) => (c.delta ?? 0) < 0)

  let dataInsight = ''
  if (selectedInstitutes.length === 1) {
    const ic  = selectedInstitutes[0]
    const r14 = paylines.find((p) => p.Institute === ic && p.Year === 2014)
    const r24 = paylines.find((p) => p.Institute === ic && p.Year === 2024)
    const r25 = paylines.find((p) => p.Institute === ic && p.Year === 2025)
    const d   = changes[0]?.delta
    dataInsight =
      `${ic}: EEP50 moved from ${r14?.EEP50?.toFixed(1) ?? 'N/A'} (FY2014) to ` +
      `${r24?.EEP50?.toFixed(1) ?? 'N/A'} (FY2024) to ${r25?.EEP50?.toFixed(1) ?? 'N/A'} (FY2025).` +
      (d !== null && d !== undefined
        ? ` FY2024→2025 change: ${d >= 0 ? '+' : ''}${d.toFixed(1)} pp.`
        : '')
  } else {
    dataInsight =
      `${selectedInstitutes.length} institutes compared FY2014–2025. ` +
      (mostSevere
        ? `FY2025 sharpest decline: ${mostSevere.ic} (${mostSevere.delta?.toFixed(1)} pp). `
        : '') +
      (leastSevere && leastSevere.ic !== mostSevere?.ic
        ? `Smallest decline: ${leastSevere.ic} (${leastSevere.delta?.toFixed(1)} pp).`
        : '')
  }

  let interpretation = ''
  if (selectedInstitutes.length === 1) {
    const ic  = selectedInstitutes[0]
    const r25 = paylines.find((p) => p.Institute === ic && p.Year === 2025)
    if ((r25?.EEP50 ?? Infinity) < 12) {
      interpretation =
        `${ic} is in the highly compressed range in FY2025 (EEP50 below 12). ` +
        `This is historically unusual and signals significantly heightened competition compared to prior stable periods (FY2019–2023).`
    } else {
      interpretation =
        `The EEP50 trend for ${ic} shows how competitiveness has evolved over 12 years. ` +
        `Watch for the FY2025 value, which marks the most recent — and in many cases most compressed — point in the series.`
    }
  } else {
    if (allDeclined) {
      interpretation =
        `All ${selectedInstitutes.length} selected institutes declined from FY2024 to FY2025 — a ` +
        `system-wide pattern consistent with the broader NIH funding compression. ` +
        `The trend lines reveal the relative magnitude of change at each institute.`
    } else {
      interpretation =
        `The selected institutes show varied EEP50 trajectories over 12 years, with FY2025 marking a significant ` +
        `shift for most. Divergence in trends reflects institute-specific budget and portfolio dynamics.`
    }
  }

  const leadershipImplication =
    selectedInstitutes.length === 1
      ? `Use the 12-year trend for ${selectedInstitutes[0]} to calibrate faculty advising. ` +
        `The rate and direction of change in EEP50 directly informs whether current application strategies remain viable.`
      : `The cross-institute view identifies which institutes have experienced the sharpest environment changes — ` +
        `informing where to focus resubmission support and score-improvement counseling.`

  const caution =
    'FY2025 data is preliminary (extracted March 2026). Year-over-year comparisons should be confirmed before official reporting.'

  return { dataInsight, interpretation, leadershipImplication, caution }
}

// ─── Institute Comparison ────────────────────────────────────────────────────

export function generateInstituteComparisonInsight(
  year: number,
  metric: 'EEP50' | 'Opportunity_Width',
  data: Array<{ institute: string; EEP50: number | null; Opportunity_Width: number | null }>,
  allNihRow: Payline | undefined,
): InsightResult {
  if (data.length === 0) {
    return {
      dataInsight: `No institute data available for FY${year}.`,
      interpretation: 'No valid EEP estimates for this year.',
      leadershipImplication: 'Select a different fiscal year to view institute comparisons.',
      caution: '',
    }
  }

  const values = data
    .map((d) => (metric === 'EEP50' ? d.EEP50 : d.Opportunity_Width))
    .filter((v): v is number => v !== null)

  if (values.length === 0) {
    return {
      dataInsight: `No valid ${metric} values for FY${year}.`,
      interpretation: 'Insufficient modeled data for this fiscal year.',
      leadershipImplication: 'Select a different year.',
      caution: '',
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = (metric === 'EEP50' ? a.EEP50 : a.Opportunity_Width) ?? 0
    const bv = (metric === 'EEP50' ? b.EEP50 : b.Opportunity_Width) ?? 0
    return av - bv
  })
  const most    = sorted[0]
  const least   = sorted[sorted.length - 1]
  const minVal  = values[0] < values[values.length - 1] ? Math.min(...values) : Math.min(...values)
  const maxVal  = Math.max(...values)
  const allNihVal = metric === 'EEP50' ? allNihRow?.EEP50 : allNihRow?.Opportunity_Width

  let dataInsight = ''
  if (metric === 'EEP50') {
    const belowNIH = allNihVal != null ? data.filter((d) => (d.EEP50 ?? Infinity) < allNihVal!).length : 0
    const aboveNIH = allNihVal != null ? data.filter((d) => (d.EEP50 ?? 0) > allNihVal!).length : 0
    dataInsight =
      `FY${year} EEP50 range: ${minVal.toFixed(1)} (${most.institute}) to ${maxVal.toFixed(1)} (${least.institute}).` +
      (allNihVal != null ? ` ALL NIH benchmark: ${allNihVal.toFixed(1)}. ${belowNIH} ICs more competitive; ${aboveNIH} less.` : '')
  } else {
    dataInsight =
      `FY${year} Opportunity Width range: ${minVal.toFixed(1)} pp (${most.institute}) to ${maxVal.toFixed(1)} pp (${least.institute}).` +
      (allNihVal != null ? ` ALL NIH: ${allNihVal.toFixed(1)} pp.` : '')
  }

  const spread = maxVal - minVal
  let interpretation = ''
  if (metric === 'EEP50') {
    interpretation =
      `The ${spread.toFixed(1)} pp spread in EEP50 across FY${year} institutes reflects meaningful variation in funding selectivity. ` +
      `${most.institute} is the most competitive (lowest EEP50), while ${least.institute} offers the broadest score range.`
  } else {
    interpretation =
      `Opportunity Width ranges ${spread.toFixed(1)} pp across institutes in FY${year}. ` +
      `${least.institute} has the widest funding window (${maxVal.toFixed(1)} pp) — a more gradual cliff. ` +
      `${most.institute} has the narrowest (${minVal.toFixed(1)} pp) — the sharpest payline.`
  }

  const leadershipImplication =
    metric === 'EEP50'
      ? `Institute-specific EEP50 values inform where to set resubmission targets. ` +
        `Applications near the ALL NIH benchmark may face very different odds depending on the target IC.`
      : `Institutes with wider Opportunity Width support broader resubmission strategies; ` +
        `narrow windows demand score precision. Use this to calibrate advising by target IC.`

  const caution =
    year === 2025
      ? 'FY2025 data is preliminary. IC-level EEP estimates for smaller institutes may be subject to revision.'
      : ''

  return { dataInsight, interpretation, leadershipImplication, caution }
}

// ─── Resubmission Map ────────────────────────────────────────────────────────

const TRANSITIONS_ORDERED = ['20→15', '18→12', '15→10', '12→8']
const FOCAL_TRANSITION    = '18→12'

function _getGains(data: ResubmissionOpp[], ic: string, t: string): number[] {
  return data
    .filter((r) => r.Institute === ic && r.Transition === t && r.Absolute_Gain !== null)
    .sort((a, b) => a.Year - b.Year)
    .map((r) => (r.Absolute_Gain as number) * 100)
}

function _mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length
}

function _std(arr: number[], m: number): number {
  if (arr.length < 2) return 0
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1))
}

function _percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const s   = [...arr].sort((a, b) => a - b)
  const idx = (p / 100) * (s.length - 1)
  const lo  = Math.floor(idx)
  const hi  = Math.ceil(idx)
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

function _slope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xm = (n - 1) / 2
  const ym = _mean(ys)
  let num = 0, den = 0
  ys.forEach((y, i) => { num += (i - xm) * (y - ym); den += (i - xm) ** 2 })
  return den === 0 ? 0 : num / den
}

export function generateResubmissionInsight(
  institute: string,
  _year: number,
  resubData: ResubmissionOpp[],
): InsightResult {
  const focalGains = _getGains(resubData, institute, FOCAL_TRANSITION)
  const nYears     = focalGains.length

  // A. Payoff tier relative to all institutes
  const allMeans = [...new Set(resubData.map((r) => r.Institute))]
    .map((ic) => _mean(_getGains(resubData, ic, FOCAL_TRANSITION)))
    .filter((v) => v > 0)
  const p75 = _percentile(allMeans, 75)
  const p25 = _percentile(allMeans, 25)
  const selMean = _mean(focalGains)
  const payoffTier: 'High' | 'Moderate' | 'Low' =
    selMean >= p75 ? 'High' : selMean <= p25 ? 'Low' : 'Moderate'

  // B. Stable vs volatile
  const sd = _std(focalGains, selMean)
  const cv = selMean > 1 ? sd / selMean : Infinity
  const volatility: 'Stable' | 'Moderately variable' | 'Volatile' =
    cv < 0.2 ? 'Stable' : cv < 0.4 ? 'Moderately variable' : 'Volatile'

  // C. Strongest/weakest transition
  const transMeans = TRANSITIONS_ORDERED
    .map((t) => ({ t, mean: _mean(_getGains(resubData, institute, t)) }))
    .filter((x) => x.mean > 0)
    .sort((a, b) => b.mean - a.mean)
  const strongest  = transMeans[0]
  const weakest    = transMeans[transMeans.length - 1]
  const coLeading  = transMeans.length >= 2 && (transMeans[0].mean - transMeans[1].mean) < 2

  const strongestDesc = coLeading
    ? `${transMeans[0].t} and ${transMeans[1].t} (co-leading, within 2 pp)`
    : strongest
      ? `${strongest.t} (avg ${strongest.mean.toFixed(1)} pp gain)`
      : 'insufficient data'

  // D. Trend direction
  const slope     = _slope(focalGains)
  const trendDir  = slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'mixed'

  // E. Current-year opportunity
  const latestYr = resubData
    .filter((r) => r.Transition === FOCAL_TRANSITION && r.Absolute_Gain !== null)
    .reduce((max, r) => (r.Year > max ? r.Year : max), 0)
  const latestAll = resubData
    .filter((r) => r.Year === latestYr && r.Transition === FOCAL_TRANSITION && r.Absolute_Gain !== null)
    .map((r) => (r.Absolute_Gain as number) * 100)
  const curRec = resubData.find(
    (r) => r.Institute === institute && r.Year === latestYr && r.Transition === FOCAL_TRANSITION,
  )
  const curGain = curRec?.Absolute_Gain != null ? curRec.Absolute_Gain * 100 : null
  const curOpp =
    curGain === null
      ? 'Middle-range'
      : curGain >= _percentile(latestAll, 75)
        ? 'Strong'
        : curGain <= _percentile(latestAll, 25)
          ? 'Limited'
          : 'Middle-range'

  // Narrative
  const dataInsight =
    `For ${institute}, the ${FOCAL_TRANSITION} transition yields an average absolute probability gain of ` +
    `${selMean.toFixed(1)} pp across ${nYears} year${nYears !== 1 ? 's' : ''} ` +
    `(${payoffTier.toLowerCase()} resubmission payoff tier). ` +
    (strongest ? `Strongest modeled gain: ${strongestDesc}. ` : '') +
    `Year-to-year variation is ${volatility.toLowerCase()} (CV ≈ ${cv < Infinity ? cv.toFixed(2) : 'N/A'}). ` +
    `Trend over available years: ${trendDir}.`

  const interpretation =
    `${institute} shows ${payoffTier.toLowerCase()} resubmission payoff for the focal ${FOCAL_TRANSITION} transition ` +
    `relative to other institutes. ` +
    (coLeading
      ? `The ${transMeans[0].t} and ${transMeans[1].t} transitions are co-leading — both offer similar upside. `
      : strongest
        ? `The strongest modeled gain occurs in the ${strongest.t} transition — near-miss applications in this range benefit most from score improvement. `
        : '') +
    (volatility === 'Stable'
      ? 'The stable year-to-year pattern supports consistent strategic planning. '
      : volatility === 'Volatile'
        ? 'High year-to-year variability means resubmission upside may be less predictable at this institute. '
        : 'Moderate variability suggests a reasonably consistent resubmission environment. ') +
    (curGain !== null
      ? `Current-year opportunity (FY${latestYr}): ${curOpp.toLowerCase()} relative to all institutes (${curGain.toFixed(1)} pp gain).`
      : '')

  const leadershipImplication =
    payoffTier === 'High'
      ? `${institute} offers above-average resubmission leverage. Near-miss applications with realistic score-improvement trajectories should be strongly supported. Focus advising on the ${strongest?.t ?? FOCAL_TRANSITION} transition zone.`
      : payoffTier === 'Low'
        ? `${institute} shows limited resubmission leverage in the ${FOCAL_TRANSITION} range. Investigators near the payline should carefully assess whether a small score gain is likely to convert to funding before committing resubmission resources.`
        : `${institute} shows moderate resubmission leverage. Prioritize resubmissions where a meaningful score improvement is realistic. Use the ${strongest?.t ?? FOCAL_TRANSITION} transition as a planning benchmark.`

  // F. Caution
  const cautionParts: string[] = []
  if (nYears < 5)          cautionParts.push('Based on limited year coverage — interpret cautiously.')
  if (volatility === 'Volatile') cautionParts.push('Year-to-year variability is high; resubmission upside appears less predictable.')
  if (transMeans.length < 4)     cautionParts.push('Some score transitions have incomplete data, limiting cross-transition comparison.')
  if (selMean < 5)               cautionParts.push('Mean gain is very small — practical resubmission benefit may be limited.')
  if (latestYr === 2025)         cautionParts.push('FY2025 data is preliminary (extracted March 2026).')
  cautionParts.push('Results are descriptive and based on modeled percentile-to-funding relationships, not guaranteed outcomes.')

  return {
    dataInsight,
    interpretation,
    leadershipImplication,
    caution: cautionParts.join(' '),
  }
}

// ─── Institute Typology ──────────────────────────────────────────────────────

export function generateTypologyInsight(
  year: number,
  data: Array<{ institute: string; quadrant: string; EEP50: number; OW: number }>,
): InsightResult {
  if (data.length === 0) {
    return {
      dataInsight: `No typology data for FY${year}.`,
      interpretation: 'Select a different year to view institute typology.',
      leadershipImplication: 'No actionable data available for this year.',
      caution: '',
    }
  }

  const counts: Record<string, number> = {}
  for (const d of data) counts[d.quadrant] = (counts[d.quadrant] ?? 0) + 1

  const sharpCount  = counts['Sharp Payline']  ?? 0
  const broadCount  = counts['Broad Opportunity Window'] ?? 0
  const compCount   = counts['Competitive & Probabilistic'] ?? 0
  const modCount    = counts['Moderate & Focused'] ?? 0

  const sharpICs = data.filter((d) => d.quadrant === 'Sharp Payline').map((d) => d.institute).join(', ')
  const broadICs = data.filter((d) => d.quadrant === 'Broad Opportunity Window').map((d) => d.institute).join(', ')

  const dataInsight =
    `FY${year} IC typology (${data.length} institutes): ` +
    `${sharpCount} Sharp Payline${sharpCount !== 1 ? 's' : ''}, ` +
    `${compCount} Competitive & Probabilistic, ` +
    `${modCount} Moderate & Focused, ` +
    `${broadCount} Broad Opportunity Window. ` +
    (sharpICs ? `Sharp Payline ICs: ${sharpICs}. ` : '') +
    (broadICs ? `Broad Window ICs: ${broadICs}.` : '')

  const interpretation =
    sharpCount >= 8
      ? `The majority of institutes fall in the Sharp Payline or Competitive quadrants in FY${year}, indicating a broadly compressed NIH funding environment with limited gray-zone flexibility.`
      : broadCount >= 8
        ? `A significant share of institutes occupy the Broad Opportunity Window in FY${year}, reflecting a relatively permissive system-wide environment with wider resubmission zones.`
        : `FY${year} shows a mixed typology: some institutes are in compressed (sharp) zones while others retain broader opportunity windows. Investigators should check their specific target IC's quadrant before planning resubmission.`

  const leadershipImplication =
    `Use the IC typology to quickly identify which target institutes demand score precision (Sharp Payline) ` +
    `versus those where a broader range of scores remains competitive (Broad Opportunity Window). ` +
    `Click any institute dot on the chart to highlight it.`

  const caution =
    year === 2025
      ? 'FY2025 data is preliminary. Quadrant assignments for smaller ICs may shift as data is finalized.'
      : ''

  return { dataInsight, interpretation, leadershipImplication, caution }
}
