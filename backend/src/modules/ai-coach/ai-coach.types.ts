export type PlanType = 'recovery' | 'standard' | 'accelerated';

export interface DailyPlanOption {
  type: PlanType;
  title: string;
  totalMinutes: number;
  lessonIds: string[];
  recommended: boolean;
}

export interface DailyRecommendation {
  analysis: {
    strength: string;
    weakness: string;
    reason: string;
  };
  plans: DailyPlanOption[];
  usedFallback: boolean;
}

