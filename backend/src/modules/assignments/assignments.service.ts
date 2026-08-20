import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus, NotificationType, PlanType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isStudyDay, MASTERY_THRESHOLD, MIN_TRACKED_STUDY_RATIO } from '../../common/learning/learning-rules';
import { GamificationService } from '../gamification/gamification.service';

const PLAN_MULTIPLIER: Record<PlanType, number> = {
  RECOVERY: 0.5,
  STANDARD: 1,
  ACCELERATED: 1.5,
};

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  async getToday(userId: string) {
    const today = this.startOfUtcDay(new Date());
    const existing = await this.findByDate(userId, today);
    return existing ?? this.generateForDate(userId, today, PlanType.STANDARD);
  }

  async generateToday(userId: string, planType: PlanType = PlanType.STANDARD) {
    return this.generateForDate(userId, this.startOfUtcDay(new Date()), planType);
  }

  async getNextStudyAssignment(userId: string, planType: PlanType = PlanType.STANDARD) {
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: { user: { select: { timezone: true } } },
    });
    if (!goal) throw new BadRequestException('Hãy thiết lập mục tiêu học tập trước.');
    const candidate = this.startOfUtcDay(new Date());
    for (let offset = 1; offset <= 7; offset += 1) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
      if (isStudyDay(candidate, goal.studyDays, goal.user.timezone)) {
        return this.generateForDate(userId, new Date(candidate), planType);
      }
    }
    throw new BadRequestException('Lịch học chưa có ngày học nào trong tuần.');
  }

  getRecent(userId: string) {
    const from = this.startOfUtcDay(new Date());
    from.setUTCDate(from.getUTCDate() - 30);
    return this.prisma.dailyAssignment.findMany({
      where: { userId, scheduledDate: { gte: from } },
      orderBy: { scheduledDate: 'desc' },
      take: 30,
      include: this.assignmentInclude,
    });
  }

  async selectPlan(userId: string, assignmentId: string, planType: PlanType) {
    const assignment = await this.findOwnedAssignment(userId, assignmentId);
    if (assignment.status === AssignmentStatus.EXCUSED) {
      throw new ConflictException('Không thể chọn kế hoạch cho ngày nghỉ.');
    }
    if (assignment.items.some((item) => item.startedAt || item.completedAt)) {
      throw new ConflictException('Không thể đổi kế hoạch sau khi đã bắt đầu học.');
    }
    await this.prisma.assignmentItem.deleteMany({ where: { assignmentId } });
    const items = await this.buildItems(userId, assignment.phaseId, planType);
    return this.prisma.dailyAssignment.update({
      where: { id: assignmentId },
      data: { planType, items: { create: items } },
      include: this.assignmentInclude,
    });
  }

  async startItem(userId: string, itemId: string) {
    const item = await this.findOwnedItem(userId, itemId);
    if (item.completedAt) return item;
    await this.prisma.dailyAssignment.update({
      where: { id: item.assignmentId },
      data: { status: AssignmentStatus.IN_PROGRESS },
    });
    return this.prisma.assignmentItem.update({
      where: { id: itemId },
      data: { startedAt: item.startedAt ?? new Date() },
      include: { lesson: true, externalResource: true },
    });
  }

  async addExternalResourceToToday(userId: string, resourceId: string) {
    const resource = await this.prisma.externalResource.findFirst({
      where: { id: resourceId, isActive: true },
    });
    if (!resource) throw new NotFoundException('Không tìm thấy nguồn luyện tập đang hoạt động.');

    const assignment = await this.getToday(userId);
    if (!assignment) throw new NotFoundException('Không thể tạo nhiệm vụ hôm nay.');
    if (assignment.completedAt) {
      throw new ConflictException('Nhiệm vụ hôm nay đã hoàn thành, không thể thêm bài luyện mới.');
    }
    if (assignment.status === AssignmentStatus.EXCUSED) {
      throw new ConflictException('Hôm nay là ngày nghỉ, không thể thêm bài luyện bắt buộc.');
    }
    const existingItem = assignment.items.find((item) => item.externalResourceId === resourceId);
    if (existingItem) return assignment;

    const position = assignment.items.reduce((highest, item) => Math.max(highest, item.position), 0) + 1;
    await this.prisma.assignmentItem.create({
      data: {
        assignmentId: assignment.id,
        externalResourceId: resource.id,
        title: resource.name,
        durationMinutes: resource.estimatedMinutes,
        xpReward: resource.resourceType === 'EXTERNAL_MOCK_TEST' ? 80 : 40,
        position,
        isRequired: true,
      },
    });
    return this.findByDate(userId, assignment.scheduledDate);
  }

  async completeItem(userId: string, itemId: string) {
    const item = await this.findOwnedItem(userId, itemId);
    if (item.completedAt) return this.finalizeAssignmentIfReady(userId, item.assignmentId);
    if (item.externalResourceId && !item.externalSubmission) {
      throw new BadRequestException('Hãy nộp kết quả bài làm bên ngoài trước khi hoàn thành nhiệm vụ.');
    }
    if (item.lessonId) {
      const trackedSeconds = item.studySessions.reduce((total, session) => total + session.durationSeconds, 0);
      const requiredSeconds = Math.ceil(item.durationMinutes * 60 * MIN_TRACKED_STUDY_RATIO);
      if (trackedSeconds < requiredSeconds) {
        const remainingMinutes = Math.ceil((requiredSeconds - trackedSeconds) / 60);
        throw new BadRequestException(`Cần ghi nhận thêm ít nhất ${remainingMinutes} phút học trước khi hoàn thành.`);
      }
      const lesson = await this.prisma.lesson.findUnique({ where: { id: item.lessonId }, select: { contentData: true } });
      const contentData = lesson?.contentData as { activities?: unknown[]; practice?: { questions?: unknown[] } } | null;
      const requiredActivities = contentData?.activities?.length ?? 0;
      const requiredQuestions = contentData?.practice?.questions?.length ?? 0;
      const [completedActivities, practiceAttempt] = await Promise.all([
        this.prisma.lessonActivityProgress.count({ where: { userId, lessonId: item.lessonId } }),
        requiredQuestions
          ? this.prisma.miniPracticeAttempt.findFirst({ where: { userId, lessonId: item.lessonId }, select: { id: true } })
          : Promise.resolve(null),
      ]);
      if (completedActivities < requiredActivities) {
        throw new BadRequestException(`Hãy hoàn thành đủ ${requiredActivities} bước trong kế hoạch học.`);
      }
      if (requiredQuestions && !practiceAttempt) {
        throw new BadRequestException('Hãy nộp mini practice trước khi hoàn thành bài học.');
      }
    }
    await this.prisma.assignmentItem.update({
      where: { id: itemId },
      data: { completedAt: new Date(), startedAt: item.startedAt ?? new Date() },
    });
    await this.gamification.awardXp(userId, item.xpReward, 'ASSIGNMENT_ITEM', itemId);
    return this.finalizeAssignmentIfReady(userId, item.assignmentId);
  }

  async reschedule(userId: string, assignmentId: string, scheduledDateValue: string) {
    const assignment = await this.findOwnedAssignment(userId, assignmentId);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new ConflictException('Nhiệm vụ đã hoàn thành không thể xếp lại.');
    }
    const scheduledDate = this.startOfUtcDay(new Date(scheduledDateValue));
    if (scheduledDate <= this.startOfUtcDay(new Date())) {
      throw new BadRequestException('Ngày học bù phải sau ngày hiện tại.');
    }
    const progress = await this.prisma.learnerProgress.findUnique({ where: { userId } });
    if (!progress || progress.recoveryTokens < 1) {
      throw new BadRequestException('Bạn không còn Vé trở lại để xếp lại nhiệm vụ.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.learnerProgress.update({
          where: { userId },
          data: { recoveryTokens: { decrement: 1 } },
        });
        return tx.dailyAssignment.update({
          where: { id: assignmentId },
          data: {
            scheduledDate,
            dueAt: this.endOfUtcDay(scheduledDate),
            status: AssignmentStatus.RESCHEDULED,
          },
          include: this.assignmentInclude,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ngày học bù đã có nhiệm vụ khác. Hãy chọn ngày khác.');
      }
      throw error;
    }
  }

  async startSession(userId: string, assignmentItemId?: string) {
    if (assignmentItemId) await this.findOwnedItem(userId, assignmentItemId);
    const openSession = await this.prisma.studySession.findFirst({
      where: { userId, assignmentItemId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (openSession) return openSession;
    return this.prisma.studySession.create({ data: { userId, assignmentItemId } });
  }

  async finishSession(userId: string, sessionId: string, durationSeconds: number) {
    const session = await this.prisma.studySession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên học.');
    return this.prisma.studySession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), durationSeconds },
    });
  }

  upsertJournal(userId: string, content: string, mood?: string) {
    const entryDate = this.startOfUtcDay(new Date());
    return this.prisma.learningJournal.upsert({
      where: { userId_entryDate: { userId, entryDate } },
      update: { content, mood },
      create: { userId, entryDate, content, mood },
    });
  }

  async markOverdueAssignments(): Promise<number> {
    const overdue = await this.prisma.dailyAssignment.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { in: [AssignmentStatus.SCHEDULED, AssignmentStatus.AVAILABLE, AssignmentStatus.IN_PROGRESS] },
      },
      select: { id: true, userId: true, scheduledDate: true },
    });
    if (!overdue.length) return 0;
    const result = await this.prisma.dailyAssignment.updateMany({
      where: { id: { in: overdue.map((assignment) => assignment.id) } },
      data: { status: AssignmentStatus.OVERDUE },
    });
    await this.prisma.notification.createMany({
      data: overdue.map((assignment) => ({
        userId: assignment.userId,
        type: NotificationType.DEADLINE,
        title: 'Nhiệm vụ đã quá hạn',
        message: `Nhiệm vụ ngày ${assignment.scheduledDate.toLocaleDateString('vi-VN')} đã quá hạn. Bạn có thể dùng Vé trở lại để xếp lịch học bù.`,
      })),
    });
    return result.count;
  }

  private async generateForDate(userId: string, date: Date, planType: PlanType) {
    const existing = await this.findByDate(userId, date);
    if (existing) return existing;
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: { user: { select: { timezone: true } } },
    });
    if (!goal?.currentPhaseId) throw new BadRequestException('Hãy thiết lập khóa học và Phase hiện tại.');
    if (!isStudyDay(date, goal.studyDays, goal.user.timezone)) {
      return this.createRestAssignment(userId, goal.currentPhaseId, date, planType);
    }
    const items = await this.buildItems(userId, goal.currentPhaseId, planType);
    if (!items.length) throw new NotFoundException('Phase hiện tại chưa có bài học được phát hành.');
    try {
      return await this.prisma.dailyAssignment.create({
        data: {
          userId,
          phaseId: goal.currentPhaseId,
          scheduledDate: date,
          dueAt: this.endOfUtcDay(date),
          planType,
          status: AssignmentStatus.AVAILABLE,
          items: { create: items },
        },
        include: this.assignmentInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.findByDate(userId, date);
      }
      throw error;
    }
  }

  private async buildItems(userId: string, phaseId: string | null, planType: PlanType) {
    if (!phaseId) return [];
    const goal = await this.prisma.learningGoal.findUnique({ where: { userId } });
    const dailyMinutes = goal?.dailyMinutes ?? 60;
    const limit = Math.max(20, Math.min(180, Math.round(dailyMinutes * PLAN_MULTIPLIER[planType])));
    const lessons = await this.prisma.lesson.findMany({
      where: { phaseId, isPublished: true },
      orderBy: { position: 'asc' },
    });
    const completedItems = await this.prisma.assignmentItem.findMany({
      where: { assignment: { userId }, lessonId: { in: lessons.map((lesson) => lesson.id) }, completedAt: { not: null } },
      select: { lessonId: true },
    });
    const completedIds = new Set(completedItems.map((item) => item.lessonId));
    const ordered = lessons.filter((lesson) => !completedIds.has(lesson.id));
    if (!ordered.length) {
      const checkpoint = await this.prisma.externalResource.findFirst({
        where: { isActive: true, resourceType: { in: ['EXTERNAL_PRACTICE', 'EXTERNAL_MOCK_TEST'] } },
        orderBy: [{ resourceType: 'desc' }, { createdAt: 'asc' }],
      });
      if (!checkpoint) return [];
      return [{
        externalResourceId: checkpoint.id,
        title: `Checkpoint · ${checkpoint.name}`,
        durationMinutes: checkpoint.estimatedMinutes,
        xpReward: checkpoint.resourceType === 'EXTERNAL_MOCK_TEST' ? 80 : 40,
        position: 1,
        isRequired: true,
      }];
    }
    const selected = [];
    let total = 0;
    for (const lesson of ordered) {
      if (total + lesson.durationMinutes <= limit || selected.length === 0) {
        selected.push(lesson);
        total += lesson.durationMinutes;
      }
      if (total >= limit) break;
    }
    return selected.map((lesson, index) => {
      const assignedMinutes = Math.min(lesson.durationMinutes, limit);
      return {
      lessonId: lesson.id,
      title: assignedMinutes < lesson.durationMinutes ? `${lesson.title} · Bản rút gọn` : lesson.title,
      durationMinutes: assignedMinutes,
      xpReward: Math.max(10, Math.round(lesson.xpReward * (assignedMinutes / lesson.durationMinutes))),
      position: index + 1,
      isRequired: true,
      };
    });
  }

  private async finalizeAssignmentIfReady(userId: string, assignmentId: string) {
    const assignment = await this.prisma.dailyAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: this.assignmentInclude,
    });
    const ready = assignment.items.filter((item) => item.isRequired).every((item) => item.completedAt);
    if (!ready || assignment.completedAt) return assignment;

    const completedAt = new Date();
    const completed = await this.prisma.dailyAssignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.COMPLETED, completedAt },
      include: this.assignmentInclude,
    });
    await this.gamification.awardXp(userId, 50, 'DAILY_WIN', assignmentId);
    await this.gamification.recordCompletedDay(userId, completedAt);
    if (completed.phaseId) await this.advancePhaseIfEligible(userId, completed.phaseId);
    return completed;
  }

  private async advancePhaseIfEligible(userId: string, phaseId: string): Promise<void> {
    const [goal, phase, completedLessons] = await Promise.all([
      this.prisma.learningGoal.findUnique({ where: { userId } }),
      this.prisma.phase.findUnique({
        where: { id: phaseId },
        include: { lessons: { where: { isPublished: true }, select: { id: true } } },
      }),
      this.prisma.assignmentItem.findMany({
        where: {
          assignment: { userId, phaseId },
          lessonId: { not: null },
          completedAt: { not: null },
        },
        distinct: ['lessonId'],
        select: { lessonId: true },
      }),
    ]);
    if (!goal || goal.currentPhaseId !== phaseId || !phase?.lessons.length) return;
    const completionRate = completedLessons.length / phase.lessons.length;
    if (completionRate < phase.requiredRate) return;

    if (phase.position > 1) {
      const masteredCheckpoint = await this.prisma.externalSubmission.findFirst({
        where: { userId, accuracy: { gte: MASTERY_THRESHOLD }, assignmentItem: { assignment: { phaseId } } },
        select: { id: true },
      });
      if (!masteredCheckpoint) return;
    }

    const nextPhase = await this.prisma.phase.findUnique({
      where: { courseId_position: { courseId: phase.courseId, position: phase.position + 1 } },
    });
    if (!nextPhase) return;
    await this.prisma.$transaction([
      this.prisma.learningGoal.update({ where: { userId }, data: { currentPhaseId: nextPhase.id } }),
      this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.ACHIEVEMENT,
          title: `Đã mở khóa Phase ${nextPhase.position}`,
          message: `Bạn đã đạt chuẩn Phase trước và có thể bắt đầu “${nextPhase.title}”.`,
        },
      }),
    ]);
    if (phase.position === 1) await this.gamification.awardBadge(userId, 'PHASE_ONE_FINISHER');
  }

  private findByDate(userId: string, date: Date) {
    return this.prisma.dailyAssignment.findUnique({
      where: { userId_scheduledDate: { userId, scheduledDate: date } },
      include: this.assignmentInclude,
    });
  }

  private async createRestAssignment(userId: string, phaseId: string, date: Date, planType: PlanType) {
    try {
      return await this.prisma.dailyAssignment.create({
        data: {
          userId,
          phaseId,
          scheduledDate: date,
          dueAt: this.endOfUtcDay(date),
          planType,
          status: AssignmentStatus.EXCUSED,
        },
        include: this.assignmentInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.findByDate(userId, date);
      }
      throw error;
    }
  }

  private async findOwnedAssignment(userId: string, assignmentId: string) {
    const assignment = await this.prisma.dailyAssignment.findFirst({
      where: { id: assignmentId, userId },
      include: this.assignmentInclude,
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy nhiệm vụ.');
    return assignment;
  }

  private async findOwnedItem(userId: string, itemId: string) {
    const item = await this.prisma.assignmentItem.findFirst({
      where: { id: itemId, assignment: { userId } },
      include: { externalSubmission: true, studySessions: { where: { endedAt: { not: null } } } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nội dung nhiệm vụ.');
    return item;
  }

  private startOfUtcDay(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  private endOfUtcDay(value: Date): Date {
    const result = this.startOfUtcDay(value);
    result.setUTCHours(23, 59, 59, 999);
    return result;
  }

  private readonly assignmentInclude = {
    phase: { select: { id: true, title: true, position: true } },
    items: {
      orderBy: { position: 'asc' as const },
      include: {
        lesson: true,
        externalResource: true,
        externalSubmission: true,
        studySessions: { where: { endedAt: { not: null } }, select: { id: true, durationSeconds: true } },
      },
    },
  };
}
