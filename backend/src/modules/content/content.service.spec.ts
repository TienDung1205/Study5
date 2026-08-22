import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from './content.service';

describe('ContentService lesson access', () => {
  it('allows an admin to view a lesson without a learner goal', async () => {
    const lesson = {
      id: 'lesson-1',
      title: 'Admin preview',
      isPublished: false,
      phase: { id: 'phase-1', title: 'Phase 1', position: 1 },
    };
    const prisma = {
      lesson: { findUnique: jest.fn().mockResolvedValue(lesson) },
      learningGoal: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const service = new ContentService(prisma);

    await expect(service.getLesson('admin-1', 'lesson-1', UserRole.ADMIN)).resolves.toEqual({
      ...lesson,
      completed: false,
      unlocked: true,
    });
    expect(prisma.lesson.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'lesson-1' } }));
    expect(prisma.learningGoal.findUnique).not.toHaveBeenCalled();
  });

  it('allows completed lessons and only the first incomplete lesson for a learner', async () => {
    const lessons = [
      { id: 'lesson-1', position: 1, phase: { id: 'phase-1', title: 'Phase 1', position: 1 } },
      { id: 'lesson-2', position: 2, phase: { id: 'phase-1', title: 'Phase 1', position: 1 } },
      { id: 'lesson-3', position: 3, phase: { id: 'phase-1', title: 'Phase 1', position: 1 } },
    ];
    const prisma = {
      learningGoal: { findUnique: jest.fn().mockResolvedValue({
        courseId: 'course-1',
        currentPhase: { position: 1 },
        startingPhasePosition: 1,
        endingPhasePosition: 6,
      }) },
      lesson: { findMany: jest.fn().mockResolvedValue(lessons) },
      assignmentItem: { findMany: jest.fn().mockResolvedValue([{ lessonId: 'lesson-1' }]) },
    } as unknown as PrismaService;
    const service = new ContentService(prisma);

    await expect(service.getLesson('learner-1', 'lesson-1', UserRole.LEARNER)).resolves.toEqual({
      ...lessons[0],
      completed: true,
      unlocked: true,
    });
    await expect(service.getLesson('learner-1', 'lesson-2', UserRole.LEARNER)).resolves.toEqual({
      ...lessons[1],
      completed: false,
      unlocked: true,
    });
    await expect(service.getLesson('learner-1', 'lesson-3', UserRole.LEARNER)).rejects.toThrow(
      'Hãy hoàn thành bài ngay trước đó trước.',
    );
  });
});
