import { AssignmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService self-paced lesson', () => {
  it('creates one study reminder at the preferred local hour on a selected study day', async () => {
    const referenceTime = new Date('2026-08-24T13:00:00.000Z');
    const prisma = {
      learningGoal: {
        findMany: jest.fn().mockResolvedValue([{
          userId: 'learner-1',
          dailyMinutes: 45,
          preferredHour: 20,
          preferredMinute: 0,
          studyDays: [1, 2, 3, 4, 5],
          user: { timezone: 'Asia/Bangkok' },
        }]),
      },
      dailyAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;
    const service = new AssignmentsService(prisma, {} as GamificationService, {} as ContentService);

    await expect(service.createPreferredHourReminders(referenceTime)).resolves.toBe(1);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        userId: 'learner-1',
        title: 'Đến giờ học rồi',
        message: expect.stringContaining('tiếp tục học'),
      })],
    });
  });

  it('does not repeat a study reminder on the same local day', async () => {
    const referenceTime = new Date('2026-08-24T13:30:00.000Z');
    const prisma = {
      learningGoal: {
        findMany: jest.fn().mockResolvedValue([{
          userId: 'learner-1',
          dailyMinutes: 45,
          preferredHour: 20,
          preferredMinute: 30,
          studyDays: [1, 2, 3, 4, 5],
          user: { timezone: 'Asia/Bangkok' },
        }]),
      },
      dailyAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      notification: {
        findMany: jest.fn().mockResolvedValue([{
          userId: 'learner-1',
          createdAt: new Date('2026-08-24T13:01:00.000Z'),
        }]),
        createMany: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new AssignmentsService(prisma, {} as GamificationService, {} as ContentService);

    await expect(service.createPreferredHourReminders(referenceTime)).resolves.toBe(0);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('realigns an unstarted daily assignment when the learner starting phase changes', async () => {
    const scheduledDate = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const staleAssignment = {
      id: 'assignment-1',
      phaseId: 'phase-1',
      scheduledDate,
      planType: 'STANDARD',
      status: AssignmentStatus.AVAILABLE,
      completedAt: null,
      items: [{ id: 'old-item', startedAt: null, completedAt: null, studySessions: [] }],
    };
    const alignedAssignment = {
      ...staleAssignment,
      phaseId: 'phase-2',
      items: [{ id: 'new-item', lessonId: 'lesson-13', startedAt: null, completedAt: null, studySessions: [] }],
    };
    const prisma = {
      learningGoal: { findUnique: jest.fn().mockResolvedValue({ currentPhaseId: 'phase-2', dailyMinutes: 60 }) },
      lesson: { findMany: jest.fn().mockResolvedValue([{ id: 'lesson-13', title: 'Ngày 13', durationMinutes: 45, xpReward: 30 }]) },
      assignmentItem: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      dailyAssignment: {
        findUnique: jest.fn().mockResolvedValueOnce(staleAssignment).mockResolvedValueOnce(alignedAssignment),
        update: jest.fn().mockResolvedValue(alignedAssignment),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    } as unknown as PrismaService;
    const service = new AssignmentsService(prisma, {} as GamificationService, {} as ContentService);

    await expect(service.getToday('learner-1')).resolves.toEqual(alignedAssignment);
    expect(prisma.assignmentItem.deleteMany).toHaveBeenCalledWith({ where: { assignmentId: 'assignment-1' } });
    expect(prisma.dailyAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'assignment-1' },
      data: expect.objectContaining({ phaseId: 'phase-2', items: { create: [expect.objectContaining({ lessonId: 'lesson-13' })] } }),
    }));
  });

  it('adds the newly unlocked lesson once as an optional item', async () => {
    const scheduledDate = new Date('2026-08-22T00:00:00.000Z');
    const assignment = {
      id: 'assignment-1',
      scheduledDate,
      status: AssignmentStatus.COMPLETED,
      items: [],
    };
    const createdAssignment = {
      ...assignment,
      items: [{ id: 'item-2', lessonId: 'lesson-2', isRequired: false }],
    };
    const prisma = {
      assignmentItem: { create: jest.fn().mockResolvedValue(createdAssignment.items[0]) },
      dailyAssignment: { findUnique: jest.fn().mockResolvedValue(createdAssignment) },
    } as unknown as PrismaService;
    const gamification = {} as GamificationService;
    const contentService = {
      getLesson: jest.fn().mockResolvedValue({
        id: 'lesson-2',
        title: 'Bài 2',
        durationMinutes: 45,
        xpReward: 30,
      }),
    } as unknown as ContentService;
    const service = new AssignmentsService(prisma, gamification, contentService);
    jest.spyOn(service, 'getToday').mockResolvedValue(assignment as never);

    await expect(service.studyLessonNow('learner-1', UserRole.LEARNER, 'lesson-2')).resolves.toEqual(createdAssignment);
    expect(prisma.assignmentItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignmentId: 'assignment-1',
        lessonId: 'lesson-2',
        isRequired: false,
        position: 1,
      }),
    });
  });
});
