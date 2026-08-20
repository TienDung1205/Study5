export interface RoadmapPlan {
  estimatedWeeks: number;
  startingPhasePosition: number;
  scoreGap: number;
  track: 'FOUNDATION_450' | 'CORE_650' | 'ADVANCED_800';
}

export function calculateRoadmapPlan(
  currentScore: number,
  targetScore: number,
  dailyMinutes: number,
  studyDaysPerWeek: number,
): RoadmapPlan {
  const scoreGap = targetScore - currentScore;
  const startingPhasePosition = currentScore < 450 ? 1 : currentScore < 600 ? 2 : currentScore < 700 ? 3 : currentScore < 780 ? 4 : 5;
  const track = targetScore <= 450 ? 'FOUNDATION_450' : targetScore <= 650 ? 'CORE_650' : 'ADVANCED_800';
  const baseWeeks = scoreGap > 450 ? 36 : scoreGap > 300 ? 28 : scoreGap > 200 ? 22 : scoreGap > 100 ? 14 : 8;
  const weeklyMinutes = Math.max(1, dailyMinutes * studyDaysPerWeek);
  const paceFactor = 360 / weeklyMinutes;
  const estimatedWeeks = Math.max(6, Math.min(40, Math.ceil(baseWeeks * paceFactor)));

  return { estimatedWeeks, startingPhasePosition, scoreGap, track };
}
