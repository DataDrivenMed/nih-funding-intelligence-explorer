// Reusable narrative generators for dynamic insight panels.

export interface NarrativeResult {
  insight: string;
  interpretation: string;
  leadershipImplication: string;
  caution: string;
}

// ─── Math helpers ────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function linearSlope(xs: number[], ys: number[]): number {
  if (xs.length < 2) return 0;
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// ─── Institute Comparison ─────────────────────────────────────────────────────

interface ICMetrics {
  institute: string;
  eep80: number | null;
  eep50: number | null;
  eep20: number | null;
  opportunityWidth: number | null;
  overallFundingRate: number;
  typologyQuadrantLabel: string;
  eep50YoYChange: number;
  totalApplications: number;
}

export function generateInstituteComparisonInsight(
  focused: ICMetrics,
  all: ICMetrics[],
): NarrativeResult {
  const validEep50 = all.map(d => d.eep50).filter(v => v !== null) as number[];
  const ranked = [...all].sort((a, b) => (a.eep50 ?? 99) - (b.eep50 ?? 99));
  const rank = ranked.findIndex(d => d.institute === focused.institute) + 1;
  const eep50 = focused.eep50?.toFixed(1) ?? '—';
  const ow = focused.opportunityWidth?.toFixed(1) ?? '—';
  const rate = (focused.overallFundingRate * 100).toFixed(1);
  const minEep50 = Math.min(...validEep50).toFixed(1);
  const maxEep50 = Math.max(...validEep50).toFixed(1);
  const yoy = focused.eep50YoYChange;
  const yoyStr = `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)} pp`;

  const insight = `${focused.institute} has an EEP50 of ${eep50} in FY2025, ranking #${rank} most competitive of ${all.length} institutes. Its Opportunity Width is ${ow} pp and overall funding rate is ${rate}%. Typology: ${focused.typologyQuadrantLabel}. Year-over-year EEP50 change: ${yoyStr}. System-wide EEP50 ranges from ${minEep50} to ${maxEep50} across institutes.`;

  const eep50Val = focused.eep50 ?? 0;
  const isVeryCompetitive = eep50Val <= 8;
  const isBroad = (focused.opportunityWidth ?? 0) >= 12;

  const interpretation = isVeryCompetitive
    ? `${focused.institute} is among the most competitive institutes. An application must reach a very strong score (below percentile ${eep50}) to achieve 50% funding probability. The gray zone of probabilistic funding is narrow${isBroad ? ', though Opportunity Width indicates some scoring flexibility' : ''}.`
    : `${focused.institute} sits at a ${rank <= Math.ceil(all.length / 2) ? 'more competitive' : 'less competitive'} position. An application at percentile ${eep50} has a ~50% funding probability. ${isBroad ? 'The broader Opportunity Width means scoring variation has a meaningful effect on probability.' : 'The narrower Opportunity Width means small score differences matter greatly.'}`;

  const leadership = rank <= 5
    ? `Applications to ${focused.institute} require rigorous score targeting. Resubmission counseling should use the ${focused.institute}-specific EEP50 of ${eep50} — not an NIH-wide benchmark — when advising on resubmission decisions.`
    : `${focused.institute} offers relatively more scoring latitude than the most competitive institutes. Portfolio planning can factor in this broader funding zone when advising early-stage investigators on IC alignment.`;

  const caution = yoy < -5
    ? `${focused.institute} experienced a significant EEP50 compression of ${yoyStr} in FY2025. Treat all FY2025 values as preliminary until the NIH Data Book is finalized.`
    : `FY2025 data is preliminary (extracted March 2026). EEP values are modeled estimates, not official paylines.`;

  return { insight, interpretation, leadershipImplication: leadership, caution };
}

// ─── Funding Landscape ────────────────────────────────────────────────────────

