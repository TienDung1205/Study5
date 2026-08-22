import { AssignmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService self-paced lesson', () => {
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
