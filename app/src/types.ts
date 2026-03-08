export interface AllNihYear {
  year: number
  eep80: number | null
  eep50: number | null
  eep20: number | null
  opportunityWidth: number | null
  pseudoR2: number
  overallFundingRate: number
  eep50YoYChange: number | null
}

export interface Headline {
  id: string
  label: string
  year: number | string
  value: number
  displayValue: string
  unit: string
  delta: number | null
  deltaLabel: string | null
  trend: 'up' | 'down' | 'stable'
  alert: boolean
  context: string
}

export interface KpiSummary {
  allNihByYear: AllNihYear[]
  fy2025Headlines: Headline[]
  fy2025Compression: {
    allNegative: boolean
    mostCompressed: { institute: string; eep50YoYChange: number }
    leastCompressed: { institute: string; eep50YoYChange: number }
    mostCompetitive: { institute: string; eep50: number }
    leastCompetitive: { institute: string; eep50: number }
    icsBelowEep50_10: string[]
    historicalMeanEep50: number
    historicalStdEep50: number
    zScore2025: number
  }
}

export interface BandRate {
  rate: number
  total: number
}

export interface ResubGain {
  probFrom: number
  probTo: number
  absGain: number
  relGainPct: number
}

export interface HistoryYear {
  year: number
  eep80: number | null
  eep50: number | null
  eep20: number | null
  ow: number | null
  overallRate: number | null
  eep50YoY: number | null
}

export interface InstituteProfile {
  institute: string
  isAggregate: boolean
  fy2025: {
    eep80: number | null
    eep50: number | null
    eep20: number | null
    opportunityWidth: number | null
    overallFundingRate: number
    totalApplications: number
    totalFunded: number
    eep50YoYChange: number
    pseudoR2: number
    typologyQuadrant: string
    typologyQuadrantLabel: string
  }
  bandRates2025: Record<string, BandRate>
  resubmission2025: Record<string, ResubGain>
  history: HistoryYear[]
}

export interface TrendPoint {
  year: number
  eep80: number | null
  eep50: number | null
  eep20: number | null
  ow: number | null
  overallRate: number | null
  eep50YoY: number | null
}

export interface TrendSeries {
  institute: string
  isAggregate: boolean
  data: TrendPoint[]
}

export interface TrendEep {
  years: number[]
  series: TrendSeries[]
}

export interface PaylineCurve {
  year: number
  institute: string
  beta0: number | null
  beta1: number | null
  eep80: number | null
  eep50: number | null
  eep20: number | null
  opportunityWidth: number | null
  pseudoR2: number | null
  glmConverged: boolean
  nObsFit: number
  modelNote: string | null
}

export interface BandLandscape {
  bands: string[]
  comparisonYears: number[]
  allNihComparison: Record<string, Record<string, BandRate>>
  byInstitute: Record<string, Record<string, Record<string, BandRate>>>
}

export interface TypologyInstitute {
  institute: string
  eep80: number | null
  eep50: number | null
  eep20: number | null
  opportunityWidth: number | null
  overallFundingRate: number
  totalApplications: number
  eep50YoYChange: number
  pseudoR2: number
  typologyQuadrant: string
  typologyQuadrantLabel: string
  owIsNull: boolean
}

export interface TypologyQuadrant {
  label: string
  description: string
  id: string
  count: number
  institutes: string[]
}

export interface TypologyData {
  year: number
  thresholds: { eep50Median: number; owMedian: number }
  quadrants: Record<string, TypologyQuadrant>
  institutes: TypologyInstitute[]
}

export interface KeyStat {
  label: string
  value: string
  note: string
}

export interface InsightSection {
  id: string
  title: string
  description: string
  data_insight: string
  interpretation: string
  leadership_implication: string
  caution: string
  key_stats: KeyStat[]
}

export interface InsightCards {
  meta: {
    generated: string
    data_vintage: string
    source: string
    audience: string[]
    qc_status: string
    fy2025_caution: string
  }
  sections: InsightSection[]
}

export interface Meta {
  _version: number
  generatedAt: string
  source: string
  dataVintage: string
  qcStatus: string
  fy2025Caution: string
  years: number[]
  latestYear: number
  institutes: string[]
  icOnly: string[]
  bands: string[]
}

export interface AppData {
  meta: Meta
  kpi: KpiSummary
  profiles: InstituteProfile[]
  trendEep: TrendEep
  paylineCurves: PaylineCurve[]
  bandLandscape: BandLandscape
  typology: TypologyData
  insights: InsightCards
}
