import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from './content.service';

describe('ContentService lesson access', () => {
  it('returns a roadmap title and description based on the learner goal', async () => {
    const phases = [
      { id: 'phase-1', position: 1, lessons: [{ id: 'lesson-1' }] },
      { id: 'phase-2', position: 2, lessons: [{ id: 'lesson-2' }, { id: 'lesson-3' }] },
      { id: 'phase-3', position: 3, lessons: [{ id: 'lesson-4' }] },
    ];
    const prisma = {
      learningGoal: { findUnique: jest.fn().mockResolvedValue({
        courseId: 'course-1',
        currentPhaseId: 'phase-2',
        currentScore: 450,
        targetScore: 600,
        startingPhasePosition: 2,
        endingPhasePosition: 3,
        targetTrack: 'CORE_600',
        estimatedWeeks: 18,
      }) },
      course: { findUnique: jest.fn().mockResolvedValue({
        id: 'course-1',
        title: 'Master course',
        description: 'Static description',
        targetScore: 800,
        durationWeeks: 34,
        phases,
      }) },
      assignmentItem: { groupBy: jest.fn().mockResolvedValue([]) },
      externalSubmission: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new ContentService(prisma);

    const roadmap = await service.getRoadmap('learner-1', UserRole.LEARNER);

    expect(roadmap.title).toBe('Lộ trình TOEIC 600');
    expect(roadmap.description).toContain('từ Phase 2 đến Phase 3');
    expect(roadmap.description).toContain('3 ngày học');
    expect(roadmap.phases).toHaveLength(3);
    expect(roadmap.phases[0]).toMatchObject({ id: 'phase-1', skipped: true, unlocked: true });
    expect(roadmap.phases[0].lessons[0]).toMatchObject({ id: 'lesson-1', unlocked: true });
    expect(roadmap.phases[1]).toMatchObject({ id: 'phase-2', skipped: false, unlocked: true });
  });

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
