ALTER TABLE "LearningGoal"
ADD COLUMN "estimatedWeeks" INTEGER,
ADD COLUMN "startingPhasePosition" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
