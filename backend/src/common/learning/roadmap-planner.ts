export interface RoadmapPlan {
  estimatedWeeks: number;
  startingPhasePosition: number;
  endingPhasePosition: number;
  scoreGap: number;
  targetVocabularyCount: number;
  estimatedKnownVocabulary: number;
  vocabularyGap: number;
  newWordsPerDay: number;
  track: 'FOUNDATION_450' | 'CORE_600' | 'ADVANCED_700' | 'MASTERY_800';
}

export const TOEIC_TARGETS = [450, 600, 700, 800] as const;

const TARGET_CONFIG = {
  450: { endingPhasePosition: 2, track: 'FOUNDATION_450', vocabularyCount: 1500 },
  600: { endingPhasePosition: 4, track: 'CORE_600', vocabularyCount: 2500 },
  700: { endingPhasePosition: 5, track: 'ADVANCED_700', vocabularyCount: 4000 },
  800: { endingPhasePosition: 6, track: 'MASTERY_800', vocabularyCount: 5000 },
} as const;

function estimateKnownVocabulary(score: number): number {
  if (score <= 450) return Math.round((Math.max(0, score) / 450) * 1500);
  if (score <= 600) return Math.round(1500 + ((score - 450) / 150) * 1000);
  if (score <= 700) return Math.round(2500 + ((score - 600) / 100) * 1500);
  if (score <= 800) return Math.round(4000 + ((score - 700) / 100) * 1000);
  return 5000;
}

export function calculateRoadmapPlan(
  currentScore: number,
  targetScore: number,
  dailyMinutes: number,
  studyDaysPerWeek: number,
  requiredStudyDays = 0,
): RoadmapPlan {
  if (!TOEIC_TARGETS.includes(targetScore as (typeof TOEIC_TARGETS)[number])) {
    throw new Error('Mục tiêu TOEIC chỉ nhận một trong các mốc 450, 600, 700 hoặc 800.');
  }
  const scoreGap = targetScore - currentScore;
  const targetConfig = TARGET_CONFIG[targetScore as keyof typeof TARGET_CONFIG];
  const scoreBasedStartingPhase = currentScore < 450 ? 1 : currentScore < 600 ? 2 : currentScore < 700 ? 3 : currentScore < 780 ? 4 : 5;
  const startingPhasePosition = Math.min(scoreBasedStartingPhase, targetConfig.endingPhasePosition);
  const weeklyMinutes = Math.max(1, dailyMinutes * studyDaysPerWeek);
  const newWordsPerDay = dailyMinutes < 45 ? 15 : dailyMinutes < 90 ? 20 : 30;
  const estimatedKnownVocabulary = Math.min(targetConfig.vocabularyCount, estimateKnownVocabulary(currentScore));
  const vocabularyGap = Math.max(0, targetConfig.vocabularyCount - estimatedKnownVocabulary);
  const vocabularyWeeks = Math.ceil(vocabularyGap / Math.max(1, newWordsPerDay * studyDaysPerWeek));
  const curriculumWeeks = requiredStudyDays > 0
    ? Math.ceil((requiredStudyDays * 60) / weeklyMinutes)
    : Math.ceil((scoreGap <= 100 ? 8 : scoreGap <= 200 ? 14 : scoreGap <= 300 ? 20 : 24) * (360 / weeklyMinutes));
  const estimatedWeeks = Math.max(4, Math.min(52, Math.max(curriculumWeeks, vocabularyWeeks)));

  return {
    estimatedWeeks,
    startingPhasePosition,
    endingPhasePosition: targetConfig.endingPhasePosition,
    scoreGap,
    targetVocabularyCount: targetConfig.vocabularyCount,
    estimatedKnownVocabulary,
    vocabularyGap,
    newWordsPerDay,
    track: targetConfig.track,
  };
}
