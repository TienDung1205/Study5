CREATE TABLE "LessonActivityProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "activityIndex" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonActivityProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiniPracticeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "selectedAnswers" INTEGER[],
    "correctAnswers" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "resultDetails" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MiniPracticeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonActivityProgress_userId_lessonId_activityIndex_key" ON "LessonActivityProgress"("userId", "lessonId", "activityIndex");
CREATE INDEX "LessonActivityProgress_userId_completedAt_idx" ON "LessonActivityProgress"("userId", "completedAt");
CREATE INDEX "MiniPracticeAttempt_userId_lessonId_submittedAt_idx" ON "MiniPracticeAttempt"("userId", "lessonId", "submittedAt");
CREATE INDEX "MiniPracticeAttempt_userId_submittedAt_idx" ON "MiniPracticeAttempt"("userId", "submittedAt");

ALTER TABLE "LessonActivityProgress" ADD CONSTRAINT "LessonActivityProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonActivityProgress" ADD CONSTRAINT "LessonActivityProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiniPracticeAttempt" ADD CONSTRAINT "MiniPracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiniPracticeAttempt" ADD CONSTRAINT "MiniPracticeAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
