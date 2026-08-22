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

  it('snapshots only unseen words up to the assignment limit', async () => {
    const knownCard = createCard('appointment');
    const firstNewCard = createCard('agenda');
    const secondNewCard = createCard('budget');
    const prisma = {
      dailyAssignment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'assignment-1', newWordsLimit: 2, vocabularyTerms: [] }),
        update: jest.fn().mockResolvedValue({}),
      },
      learningGoal: {
        findUnique: jest.fn().mockResolvedValue({
          courseId: 'course-1',
          startingPhasePosition: 1,
          endingPhasePosition: 6,
          vocabularyPaceSetAt: null,
        }),
      },
      vocabularyReview: {
        findMany: jest.fn()
          .mockResolvedValueOnce([{ term: knownCard.term }])
          .mockResolvedValueOnce([]),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue([{ contentData: { vocabulary: [knownCard, firstNewCard, secondNewCard] } }]),
      },
    } as unknown as PrismaService;
    const service = new VocabularyService(prisma);

    const deck = await service.getDailyDeck('learner-1', 'assignment-1');

    expect(deck.newCards.map((card) => card.term)).toEqual(['agenda', 'budget']);
    expect(deck.newWordsLimit).toBe(2);
    expect(deck.vocabularyPaceSet).toBe(false);
    expect(prisma.dailyAssignment.update).toHaveBeenCalledWith({
      where: { id: 'assignment-1' },
      data: { vocabularyTerms: ['agenda', 'budget'] },
    });
  });
});

function createCard(term: string) {
  return {
    term,
    ipa: `/${term}/`,
    meaning: `nghĩa ${term}`,
    example: `Example with ${term}.`,
    exampleMeaning: `Ví dụ với ${term}.`,
    partOfSpeech: 'noun',
    rank: 1,
    targetBand: 450,
    audioText: term,
    exampleAudioText: `Example with ${term}.`,
  };
}