export function generateFundingLandscapeInsight(
  selectedIC: string,
  bandRates: Record<string, { rate: number; total: number }>,
  isAggregate: boolean,
): NarrativeResult {
  const bands = ['1-5', '6-10', '11-15', '16-20', '21-25', '26+'];
  const rows = bands.map(b => ({ band: b, rate: bandRates[b]?.rate ?? 0, total: bandRates[b]?.total ?? 0 }));
  const band15 = rows.find(r => r.band === '11-15');
  const band20 = rows.find(r => r.band === '16-20');
  const band25 = rows.find(r => r.band === '21-25');
  const band15rate = ((band15?.rate ?? 0) * 100).toFixed(1);
  const band20rate = ((band20?.rate ?? 0) * 100).toFixed(1);
  const band25rate = ((band25?.rate ?? 0) * 100).toFixed(1);
  const totalApps = rows.reduce((s, r) => s + r.total, 0);

  const insight = isAggregate
    ? `ALL NIH FY2025: The 1–5 band retains ~91% funding rate. The 11–15 band funds ${band15rate}% of applications, down from ~75% in 2019. The 16–20 band funds ${band20rate}%; the 21–25 band funds only ${band25rate}%. Total scored applications across all bands: ${totalApps.toLocaleString()}.`
    : `${selectedIC} FY2025: The 11–15 band funds ${band15rate}% of applications. The 16–20 band funds ${band20rate}%; the 21–25 band funds ${band25rate}%. Total scored applications: ${totalApps.toLocaleString()}.`;

  const midBandHigh = (band15?.rate ?? 0) > 0.4;
  const interpretation = midBandHigh
    ? `At ${selectedIC}, mid-range scores (11–15) retain meaningful funding probability (~${band15rate}%). Applications in this band still have a viable path to funding.`
    : `At ${selectedIC}, the mid-range band (11–15) funds only ${band15rate}% of applications. The competitive window is concentrated in the 1–10 percentile range, signaling a steep funding cliff for scores above 10.`;

  const leadership = `Internal resubmission guidance for ${selectedIC} should reflect these band-specific rates. Scores in the 11–15 range warrant strong resubmission support; scores above 20 should prompt strategic reconsideration of mechanism, IC fit, or research aim.`;

  const caution = isAggregate
    ? `ALL NIH band rates are highly reliable (hundreds to thousands of applications per band). FY2025 data is preliminary.`
    : `Band-level rates for individual institutes with fewer than 30 applications per band carry substantial statistical uncertainty. Small-IC estimates should be interpreted directionally. FY2025 is preliminary.`;

  return { insight, interpretation, leadershipImplication: leadership, caution };
}

// ─── Payline Explorer ─────────────────────────────────────────────────────────

interface PaylineProfile {
  institute: string;
  eep80: number | null;
  eep50: number | null;
  eep20: number | null;
  opportunityWidth: number | null;
  overallFundingRate: number;
  eep50YoYChange: number;
  history: Array<{ year: number; eep50: number | null; overallRate: number | null }>;
}

