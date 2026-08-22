import { Injectable } from '@nestjs/common';
import { calculateNextReview } from '../../common/learning/spaced-repetition';
import { PrismaService } from '../../database/prisma.service';
import { RateFlashcardDto } from './dto/rate-flashcard.dto';

export interface VocabularyCardData {
  term: string;
  ipa: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
  partOfSpeech: string;
  rank: number;
  targetBand: number;
  audioText: string;
  exampleAudioText: string;
  audioUrl?: string;
  exampleAudioUrl?: string;
}

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

  async getDueCards(userId: string) {
    const reviews = await this.prisma.vocabularyReview.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      orderBy: [{ nextReviewAt: 'asc' }, { term: 'asc' }],
      take: 100,
    });
    if (!reviews.length) return [];

    const dueTerms = new Set(reviews.map((review) => review.term));
    const lessons = await this.prisma.lesson.findMany({
      where: { isPublished: true },
      select: { contentData: true },
    });
    const cardsByTerm = new Map<string, VocabularyCardData>();
    for (const lesson of lessons) {
      const contentData = lesson.contentData;
      if (!contentData || Array.isArray(contentData) || typeof contentData !== 'object') continue;
      const vocabulary = (contentData as { vocabulary?: unknown }).vocabulary;
      if (!Array.isArray(vocabulary)) continue;
      for (const value of vocabulary) {
        if (!value || typeof value !== 'object') continue;
        const card = value as VocabularyCardData;
        const term = typeof card.term === 'string' ? card.term.trim().toLowerCase() : '';
        if (dueTerms.has(term) && !cardsByTerm.has(term)) cardsByTerm.set(term, card);
      }
      if (cardsByTerm.size === dueTerms.size) break;
    }

    return reviews.flatMap((review) => {
      const card = cardsByTerm.get(review.term);
      return card ? [{ ...review, card }] : [];
    });
  }
}
