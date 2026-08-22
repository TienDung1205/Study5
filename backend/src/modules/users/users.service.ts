import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { calculateRoadmapPlan } from '../../common/learning/roadmap-planner';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateLearningGoalDto } from './dto/update-learning-goal.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        timezone: true,
        createdAt: true,
        learningGoal: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
            currentPhase: { select: { id: true, title: true, position: true } },
          },
        },
        progress: true,
        badges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
      },
    });
  }

  async updateLearningGoal(userId: string, input: UpdateLearningGoalDto) {
    const studyDays = input.studyDays ? [...new Set(input.studyDays)] : undefined;
    if (studyDays && (studyDays.length !== 6 || studyDays.some((day) => day < 0 || day > 6))) {
      throw new BadRequestException('Lộ trình yêu cầu đúng 6 ngày học khác nhau trong tuần.');
    }
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: { currentPhase: { select: { position: true } }, course: { include: { phases: true } } },
    });
    if (!goal?.course || !goal.currentPhase) throw new NotFoundException('Chưa có lộ trình để cập nhật.');
    const dailyMinutes = input.dailyMinutes ?? goal.dailyMinutes;
    const nextStudyDays = studyDays ?? goal.studyDays;
    const requiredStudyDays = goal.course.phases
      .filter((phase) => phase.position >= goal.currentPhase!.position && phase.position <= goal.endingPhasePosition)
      .reduce((total, phase) => total + phase.durationDays, 0);
    const plan = calculateRoadmapPlan(
      goal.currentScore ?? 0,
      goal.targetScore,
      dailyMinutes,
      nextStudyDays.length,
      requiredStudyDays,
    );
    return this.prisma.learningGoal.update({
      where: { userId },
      data: {
        ...input,
        studyDays,
        dailyMinutes,
        estimatedWeeks: plan.estimatedWeeks,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
      },
    });
  }

  async completeOnboarding(userId: string, input: CompleteOnboardingDto) {
    if (input.targetScore <= input.currentScore) {
      throw new BadRequestException('Điểm mục tiêu phải lớn hơn điểm hiện tại.');
    }
    const studyDays = [...new Set(input.studyDays)].sort();
    if (studyDays.length !== 6 || studyDays.some((day) => day < 0 || day > 6)) {
      throw new BadRequestException('Lộ trình yêu cầu đúng 6 ngày học khác nhau trong tuần.');
    }
    const course = await this.prisma.course.findFirst({
      where: { isPublished: true },
      include: { phases: { orderBy: { position: 'asc' } } },
    });
    if (!course?.phases.length) throw new NotFoundException('Chưa có lộ trình được phát hành.');

    const draftPlan = calculateRoadmapPlan(input.currentScore, input.targetScore, input.dailyMinutes, studyDays.length);
    const requiredStudyDays = course.phases
      .filter((phase) => phase.position >= draftPlan.startingPhasePosition && phase.position <= draftPlan.endingPhasePosition)
      .reduce((total, phase) => total + phase.durationDays, 0);
    const plan = calculateRoadmapPlan(input.currentScore, input.targetScore, input.dailyMinutes, studyDays.length, requiredStudyDays);
    const startingPhase = course.phases.find((phase) => phase.position === plan.startingPhasePosition) ?? course.phases[0];
    const endingPhase = course.phases.find((phase) => phase.position === plan.endingPhasePosition) ?? course.phases.at(-1)!;
    const suggestedExamDate = new Date();
    suggestedExamDate.setUTCDate(suggestedExamDate.getUTCDate() + plan.estimatedWeeks * 7);

    const learningGoal = await this.prisma.learningGoal.upsert({
      where: { userId },
      update: {
        courseId: course.id,
        currentPhaseId: startingPhase.id,
        currentScore: input.currentScore,
        targetScore: input.targetScore,
        dailyMinutes: input.dailyMinutes,
        studyDays,
        preferredHour: input.preferredHour ?? 20,
        examDate: input.examDate ? new Date(input.examDate) : suggestedExamDate,
        estimatedWeeks: plan.estimatedWeeks,
        startingPhasePosition: startingPhase.position,
        endingPhasePosition: endingPhase.position,
        targetTrack: plan.track,
        goalAchievedAt: null,
        lastCheckpointAt: null,
        onboardingCompletedAt: new Date(),
      },
      create: {
        userId,
        courseId: course.id,
        currentPhaseId: startingPhase.id,
        currentScore: input.currentScore,
        targetScore: input.targetScore,
        dailyMinutes: input.dailyMinutes,
        studyDays,
        preferredHour: input.preferredHour ?? 20,
        examDate: input.examDate ? new Date(input.examDate) : suggestedExamDate,
        estimatedWeeks: plan.estimatedWeeks,
        startingPhasePosition: startingPhase.position,
        endingPhasePosition: endingPhase.position,
        targetTrack: plan.track,
        onboardingCompletedAt: new Date(),
      },
      include: { currentPhase: true, course: true },
    });

    return {
      learningGoal,
      plan: {
        ...plan,
        startingPhaseTitle: startingPhase.title,
        endingPhaseTitle: endingPhase.title,
        suggestedExamDate: learningGoal.examDate,
        phases: course.phases
          .filter((phase) => phase.position >= startingPhase.position && phase.position <= endingPhase.position)
          .map((phase) => ({ position: phase.position, title: phase.title, durationDays: phase.durationDays })),
      },
    };
  }

  async upgradeLearningGoal(userId: string, targetScore: number) {
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: {
        currentPhase: { select: { id: true, position: true } },
        course: { include: { phases: { orderBy: { position: 'asc' } } } },
      },
    });
    if (!goal?.course || !goal.currentPhase) {
      throw new NotFoundException('Chưa có lộ trình để nâng mục tiêu.');
    }
    if (targetScore <= goal.targetScore) {
      throw new BadRequestException('Mục tiêu mới phải cao hơn mục tiêu hiện tại.');
    }

    const draftPlan = calculateRoadmapPlan(goal.currentScore ?? goal.targetScore, targetScore, goal.dailyMinutes, goal.studyDays.length);
    const requiredStudyDays = goal.course.phases
      .filter((phase) => phase.position >= goal.currentPhase!.position && phase.position <= draftPlan.endingPhasePosition)
      .reduce((total, phase) => total + phase.durationDays, 0);
    const plan = calculateRoadmapPlan(
      goal.currentScore ?? goal.targetScore,
      targetScore,
      goal.dailyMinutes,
      goal.studyDays.length,
      requiredStudyDays,
    );
    const endingPhase = goal.course.phases.find((phase) => phase.position === plan.endingPhasePosition);
    if (!endingPhase) throw new NotFoundException('Không tìm thấy Phase kết thúc tương ứng.');
    const suggestedExamDate = new Date();
    suggestedExamDate.setUTCDate(suggestedExamDate.getUTCDate() + plan.estimatedWeeks * 7);

    return this.prisma.learningGoal.update({
      where: { userId },
      data: {
        targetScore,
        targetTrack: plan.track,
        endingPhasePosition: endingPhase.position,
        estimatedWeeks: plan.estimatedWeeks,
        examDate: suggestedExamDate,
        goalAchievedAt: null,
      },
      include: { currentPhase: true, course: true },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        learningGoal: { select: { currentScore: true, targetScore: true } },
        progress: { select: { totalXp: true, streakCount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive, refreshTokenHash: isActive ? undefined : null },
      select: { id: true, email: true, displayName: true, isActive: true },
    });
  }
}
