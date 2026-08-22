import { PrismaService } from '../../database/prisma.service';
import { VocabularyService } from './vocabulary.service';

describe('VocabularyService due reviews', () => {
  it('returns complete flashcard data for a due term', async () => {
    const review = { id: 'review-1', term: 'appointment', nextReviewAt: new Date('2026-08-22') };
    const card = {
      term: 'appointment',
      ipa: '/əˈpɔɪntmənt/',
      meaning: 'cuộc hẹn',
      example: 'I have an appointment at nine.',
      exampleMeaning: 'Tôi có một cuộc hẹn lúc chín giờ.',
      partOfSpeech: 'noun',
      rank: 1,
      targetBand: 450,
      audioText: 'appointment',
      exampleAudioText: 'I have an appointment at nine.',
    };
    const prisma = {
      vocabularyReview: { findMany: jest.fn().mockResolvedValue([review]) },
      lesson: { findMany: jest.fn().mockResolvedValue([{ contentData: { vocabulary: [card] } }]) },
    } as unknown as PrismaService;
    const service = new VocabularyService(prisma);

    await expect(service.getDueCards('learner-1')).resolves.toEqual([{ ...review, card }]);
  });
});
