import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, PlanType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { AiCoachService } from './ai-coach.service';
import { DailyRecommendation, PlanType as AiPlanType } from './ai-coach.types';
import { AiProviderService } from './ai-provider.service';
import { DailyAnalysisDto } from './dto/daily-analysis.dto';

@Injectable()
export class AiDailyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulePlanner: AiCoachService,
    private readonly aiProvider: AiProviderService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  async analyze(userId: string, input: DailyAnalysisDto) {
    const goal = await this.prisma.learningGoal.findUnique({ where: { userId } });
    if (!goal?.currentPhaseId) throw new BadRequestException('Học viên chưa có Phase hiện tại.');
    const assignment = await this.assignmentsService.getToday(userId);
    if (!assignment) throw new NotFoundException('Không tìm thấy nhiệm vụ hôm nay.');
    const latestSubmission = await this.prisma.externalSubmission.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    const lessons = await this.prisma.lesson.findMany({
      where: { phaseId: goal.currentPhaseId, isPublished: true },
      orderBy: { position: 'asc' },
    });
    const requiredItems = assignment.items.filter((item) => item.isRequired);
    const completedItems = requiredItems.filter((item) => item.completedAt);
    const request = {
      currentPhase: assignment.phase?.position ?? 1,
      targetScore: goal.targetScore,
      completionRate: requiredItems.length ? completedItems.length / requiredItems.length : 0,
      studyMinutes: completedItems.reduce((sum, item) => sum + item.durationMinutes, 0),
      weakParts: latestSubmission?.weakParts ?? [],
      mood: input.mood,
      tomorrowAvailableMinutes: input.tomorrowAvailableMinutes ?? goal.dailyMinutes,
      candidateLessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        durationMinutes: lesson.durationMinutes,
        skill: lesson.skill,
      })),
    };
    const aiResult = await this.aiProvider.generate(request);
    const recommendation = this.isValid(aiResult, request.candidateLessons.map((lesson) => lesson.id))
      ? { ...aiResult, usedFallback: false }
      : this.rulePlanner.createFallbackRecommendation(request);

    const stored = await this.prisma.aiRecommendation.create({
      data: {
        userId,
        analysis: recommendation.analysis,
        planOptions: JSON.parse(JSON.stringify(recommendation.plans)) as Prisma.InputJsonValue,
        provider: recommendation.usedFallback ? 'rule-engine' : 'third-party-api',
        usedFallback: recommendation.usedFallback,
      },
    });
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.PLAN_READY,
        title: 'Kế hoạch ngày học tiếp theo đã sẵn sàng',
        message: 'AI Coach đã tạo ba nhịp học. Hãy chọn phương án phù hợp với thời gian và năng lượng của bạn.',
      },
    });
    return stored;
  }

  latest(userId: string) {
    return this.prisma.aiRecommendation.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async select(userId: string, recommendationId: string, planType: PlanType) {
    const recommendation = await this.prisma.aiRecommendation.findFirst({
      where: { id: recommendationId, userId },
    });
    if (!recommendation) throw new NotFoundException('Không tìm thấy đề xuất AI.');
    const assignment = await this.assignmentsService.getNextStudyAssignment(userId);
    if (!assignment) throw new NotFoundException('Không tìm thấy ngày học tiếp theo.');
    const updatedAssignment = await this.assignmentsService.selectPlan(userId, assignment.id, planType);
    await this.prisma.aiRecommendation.update({
      where: { id: recommendationId },
      data: { selectedPlanType: planType },
    });
    return updatedAssignment;
  }

  private isValid(value: DailyRecommendation | null, allowedIds: string[]): value is DailyRecommendation {
    if (!value || !Array.isArray(value.plans) || value.plans.length !== 3) return false;
    const allowed = new Set(allowedIds);
    const requiredTypes = new Set<AiPlanType>(['recovery', 'standard', 'accelerated']);
    return value.plans.every(
      (plan) =>
        requiredTypes.delete(plan.type) &&
        Array.isArray(plan.lessonIds) &&
        plan.lessonIds.every((lessonId) => allowed.has(lessonId)) &&
        Number.isFinite(plan.totalMinutes),
    );
  }
}
