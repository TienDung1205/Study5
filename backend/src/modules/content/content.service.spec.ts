import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from './content.service';

describe('ContentService admin lesson access', () => {
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

    await expect(service.getLesson('admin-1', 'lesson-1', UserRole.ADMIN)).resolves.toEqual(lesson);
    expect(prisma.lesson.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'lesson-1' } }));
    expect(prisma.learningGoal.findUnique).not.toHaveBeenCalled();
  });
});
