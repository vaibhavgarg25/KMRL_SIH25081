export type ID = string;

export interface Campaign {
  id: ID;
  name: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  budget?: number;
  exposureTargetHours?: number;   // total target
  exposureDailyQuota?: number;    // daily target
  notes?: string;
}

export interface TrainsetBranding {
  trainID: ID;
  trainname?: string;
  brandingActive: boolean;
  brandCampaignID?: ID | null;
  exposureHoursAccrued?: number;
  exposureHoursTarget?: number;
  exposureDailyQuota?: number;
  healthScore?: number; // 0..100 if you have it
}

export interface Weights {
  visibilityWeight: number;   // 0..1
  healthPenalty: number;      // 0..1
  diversityBonus: number;     // 0..1
}

export interface Constraints {
  minHealth?: number;                // %
  maxDailyQuota?: number;            // hours
  depotFairness?: boolean;
  blackoutDates?: string[];          // ISO[]
}

export interface Scenario {
  id: ID;
  name: string;
  campaignId: ID;
  weights: Weights;
  constraints: Constraints;
  notes?: string;
}

export interface AllocationResult {
  trainsets: TrainsetBranding[];
  totalForecastHours: number;
  expectedPacing: number; // %
}
