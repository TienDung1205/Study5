-- Add structured TOEIC checkpoint results for mastery reporting.
ALTER TABLE "ExternalSubmission"
ADD COLUMN "toeicPart" TEXT,
ADD COLUMN "totalQuestions" INTEGER,
ADD COLUMN "accuracy" DOUBLE PRECISION;
