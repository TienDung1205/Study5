import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus, NotificationType, PlanType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
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

  async selectPlan(userId: string, assignmentId: string, planType: PlanType) {
    const assignment = await this.findOwnedAssignment(userId, assignmentId);
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
    if (item.externalResourceId && !item.externalSubmission) {
      throw new BadRequestException('Hãy nộp kết quả bài làm bên ngoài trước khi hoàn thành nhiệm vụ.');
    }
    if (!item.completedAt) {
      await this.prisma.assignmentItem.update({
        where: { id: itemId },
        data: { completedAt: new Date(), startedAt: item.startedAt ?? new Date() },
      });
      await this.gamification.awardXp(userId, item.xpReward, 'ASSIGNMENT_ITEM', itemId);
    }
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
    return this.prisma.$transaction(async (tx) => {
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
  }

  async startSession(userId: string, assignmentItemId?: string) {
    if (assignmentItemId) await this.findOwnedItem(userId, assignmentItemId);
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
    const result = await this.prisma.dailyAssignment.updateMany({
      where: {
        dueAt: { lt: new Date() },
        status: { in: [AssignmentStatus.SCHEDULED, AssignmentStatus.AVAILABLE, AssignmentStatus.IN_PROGRESS] },
      },
      data: { status: AssignmentStatus.OVERDUE },
    });
    return result.count;
  }

  private async generateForDate(userId: string, date: Date, planType: PlanType) {
    const existing = await this.findByDate(userId, date);
    if (existing) return existing;
    const goal = await this.prisma.learningGoal.findUnique({ where: { userId } });
    if (!goal?.currentPhaseId) throw new BadRequestException('Hãy thiết lập khóa học và Phase hiện tại.');
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
    const ordered = [...lessons.filter((lesson) => !completedIds.has(lesson.id)), ...lessons.filter((lesson) => completedIds.has(lesson.id))];
    const selected = [];
    let total = 0;
    for (const lesson of ordered) {
      if (total + lesson.durationMinutes <= limit || selected.length === 0) {
        selected.push(lesson);
        total += lesson.durationMinutes;
      }
      if (total >= limit) break;
    }
    return selected.map((lesson, index) => ({
      lessonId: lesson.id,
      title: lesson.title,
      durationMinutes: lesson.durationMinutes,
      xpReward: lesson.xpReward,
      position: index + 1,
      isRequired: true,
    }));
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
      const checkpointCount = await this.prisma.externalSubmission.count({
        where: { userId, assignmentItem: { assignment: { phaseId } } },
      });
      if (!checkpointCount) return;
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
  }

  private findByDate(userId: string, date: Date) {
    return this.prisma.dailyAssignment.findUnique({
      where: { userId_scheduledDate: { userId, scheduledDate: date } },
      include: this.assignmentInclude,
    });
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
      include: { externalSubmission: true },
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
      include: { lesson: true, externalResource: true, externalSubmission: true },
    },
  };
}
