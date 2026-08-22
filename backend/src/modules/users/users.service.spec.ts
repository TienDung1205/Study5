import { PrismaService } from '../../database/prisma.service';
import { UsersService } from './users.service';

describe('UsersService learning goal settings', () => {
  it('rejects an exam date before the recalculated completion date', async () => {
    const prisma = {
      learningGoal: {
        findUnique: jest.fn().mockResolvedValue({
          currentScore: 450,
          targetScore: 800,
          dailyMinutes: 60,
          studyDays: [1, 2, 3, 4, 5, 6],
          newWordsPerDay: 10,
          examDate: null,
          examDateIsCustom: false,
          currentPhase: { position: 2 },
          course: { phases: [{ position: 2, durationDays: 48 }, { position: 3, durationDays: 20 }, { position: 4, durationDays: 20 }, { position: 5, durationDays: 60 }, { position: 6, durationDays: 40 }] },
        }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.updateLearningGoal('learner-1', { examDate: '2020-01-01' }))
      .rejects.toThrow('Ngày dự thi phải từ');
    expect(prisma.learningGoal.update).not.toHaveBeenCalled();
  });

  it('rejects an absurd exam year even when it is after completion', async () => {
    const prisma = {
      learningGoal: {
        findUnique: jest.fn().mockResolvedValue({
          currentScore: 450,
          targetScore: 800,
          dailyMinutes: 60,
          studyDays: [1, 2, 3, 4, 5, 6],
          newWordsPerDay: 10,
          examDate: null,
          examDateIsCustom: false,
          currentPhase: { position: 2 },
          course: { phases: [{ position: 2, durationDays: 48 }, { position: 3, durationDays: 20 }, { position: 4, durationDays: 20 }, { position: 5, durationDays: 60 }, { position: 6, durationDays: 40 }] },
        }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.updateLearningGoal('learner-1', { examDate: '222222-02-02' }))
      .rejects.toThrow('Ngày dự thi không hợp lệ');
    expect(prisma.learningGoal.update).not.toHaveBeenCalled();
  });

  it('rejects a calendar date that does not exist', async () => {
    const prisma = {
      learningGoal: {
        findUnique: jest.fn().mockResolvedValue({
          currentScore: 450,
          targetScore: 800,
          dailyMinutes: 60,
          studyDays: [1, 2, 3, 4, 5, 6],
          newWordsPerDay: 10,
          examDate: null,
          examDateIsCustom: false,
          currentPhase: { position: 2 },
          course: { phases: [{ position: 2, durationDays: 48 }, { position: 3, durationDays: 20 }, { position: 4, durationDays: 20 }, { position: 5, durationDays: 60 }, { position: 6, durationDays: 40 }] },
        }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.updateLearningGoal('learner-1', { examDate: '2028-02-30' }))
      .rejects.toThrow('Ngày dự thi không tồn tại');
    expect(prisma.learningGoal.update).not.toHaveBeenCalled();
  });

  it('updates the TOEIC target, accepts five study days and clears an optional exam date', async () => {
    const goal = {
      currentScore: 60,
      targetScore: 600,
      dailyMinutes: 60,
      studyDays: [1, 2, 3, 4, 5, 6],
      newWordsPerDay: 10,
      endingPhasePosition: 4,
      currentPhase: { position: 2 },
      course: {
        phases: [
          { position: 2, durationDays: 48 },
          { position: 3, durationDays: 20 },
          { position: 4, durationDays: 20 },
          { position: 5, durationDays: 60 },
          { position: 6, durationDays: 40 },
        ],
      },
    };
    const updatedGoal = { ...goal, targetScore: 700, studyDays: [1, 2, 3, 4, 5], examDate: null };
    const prisma = {
      learningGoal: {
        findUnique: jest.fn().mockResolvedValue(goal),
        update: jest.fn().mockResolvedValue(updatedGoal),
      },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.updateLearningGoal('learner-1', {
      targetScore: 700,
      studyDays: [1, 2, 3, 4, 5],
      examDate: null,
    })).resolves.toEqual(updatedGoal);
    expect(prisma.learningGoal.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'learner-1' },
      data: expect.objectContaining({
        targetScore: 700,
        endingPhasePosition: 5,
        targetTrack: 'ADVANCED_700',
        studyDays: [1, 2, 3, 4, 5],
        examDate: null,
        examDateIsCustom: false,
      }),
    }));
  });
});
