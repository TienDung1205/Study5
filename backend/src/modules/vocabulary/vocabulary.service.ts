import { Injectable } from '@nestjs/common';
import { calculateNextReview } from '../../common/learning/spaced-repetition';
import { PrismaService } from '../../database/prisma.service';
import { RateFlashcardDto } from './dto/rate-flashcard.dto';

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  async rateCard(userId: string, input: RateFlashcardDto) {
    const term = input.term.trim().toLowerCase();
    const existing = await this.prisma.vocabularyReview.findUnique({
      where: { userId_term: { userId, term } },
    });
    const schedule = calculateNextReview(existing, input.rating);
    const now = new Date();
    const nextReviewAt = new Date(now);
    nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + schedule.intervalDays);

    return this.prisma.vocabularyReview.upsert({
      where: { userId_term: { userId, term } },
      update: { rating: input.rating, ...schedule, nextReviewAt, lastReviewedAt: now },
      create: { userId, term, rating: input.rating, ...schedule, nextReviewAt, lastReviewedAt: now },
    });
  }

  getDueCards(userId: string) {
    return this.prisma.vocabularyReview.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      orderBy: [{ nextReviewAt: 'asc' }, { term: 'asc' }],
      take: 100,
    });
  }
}