export function generatePaylineInsight(profile: PaylineProfile): NarrativeResult {
  const { institute, eep80, eep50, eep20, opportunityWidth, overallFundingRate, eep50YoYChange, history } = profile;
  const histValid = history.filter(h => h.eep50 !== null);
  const histMean = mean(histValid.map(h => h.eep50 as number));
  const yoy = eep50YoYChange;
  const eep50str = eep50?.toFixed(1) ?? '—';
  const eep80str = eep80?.toFixed(1) ?? '—';
  const eep20str = eep20?.toFixed(1) ?? '—';
  const owStr = opportunityWidth?.toFixed(1) ?? '—';
  const rateStr = (overallFundingRate * 100).toFixed(1);
  const yoyStr = `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)} pp`;
  const histMeanStr = histMean.toFixed(1);

  const insight = `${institute} FY2025: EEP80 = ${eep80str}, EEP50 = ${eep50str}, EEP20 = ${eep20str}. Opportunity Width: ${owStr} pp. Funding rate: ${rateStr}%. EEP50 YoY change: ${yoyStr}. Historical mean EEP50 (2014–2024): ${histMeanStr}.`;

  const compression = Math.abs(yoy) >= 5 ? 'dramatic' : Math.abs(yoy) >= 2 ? 'significant' : 'modest';
  const interpretation = `The ${compression} compression of ${yoyStr} in EEP50 at ${institute} means the statistical payline has moved from ~${(eep50 ?? 0 - yoy).toFixed(1)} to ${eep50str}. Applications historically considered near-payline are now operating at a different risk profile.`;

  const leadership = `Research development staff should update ${institute}-specific benchmarks. An application scored at percentile ${eep20str} (EEP20) now has only a ~20% funding probability — not the 40–50% it would have represented in prior years.`;

  const caution = `FY2025 EEP values are derived from preliminary data. ${institute === 'ALL NIH' ? 'ALL NIH estimates are highly reliable (pseudo-R² > 0.95).' : 'Small-IC estimates (NIMHD, NINR, NLM, NHGRI) should be treated as directional.'}`;

  return { insight, interpretation, leadershipImplication: leadership, caution };
}

// ─── Cross-Year Trends ────────────────────────────────────────────────────────

interface TrendProfile {
  institute: string;
  history: Array<{ year: number; eep50: number | null }>;
  fy2025: { eep50: number | null; eep50YoYChange: number };
}

export function generateTrendInsight(selected: string[], data: TrendProfile[]): NarrativeResult {
  if (!selected.length) {
    return {
      insight: 'No institutes selected. Choose one or more institutes to display trends.',
      interpretation: 'Select institutes using the toggle buttons above the chart.',
      leadershipImplication: 'Comparing institute-level trends reveals differential funding compression patterns.',
      caution: 'FY2025 values are preliminary.',
    };
  }

  const profiles = selected.map(ic => data.find(d => d.institute === ic)).filter(Boolean) as TrendProfile[];
  const changes = profiles.map(p => ({ institute: p.institute, change: p.fy2025.eep50YoYChange, eep50: p.fy2025.eep50 }));
  const mostCompressed = [...changes].sort((a, b) => (a.change ?? 0) - (b.change ?? 0))[0];
  const leastCompressed = [...changes].sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
  const allNegative = changes.every(c => (c.change ?? 0) < 0);

  const icsStr = selected.join(', ');
  const insight = `Displaying EEP50 trends for: ${icsStr}. In FY2025, ${allNegative ? 'all selected institutes showed tighter paylines' : 'most selected institutes compressed'}. Most compressed: ${mostCompressed.institute} (${mostCompressed.change > 0 ? '+' : ''}${mostCompressed.change?.toFixed(1)} pp). Least compressed: ${leastCompressed.institute} (${leastCompressed.change > 0 ? '+' : ''}${leastCompressed.change?.toFixed(1)} pp).`;

  const interpretation = `The multi-institute view reveals that while system-wide compression occurred, the magnitude differs substantially across ICs. Understanding which institutes shifted most helps contextualize investigator-level score comparisons.`;

  const leadership = selected.includes('ALL NIH')
    ? `The ALL NIH trend line provides the system-wide baseline. Deviations between individual IC lines and the ALL NIH line reveal IC-specific funding pressures that warrant IC-specific portfolio guidance.`
    : `Comparing these institutes helps research offices understand relative competitiveness and adjust IC-specific resubmission thresholds accordingly.`;

  const caution = `EEP50 measures the modeled 50% funding probability threshold — not the official payline. FY2025 values are preliminary.`;

  return { insight, interpretation, leadershipImplication: leadership, caution };
}

// ─── Resubmission Map ─────────────────────────────────────────────────────────

type TransitionKey = '20to15' | '18to12' | '15to10' | '12to8';

interface GainData {
  probFrom: number;
  probTo: number;
  absGain: number;
  relGainPct: number;
}

