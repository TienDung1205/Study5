import { Injectable, NotFoundException } from '@nestjs/common';
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
    const cardsByTerm = await this.getCardsByTerms(reviews.map((review) => review.term));
    return reviews.flatMap((review) => {
      const card = cardsByTerm.get(review.term);
      return card ? [{ ...review, card }] : [];
    });
  }

  async getDailyDeck(userId: string, assignmentId: string) {
    const [assignment, goal] = await Promise.all([
      this.prisma.dailyAssignment.findFirst({
        where: { id: assignmentId, userId },
        select: { id: true, newWordsLimit: true, vocabularyTerms: true },
      }),
      this.prisma.learningGoal.findUnique({
        where: { userId },
        select: {
          courseId: true,
          startingPhasePosition: true,
          endingPhasePosition: true,
          vocabularyPaceSetAt: true,
        },
      }),
    ]);
    if (!assignment) throw new NotFoundException('Không tìm thấy lịch học từ vựng của ngày này.');

    let vocabularyTerms = assignment.vocabularyTerms;
    if (!vocabularyTerms.length && goal?.courseId) {
      const [reviews, lessons] = await Promise.all([
        this.prisma.vocabularyReview.findMany({ where: { userId }, select: { term: true } }),
        this.prisma.lesson.findMany({
          where: {
            isPublished: true,
            phase: {
              courseId: goal.courseId,
              position: { gte: goal.startingPhasePosition, lte: goal.endingPhasePosition },
            },
          },
          select: { contentData: true },
          orderBy: [{ phase: { position: 'asc' } }, { position: 'asc' }],
        }),
      ]);
      const unavailableTerms = new Set(reviews.map((review) => review.term.trim().toLowerCase()));
      const selectedTerms: string[] = [];
      for (const lesson of lessons) {
        for (const card of this.readVocabularyCards(lesson.contentData)) {
          const term = card.term.trim().toLowerCase();
          if (!term || unavailableTerms.has(term)) continue;
          unavailableTerms.add(term);
          selectedTerms.push(term);
          if (selectedTerms.length >= assignment.newWordsLimit) break;
        }
        if (selectedTerms.length >= assignment.newWordsLimit) break;
      }
      vocabularyTerms = selectedTerms;
      await this.prisma.dailyAssignment.update({
        where: { id: assignment.id },
        data: { vocabularyTerms },
      });
    }

    const [dueCards, newCardsByTerm] = await Promise.all([
      this.getDueCards(userId),
      this.getCardsByTerms(vocabularyTerms),
    ]);
    return {
      dueCards,
      newCards: vocabularyTerms.flatMap((term) => {
        const card = newCardsByTerm.get(term);
        return card ? [card] : [];
      }),
      newWordsLimit: assignment.newWordsLimit,
      vocabularyPaceSet: Boolean(goal?.vocabularyPaceSetAt),
    };
  }

  private async getCardsByTerms(terms: string[]): Promise<Map<string, VocabularyCardData>> {
    const normalizedTerms = new Set(terms.map((term) => term.trim().toLowerCase()));
    if (!normalizedTerms.size) return new Map();
    const lessons = await this.prisma.lesson.findMany({
      where: { isPublished: true },
      select: { contentData: true },
    });
    const cardsByTerm = new Map<string, VocabularyCardData>();
    for (const lesson of lessons) {
      for (const card of this.readVocabularyCards(lesson.contentData)) {
        const term = typeof card.term === 'string' ? card.term.trim().toLowerCase() : '';
        if (normalizedTerms.has(term) && !cardsByTerm.has(term)) cardsByTerm.set(term, card);
      }
      if (cardsByTerm.size === normalizedTerms.size) break;
    }
    return cardsByTerm;
  }

  private readVocabularyCards(contentData: unknown): VocabularyCardData[] {
    if (!contentData || Array.isArray(contentData) || typeof contentData !== 'object') return [];
    const vocabulary = (contentData as { vocabulary?: unknown }).vocabulary;
    if (!Array.isArray(vocabulary)) return [];
    return vocabulary.filter((value): value is VocabularyCardData => Boolean(
      value
      && typeof value === 'object'
      && typeof (value as { term?: unknown }).term === 'string',
    ));
  }
}
