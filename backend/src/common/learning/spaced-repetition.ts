import { FlashcardRating } from '@prisma/client';

export interface ReviewState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export function calculateNextReview(current: ReviewState | null, rating: FlashcardRating): ReviewState {
  const previous = current ?? { repetitions: 0, intervalDays: 1, easeFactor: 2.5 };
  if (rating === FlashcardRating.AGAIN) {
    return { repetitions: 0, intervalDays: 1, easeFactor: Math.max(1.3, previous.easeFactor - 0.2) };
  }

  const repetitions = previous.repetitions + 1;
  if (rating === FlashcardRating.HARD) {
    return {
      repetitions,
      intervalDays: Math.max(1, Math.round(previous.intervalDays * 1.2)),
      easeFactor: Math.max(1.3, previous.easeFactor - 0.15),
    };
  }
  if (rating === FlashcardRating.EASY) {
    return {
      repetitions,
      intervalDays: previous.repetitions === 0 ? 4 : Math.max(4, Math.round(previous.intervalDays * previous.easeFactor * 1.3)),
      easeFactor: Math.min(3, previous.easeFactor + 0.15),
    };
  }
  return {
    repetitions,
    intervalDays: previous.repetitions === 0 ? 1 : previous.repetitions === 1 ? 3 : Math.max(3, Math.round(previous.intervalDays * previous.easeFactor)),
    easeFactor: previous.easeFactor,
  };
}
