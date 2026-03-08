export interface YearlyEEP {
  year: number;
  eep80: number | null;
  eep50: number | null;
  eep20: number | null;
  ow: number | null;
  overallRate: number | null;
  eep50YoY: number | null;
}

export interface BandRate {
  rate: number;
  total: number;
}

export interface BandRates {
  '1-5': BandRate;
  '6-10': BandRate;
  '11-15': BandRate;
  '16-20': BandRate;
  '21-25': BandRate;
  '26+': BandRate;
}

export interface ResubmissionGain {
  probFrom: number;
  probTo: number;
  absGain: number;
  relGainPct: number;
}

export interface InstituteProfile {
  institute: string;
  isAggregate: boolean;
  fy2025: {
    eep80: number | null;
    eep50: number | null;
    eep20: number | null;
    opportunityWidth: number | null;
    overallFundingRate: number;
    totalApplications: number;
    totalFunded: number;
    eep50YoYChange: number;
    pseudoR2: number;
    typologyQuadrant: string;
    typologyQuadrantLabel: string;
  };
  bandRates2025: BandRates;
  resubmission2025: {
    '20to15': ResubmissionGain;
    '18to12': ResubmissionGain;
    '15to10': ResubmissionGain;
    '12to8': ResubmissionGain;
  };
  history: YearlyEEP[];
}

export interface KPIHeadline {
  id: string;
  label: string;
  year: number | string;
  value: number;
  displayValue: string;
  unit: string;
  delta: number | null;
  deltaLabel: string | null;
  trend: 'up' | 'down' | 'stable';
  alert: boolean;
  context: string;
}

export interface TypologyInstitute {
  institute: string;
  eep80: number | null;
  eep50: number | null;
  eep20: number | null;
  opportunityWidth: number | null;
  overallFundingRate: number;
  totalApplications: number;
  eep50YoYChange: number;
  pseudoR2: number;
  typologyQuadrant: string;
  typologyQuadrantLabel: string;
  owIsNull: boolean;
}

export interface TypologyData {
  year: number;
  thresholds: { eep50Median: number; owMedian: number };
  quadrants: Record<string, { label: string; description: string; id: string; count: number; institutes: string[] }>;
  institutes: TypologyInstitute[];
}
