export interface Payline {
  Year: number
  Institute: string
  EEP80: number | null
  EEP50: number | null
  EEP20: number | null
  Opportunity_Width: number | null
  Beta0: number | null
  Beta1: number | null
  Pseudo_R2: number | null
  GLM_Converged: boolean
  N_Obs_Fit: number
  Model_Note: string | null
}

export interface BandSummary {
  Year: number
  Institute: string
  Percentile_Band: string
  Band_Lo: number
  Band_Hi: number
  Funded_Total: number
  Applications_Total: number
  Funding_Rate: number | null
  Band_Share_of_Apps: number | null
}

export interface ResubmissionOpp {
  Year: number
  Institute: string
  Transition: string
  From_Percentile: number
  To_Percentile: number
  Prob_From: number | null
  Prob_To: number | null
  Absolute_Gain: number | null
  Relative_Gain_Pct: number | null
}

export interface InstituteSummary {
  Year: number
  Institute: string
  Total_Applications: number
  Total_Funded: number
  Overall_Funding_Rate: number | null
  EEP80: number | null
  EEP50: number | null
  EEP20: number | null
  Opportunity_Width: number | null
  EEP50_YoY_Change: number | null
  Band_1_5_Rate: number | null
  Band_6_10_Rate: number | null
  Band_11_15_Rate: number | null
  Band_16_20_Rate: number | null
  Band_21_25_Rate: number | null
  Band_26plus_Rate: number | null
}

export interface KeyStat {
  label: string
  value: string
  note: string
}

export interface Section {
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
  sections: Section[]
}
