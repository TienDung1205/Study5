import { Injectable, NotFoundException } from '@nestjs/common';
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
        select: { assignmentItem: { select: { assignment: { select: { phaseId: true } } } } },
      }),
    ]);
    const completedLessonIds = new Set(completedByPhase.map((item) => item.lessonId));
    const checkpointPhaseIds = new Set(checkpointSubmissions.map((item) => item.assignmentItem.assignment.phaseId));
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
        checkpointSubmitted: checkpointPhaseIds.has(phase.id),
        unlocked: phase.position <= currentPhasePosition,
      })),
    };
  }

  async getLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        isPublished: true,
        phase: { course: { learningGoals: { some: { userId } } } },
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

  createPhase(input: CreatePhaseDto) {
    return this.prisma.phase.create({ data: input });
  }

  updatePhase(id: string, input: UpdatePhaseDto) {
    return this.prisma.phase.update({ where: { id }, data: input });
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
