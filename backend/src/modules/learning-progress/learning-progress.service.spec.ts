import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from '../content/content.service';
import { LearningProgressService } from './learning-progress.service';

describe('LearningProgressService', () => {
  it('grades a mini practice on the server and stores the result details', async () => {
    const contentService = {
      getLesson: jest.fn().mockResolvedValue({
        id: 'lesson-1',
        contentData: {
          practice: {
            questions: [
              { prompt: 'Question 1', options: ['A', 'B'], correctOptionIndex: 1, explanation: 'B is stated.' },
              { prompt: 'Question 2', options: ['A', 'B'], correctOptionIndex: 0, explanation: 'A is stated.' },
            ],
          },
        },
      }),
    } as unknown as ContentService;
    const prisma = {
      miniPracticeAttempt: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'attempt-1', ...data })),
      },
    } as unknown as PrismaService;
    const service = new LearningProgressService(prisma, contentService);

    const result = await service.submitPractice('learner-1', UserRole.LEARNER, 'lesson-1', [1, 1]);

    expect(result.correctAnswers).toBe(1);
    expect(result.totalQuestions).toBe(2);
    expect(result.accuracy).toBe(0.5);
    expect(prisma.miniPracticeAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ selectedAnswers: [1, 1], correctAnswers: 1, totalQuestions: 2 }),
    }));
  });
});