type ByYearData = Record<string, Record<string, Record<TransitionKey, GainData>>>;

const TRANSITION_LABELS: Record<TransitionKey, string> = {
  '20to15': '20→15',
  '18to12': '18→12',
  '15to10': '15→10',
  '12to8': '12→8',
};

function getYearlyGains(ic: string, byYear: ByYearData, key: TransitionKey): { year: number; gain: number }[] {
  return Object.entries(byYear)
    .filter(([, ics]) => ics[ic]?.[key] !== undefined)
    .map(([yr, ics]) => ({ year: parseInt(yr), gain: ics[ic][key].absGain }))
    .sort((a, b) => a.year - b.year);
}

function getMeanGainForIC(ic: string, byYear: ByYearData, key: TransitionKey): number | null {
  const gains = getYearlyGains(ic, byYear, key);
  if (!gains.length) return null;
  return mean(gains.map(g => g.gain));
}

export function generateResubmissionInsight(
  selectedIC: string,
  byYear: ByYearData,
  allInstituteNames: string[],
): NarrativeResult {
  const key18to12: TransitionKey = '18to12';
  const allKeys: TransitionKey[] = ['20to15', '18to12', '15to10', '12to8'];

  // A. High/Moderate/Low payoff
  const selectedGains18 = getYearlyGains(selectedIC, byYear, key18to12);
  const selectedMeanGain18 = selectedGains18.length ? mean(selectedGains18.map(g => g.gain)) : null;

  const allMeanGains18 = allInstituteNames
    .map(ic => getMeanGainForIC(ic, byYear, key18to12))
    .filter(v => v !== null) as number[];
  const sortedMeans = [...allMeanGains18].sort((a, b) => a - b);
  const p75mean = percentile(sortedMeans, 0.75);
  const p25mean = percentile(sortedMeans, 0.25);

  let payoffClass = 'moderate resubmission payoff';
  if (selectedMeanGain18 !== null) {
    if (selectedMeanGain18 >= p75mean) payoffClass = 'high resubmission payoff';
    else if (selectedMeanGain18 <= p25mean) payoffClass = 'low resubmission payoff';
  }

  // B. Stable vs volatile
  const gains18vals = selectedGains18.map(g => g.gain);
  const m18 = mean(gains18vals);
  const sd18 = stddev(gains18vals);
  const cv18 = m18 > 0.01 ? sd18 / m18 : null;

  let stabilityClass = 'moderately variable';
  if (cv18 !== null) {
    if (cv18 < 0.20) stabilityClass = 'stable';
    else if (cv18 >= 0.40) stabilityClass = 'volatile';
  } else {
    // Fallback: SD rank
    const allSDs = allInstituteNames.map(ic => {
      const g = getYearlyGains(ic, byYear, key18to12).map(x => x.gain);
      return g.length >= 2 ? stddev(g) : null;
    }).filter(v => v !== null) as number[];
    const sortedSDs = [...allSDs].sort((a, b) => a - b);
    const icSD = gains18vals.length >= 2 ? stddev(gains18vals) : 0;
    const p25sd = percentile(sortedSDs, 0.25);
    const p75sd = percentile(sortedSDs, 0.75);
    stabilityClass = icSD <= p25sd ? 'stable' : icSD >= p75sd ? 'volatile' : 'moderately variable';
  }

  // C. Strongest/weakest transition
  const avgGains = allKeys.map(k => {
    const g = getYearlyGains(selectedIC, byYear, k);
    return { key: k, label: TRANSITION_LABELS[k], avg: g.length ? mean(g.map(x => x.gain)) : null };
  }).filter(x => x.avg !== null) as { key: TransitionKey; label: string; avg: number }[];

  const sortedGains = [...avgGains].sort((a, b) => b.avg - a.avg);
  let strongestLabel = sortedGains[0]?.label ?? '—';
  let weakestLabel = sortedGains[sortedGains.length - 1]?.label ?? '—';

  if (sortedGains.length >= 2 && sortedGains[0].avg - sortedGains[1].avg < 0.02) {
    strongestLabel = `${sortedGains[0].label} and ${sortedGains[1].label} (co-leading)`;
  }

  // D. Trend direction
  const slope18 = linearSlope(selectedGains18.map(g => g.year), selectedGains18.map(g => g.gain));
  let trendDir = 'mostly flat or mixed';
  if (slope18 > 0.005) trendDir = 'increasing';
  else if (slope18 < -0.005) trendDir = 'decreasing';

  // E. Current-year opportunity
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  let currentOpportunity = 'middle-range current opportunity';
  for (const yr of years) {
    if (byYear[String(yr)]?.[selectedIC]?.[key18to12] !== undefined) {
      const latestGain = byYear[String(yr)][selectedIC][key18to12].absGain;
      const allLatest = allInstituteNames
        .map(ic => byYear[String(yr)]?.[ic]?.[key18to12]?.absGain)
        .filter(v => v !== undefined) as number[];
      const sortedLatest = [...allLatest].sort((a, b) => a - b);
      const p75lat = percentile(sortedLatest, 0.75);
      const p25lat = percentile(sortedLatest, 0.25);
      if (latestGain >= p75lat) currentOpportunity = 'strong current opportunity';
      else if (latestGain <= p25lat) currentOpportunity = 'limited current opportunity';
      break;
    }
  }

  // F. Cautions
  const cautionParts: string[] = [];
  if (selectedGains18.length < 5) cautionParts.push('This pattern is based on limited year coverage and should be interpreted cautiously.');
  if (stabilityClass === 'volatile') cautionParts.push('Year-to-year variability is high, so resubmission upside appears less predictable.');
  if (avgGains.length < allKeys.length) cautionParts.push('Some score transitions have incomplete data, which may limit comparison across transitions.');
  if (selectedMeanGain18 !== null && selectedMeanGain18 < 0.05) cautionParts.push('Mean gain for this institute is very small, limiting the practical impact of score improvement.');
  if (!cautionParts.length) cautionParts.push('These results are descriptive and based on modeled percentile-to-funding relationships, not guaranteed outcomes for any individual application cycle.');

  // Compose narrative
  const mean18str = selectedMeanGain18 !== null ? `+${(selectedMeanGain18 * 100).toFixed(1)} pp` : '—';
  const insight = `For ${selectedIC}, the largest modeled resubmission gain appears in the ${strongestLabel} transition (mean ${mean18str} for 18→12 across available years). Year-to-year pattern is ${stabilityClass} with a ${trendDir} trend over 2014–2025. Current-year position: ${currentOpportunity}. Overall payoff classification: ${payoffClass}.`;

  const interpretation = `Near-miss applications at ${selectedIC} may ${payoffClass === 'high resubmission payoff' ? 'benefit substantially' : payoffClass === 'low resubmission payoff' ? 'see limited benefit' : 'see moderate benefit'} from targeted score improvement. The ${stabilityClass} pattern suggests resubmission payoff is ${stabilityClass === 'stable' ? 'consistent and predictable' : stabilityClass === 'volatile' ? 'unpredictable from year to year' : 'somewhat variable'} over time.`;

  const leadership = payoffClass === 'high resubmission payoff'
    ? `Applications to ${selectedIC} merit prioritized resubmission support, especially when the original score falls near the strongest transition zone (${strongestLabel}). The high payoff classification indicates consistent gains from score improvement.`
    : `Resubmission investment decisions for ${selectedIC} should be tailored to the application's specific score. Focus resources on applications where the score falls near the ${strongestLabel} transition zone for maximum expected return.`;

  return {
    insight,
    interpretation,
    leadershipImplication: leadership,
    caution: cautionParts.join(' '),
  };
}

