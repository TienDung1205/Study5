export type PlanType = 'RECOVERY' | 'STANDARD' | 'ACCELERATED';
export interface LessonContentData {
  objective: string;
  theory: string[];
  vocabularyTopic: string;
  vocabulary: Array<{ term: string; ipa: string; meaning: string; example: string; exampleMeaning: string; partOfSpeech: string; rank: number; targetBand: 450 | 600 | 700 | 800; audioText: string; exampleAudioText: string; audioUrl?: string; exampleAudioUrl?: string }>;
  activities: Array<{ title: string; minutes: number; instructions: string[] }>;
  practice: {
    kind: 'LISTENING' | 'READING';
    title: string;
    material: string;
    audioUrl?: string;
    questions: Array<{ prompt: string; options: string[]; correctOptionIndex: number; explanation: string }>;
  };
  successCriteria: string[];
  sourceNote: string;
}
export interface Lesson { id: string; title: string; description?: string; skill: string; resourceType: string; content?: string; contentData?: LessonContentData; contentUrl?: string; durationMinutes: number; xpReward: number; position: number; completed?: boolean; unlocked?: boolean }
export interface ExternalResource { id: string; name: string; url: string; provider: string; resourceType: string; skill?: string; estimatedMinutes: number; requiresLogin: boolean; isActive: boolean }
export interface AssignmentItem { id: string; title: string; durationMinutes: number; xpReward: number; isRequired: boolean; position: number; startedAt?: string; completedAt?: string; lesson?: Lesson; externalResource?: ExternalResource; externalSubmission?: unknown; studySessions: Array<{ id: string; durationSeconds: number }> }
export interface DailyAssignment { id: string; scheduledDate: string; dueAt: string; planType: PlanType; newWordsLimit: number; vocabularyTerms: string[]; status: string; completedAt?: string; phase?: { id: string; title: string; position: number }; items: AssignmentItem[] }
export interface LearnerProfile { id: string; email: string; displayName: string; role: string; learningGoal?: { currentScore?: number; targetScore: number; examDate?: string; examDateIsCustom: boolean; dailyMinutes: number; newWordsPerDay: number; vocabularyPaceSetAt?: string; studyDays: number[]; preferredHour: number; preferredMinute: number; estimatedWeeks?: number; startingPhasePosition: number; endingPhasePosition: number; targetTrack: string; goalAchievedAt?: string; lastCheckpointAt?: string; onboardingCompletedAt?: string; course?: { id: string; title: string }; currentPhase?: { id: string; title: string; position: number } }; progress?: { totalXp: number; level: number; streakCount: number; longestStreak: number; recoveryTokens: number }; badges: Array<{ id: string; earnedAt: string; badge: { name: string; description: string; icon: string } }> }
export interface Roadmap { id: string; title: string; description?: string; durationWeeks: number; studyDaysPerWeek: number; currentPhaseId?: string; currentScore: number | null; targetScore: number; startingPhasePosition: number; endingPhasePosition: number; targetTrack: string; goalAchievedAt?: string; lastCheckpointAt?: string; phases: Array<{ id: string; title: string; description?: string; position: number; durationDays: number; requiredRate: number; completedLessons: number; checkpointSubmitted: boolean; masteryAccuracy: number | null; unlocked: boolean; skipped: boolean; lessons: Lesson[] }> }
export interface AiRecommendation { id: string; analysis: { strength: string; weakness: string; reason: string }; planOptions: Array<{ type: 'recovery' | 'standard' | 'accelerated'; title: string; totalMinutes: number; lessonIds: string[]; recommended: boolean }>; provider: string; usedFallback: boolean; selectedPlanType?: PlanType; createdAt: string }
export interface MiniPracticeResultDetail { questionIndex: number; selectedOptionIndex: number; correctOptionIndex: number; correct: boolean; explanation: string }
export interface MiniPracticeAttempt { id: string; selectedAnswers: number[]; correctAnswers: number; totalQuestions: number; accuracy: number; resultDetails: MiniPracticeResultDetail[]; submittedAt: string }
export interface LessonLearningProgress { completedActivityIndexes: number[]; latestPracticeAttempt?: MiniPracticeAttempt | null }
export interface DueVocabularyReview { id: string; term: string; nextReviewAt: string; lastReviewedAt: string; card: LessonContentData['vocabulary'][number] }
export interface DailyVocabularyDeck { dueCards: DueVocabularyReview[]; newCards: LessonContentData['vocabulary']; newWordsLimit: number; vocabularyPaceSet: boolean }
