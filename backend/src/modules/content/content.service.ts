import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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

  async getRoadmap(userId: string, role: UserRole) {
    const isAdmin = role === UserRole.ADMIN;
    const goal = await this.prisma.learningGoal.findUnique({ where: { userId } });
    const course = goal?.courseId
      ? await this.prisma.course.findUnique({
          where: { id: goal.courseId },
          include: {
            phases: {
              orderBy: { position: 'asc' },
              include: { lessons: { where: isAdmin ? undefined : { isPublished: true }, orderBy: { position: 'asc' } } },
            },
          },
        })
      : await this.prisma.course.findFirst({
          where: { isPublished: true },
          include: {
            phases: {
              orderBy: { position: 'asc' },
              include: { lessons: { where: isAdmin ? undefined : { isPublished: true }, orderBy: { position: 'asc' } } },
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
    const startingPhasePosition = goal?.startingPhasePosition ?? 1;
    const endingPhasePosition = goal?.endingPhasePosition ?? course.phases.length;
    const visiblePhases = isAdmin
      ? course.phases
      : course.phases.filter((phase) => phase.position <= endingPhasePosition);
    const plannedPhases = visiblePhases.filter((phase) => phase.position >= startingPhasePosition);
    const targetScore = goal?.targetScore ?? course.targetScore;
    const totalVisibleLessons = visiblePhases.reduce((total, phase) => total + phase.lessons.length, 0);
    const totalPlannedLessons = plannedPhases.reduce((total, phase) => total + phase.lessons.length, 0);
    const firstPlannedPhase = plannedPhases[0];
    const lastPlannedPhase = plannedPhases.at(-1);
    const roadmapTitle = isAdmin ? 'Kho nội dung TOEIC 450–800' : `Lộ trình TOEIC ${targetScore}`;
    const roadmapDescription = isAdmin
      ? `Toàn bộ ${course.phases.length} Phase và ${totalVisibleLessons} bài học dùng để quản trị, học thử và kiểm tra nội dung.`
      : `Lộ trình cá nhân từ Phase ${firstPlannedPhase?.position ?? 1} đến Phase ${lastPlannedPhase?.position ?? 1}, gồm ${totalPlannedLessons} ngày học trong khoảng ${goal?.estimatedWeeks ?? course.durationWeeks} tuần. Các Phase trước điểm đầu vào vẫn được mở để ôn lại.`;
    const orderedAvailableLessons = visiblePhases
      .filter((phase) => isAdmin || (phase.position >= startingPhasePosition && phase.position <= currentPhasePosition))
      .flatMap((phase) => phase.lessons);
    const nextUnlockedLessonId = isAdmin
      ? null
      : orderedAvailableLessons.find((lesson) => !completedLessonIds.has(lesson.id))?.id ?? null;
    return {
      ...course,
      title: roadmapTitle,
      description: roadmapDescription,
      durationWeeks: goal?.estimatedWeeks ?? course.durationWeeks,
      studyDaysPerWeek: goal?.studyDays?.length ?? 6,
      currentPhaseId: goal?.currentPhaseId,
      currentScore: goal?.currentScore ?? null,
      targetScore,
      startingPhasePosition,
      endingPhasePosition,
      targetTrack: goal?.targetTrack ?? 'MASTERY_800',
      goalAchievedAt: goal?.goalAchievedAt ?? null,
      lastCheckpointAt: goal?.lastCheckpointAt ?? null,
      phases: visiblePhases.map((phase) => ({
        ...phase,
        lessons: phase.lessons.map((lesson) => ({
          ...lesson,
          completed: completedLessonIds.has(lesson.id),
          unlocked: isAdmin
            || phase.position < startingPhasePosition
            || completedLessonIds.has(lesson.id)
            || lesson.id === nextUnlockedLessonId,
        })),
        completedLessons: phase.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length,
        checkpointSubmitted: masteryByPhase.has(phase.id),
        masteryAccuracy: masteryByPhase.get(phase.id) ?? null,
        unlocked: isAdmin || phase.position < startingPhasePosition || phase.position <= currentPhasePosition,
        skipped: phase.position < startingPhasePosition,
      })),
    };
  }

  async getLesson(userId: string, lessonId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { phase: { select: { id: true, title: true, position: true } } },
      });
      if (!lesson) throw new NotFoundException('Không tìm thấy bài học.');
      return { ...lesson, completed: false, unlocked: true };
    }
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: { currentPhase: { select: { position: true } } },
    });
    if (!goal?.courseId || !goal.currentPhase) throw new NotFoundException('Học viên chưa có lộ trình đang học.');
    const lessons = await this.prisma.lesson.findMany({
      where: {
        isPublished: true,
        phase: {
          courseId: goal.courseId,
          position: { lte: goal.endingPhasePosition },
        },
      },
      include: { phase: { select: { id: true, title: true, position: true } } },
      orderBy: [{ phase: { position: 'asc' } }, { position: 'asc' }],
    });
    const completedItems = await this.prisma.assignmentItem.findMany({
      where: {
        assignment: { userId },
        lessonId: { in: lessons.map((lesson) => lesson.id) },
        completedAt: { not: null },
      },
      distinct: ['lessonId'],
      select: { lessonId: true },
    });
    const completedLessonIds = new Set(completedItems.map((item) => item.lessonId));
    const lesson = lessons.find((item) => item.id === lessonId);
    const nextUnlockedLesson = lessons.find((item) =>
      item.phase.position >= goal.startingPhasePosition
      && item.phase.position <= goal.currentPhase!.position
      && !completedLessonIds.has(item.id));
    const completed = completedLessonIds.has(lessonId);
    const skipped = Boolean(lesson && lesson.phase.position < goal.startingPhasePosition);
    if (!lesson || (!skipped && !completed && lesson.id !== nextUnlockedLesson?.id)) {
      throw new NotFoundException('Bài này chưa được mở. Hãy hoàn thành bài ngay trước đó trước.');
    }
    return { ...lesson, completed, unlocked: true };
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
