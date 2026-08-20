import { FlashcardRating } from '@prisma/client';
import { calculateNextReview } from './spaced-repetition';

describe('spaced repetition', () => {
  it('schedules a forgotten card for tomorrow', () => {
    expect(calculateNextReview({ repetitions: 3, intervalDays: 12, easeFactor: 2.5 }, FlashcardRating.AGAIN)).toEqual({
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.3,
    });
  });

  it('gives an easy new card a four-day interval', () => {
    expect(calculateNextReview(null, FlashcardRating.EASY)).toEqual({
      repetitions: 1,
      intervalDays: 4,
      easeFactor: 2.65,
    });
  });
});
