import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreatePhaseDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdatePhaseDto,
} from './dto/content.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoadmap(userId: string) {
    const goal = await this.prisma.learningGoal.findUnique({ where: { userId } });
    const course = goal?.courseId
      ? await this.prisma.course.findUnique({
          where: { id: goal.courseId },
          include: {
            phases: {
              orderBy: { position: 'asc' },
              include: { lessons: { where: { isPublished: true }, orderBy: { position: 'asc' } } },
            },
          },
        })
      : await this.prisma.course.findFirst({
          where: { isPublished: true },
          include: {
            phases: {
              orderBy: { position: 'asc' },
              include: { lessons: { where: { isPublished: true }, orderBy: { position: 'asc' } } },
            },
          },
        });
    if (!course) throw new NotFoundException('Chưa có khóa học được phát hành.');

    const [completedByPhase, checkpointSubmissions] = await Promise.all([
      this.prisma.assignmentItem.groupBy({
        by: ['lessonId'],
        where: { assignment: { userId }, completedAt: { not: null }, lessonId: { not: null } },
        _count: { id: true },
      }),
      this.prisma.externalSubmission.findMany({
        where: { userId },
        select: { accuracy: true, assignmentItem: { select: { assignment: { select: { phaseId: true } } } } },
      }),
    ]);
    const completedLessonIds = new Set(completedByPhase.map((item) => item.lessonId));
    const masteryByPhase = new Map<string, number>();
    for (const submission of checkpointSubmissions) {
      const phaseId = submission.assignmentItem.assignment.phaseId;
      if (!phaseId || submission.accuracy === null) continue;
      masteryByPhase.set(phaseId, Math.max(masteryByPhase.get(phaseId) ?? 0, submission.accuracy));
    }
    const currentPhasePosition = course.phases.find((phase) => phase.id === goal?.currentPhaseId)?.position ?? 1;
    return {
      ...course,
      currentPhaseId: goal?.currentPhaseId,
      phases: course.phases.map((phase) => ({
        ...phase,
        lessons: phase.lessons.map((lesson) => ({
          ...lesson,
          completed: completedLessonIds.has(lesson.id),
        })),
        completedLessons: phase.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length,
        checkpointSubmitted: masteryByPhase.has(phase.id),
        masteryAccuracy: masteryByPhase.get(phase.id) ?? null,
        unlocked: phase.position <= currentPhasePosition,
      })),
    };
  }

  async getLesson(userId: string, lessonId: string) {
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: { currentPhase: { select: { position: true } } },
    });
    if (!goal?.courseId || !goal.currentPhase) throw new NotFoundException('Học viên chưa có lộ trình đang học.');
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        isPublished: true,
        phase: { courseId: goal.courseId, position: { lte: goal.currentPhase.position } },
      },
      include: { phase: { select: { id: true, title: true, position: true } } },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học hoặc bài chưa được mở.');
    return lesson;
  }

  listAdmin() {
    return this.prisma.course.findMany({
      include: { phases: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCourse(input: CreateCourseDto) {
    return this.prisma.course.create({ data: input });
  }

  updateCourse(id: string, input: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: input });
  }

  async deleteCourse(id: string) {
    const enrolledLearners = await this.prisma.learningGoal.count({ where: { courseId: id } });
    if (enrolledLearners) throw new ConflictException('Không thể xóa khóa đang có học viên. Hãy ẩn khóa thay vì xóa.');
    return this.prisma.course.delete({ where: { id } });
  }

  createPhase(input: CreatePhaseDto) {
    return this.prisma.phase.create({ data: input });
  }

  updatePhase(id: string, input: UpdatePhaseDto) {
    return this.prisma.phase.update({ where: { id }, data: input });
  }

  async deletePhase(id: string) {
    const [currentLearners, assignments] = await Promise.all([
      this.prisma.learningGoal.count({ where: { currentPhaseId: id } }),
      this.prisma.dailyAssignment.count({ where: { phaseId: id } }),
    ]);
    if (currentLearners || assignments) {
      throw new ConflictException('Không thể xóa Phase đã có tiến độ học. Hãy chỉnh sửa nội dung thay vì xóa.');
    }
    return this.prisma.phase.delete({ where: { id } });
  }

  createLesson(input: CreateLessonDto) {
    return this.prisma.lesson.create({ data: input });
  }

  updateLesson(id: string, input: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: input });
  }

  deleteLesson(id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }
}