// ─── Institute Typology ───────────────────────────────────────────────────────

interface TypologyIC {
  institute: string;
  eep50: number | null;
  opportunityWidth: number | null;
  overallFundingRate: number;
  typologyQuadrant: string;
  typologyQuadrantLabel: string;
  eep50YoYChange: number;
  eep20?: number | null;
}

export function generateTypologyInsight(
  selectedIC: string | null,
  institutes: TypologyIC[],
  thresholds: { eep50Median: number; owMedian: number },
): NarrativeResult {
  if (!selectedIC) {
    const quadrantCounts: Record<string, number> = {};
    institutes.forEach(d => { quadrantCounts[d.typologyQuadrantLabel] = (quadrantCounts[d.typologyQuadrantLabel] ?? 0) + 1; });
    const summary = Object.entries(quadrantCounts).map(([label, n]) => `${label}: ${n}`).join('; ');
    return {
      insight: `Using FY2025 medians (EEP50 = ${thresholds.eep50Median}, Opp. Width = ${thresholds.owMedian} pp), the 19 ICs fall into four quadrants. Distribution: ${summary}.`,
      interpretation: 'The typology reveals that institute selection is a strategic variable. Investigators submitting to Sharp Payline institutes must reach a very specific score target. Broad Opportunity Window institutes are structurally more forgiving.',
      leadershipImplication: 'Departments should map faculty funding portfolios against this typology annually. Heavy concentration in Sharp Payline ICs creates high-variance outcomes.',
      caution: 'FY2025 data is preliminary. Typology quadrant assignment may shift as final data is released.',
    };
  }

  const ic = institutes.find(d => d.institute === selectedIC);
  if (!ic) {
    return {
      insight: `No typology data available for ${selectedIC}.`,
      interpretation: 'Select a different institute to view classification details.',
      leadershipImplication: '',
      caution: '',
    };
  }

  const samequadrant = institutes.filter(d => d.typologyQuadrant === ic.typologyQuadrant && d.institute !== selectedIC);
  const peers = samequadrant.map(d => d.institute).join(', ') || 'none';
  const eep50str = ic.eep50?.toFixed(1) ?? '—';
  const owStr = ic.opportunityWidth?.toFixed(1) ?? '—';

  const insight = `${selectedIC} is classified as "${ic.typologyQuadrantLabel}" — EEP50 = ${eep50str}, Opportunity Width = ${owStr} pp. Peer institutes in same quadrant: ${peers}. FY2025 overall funding rate: ${(ic.overallFundingRate * 100).toFixed(1)}%. EEP50 YoY change: ${ic.eep50YoYChange > 0 ? '+' : ''}${ic.eep50YoYChange.toFixed(1)} pp.`;

  const isBroad = ic.typologyQuadrant === 'broadOpportunityWindow';
  const isSharp = ic.typologyQuadrant === 'sharpPayline';
  const interpretation = isSharp
    ? `${selectedIC} has a steep funding cliff — small score differences near the payline have a large impact on probability. Applications must reach a high-confidence score target to have meaningful funding odds.`
    : isBroad
    ? `${selectedIC} has a broader gray zone. An application at a moderate score still retains meaningful funding probability. This broader window provides more room for score variability without complete loss of funding odds.`
    : `${selectedIC} sits in a middle typology — competitive but not as steep as Sharp Payline institutes, with a focused opportunity window.`;

  const leadership = isSharp
    ? `For faculty submitting to ${selectedIC}: resubmission guidance should focus on achieving a score below EEP50 (${eep50str}). A score in the EEP50–EEP20 zone represents a high-risk position.`
    : `For faculty submitting to ${selectedIC}: the broader scoring window means applications near the EEP20 threshold still merit resubmission consideration.`;

  return {
    insight,
    interpretation,
    leadershipImplication: leadership,
    caution: `Typology is based on FY2025 preliminary data. Quadrant placement is relative to the FY2025 IC median values and may change in future years.`,
  };
}
