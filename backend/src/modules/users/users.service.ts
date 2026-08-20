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
    if (studyDays?.some((day) => day < 0 || day > 6)) {
      throw new BadRequestException('Ngày học phải nằm trong khoảng 0-6.');
    }
    return this.prisma.learningGoal.upsert({
      where: { userId },
      update: {
        ...input,
        studyDays,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
      },
      create: {
        userId,
        ...input,
        studyDays,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
      },
    });
  }

  async completeOnboarding(userId: string, input: CompleteOnboardingDto) {
    if (input.targetScore <= input.currentScore) {
      throw new BadRequestException('Điểm mục tiêu phải lớn hơn điểm hiện tại.');
    }
    if (input.targetScore - input.currentScore < 50) {
      throw new BadRequestException('Mục tiêu nên cao hơn điểm hiện tại ít nhất 50 điểm để tạo lộ trình có ý nghĩa.');
    }
    const studyDays = [...new Set(input.studyDays)].sort();
    if (studyDays.some((day) => day < 0 || day > 6)) {
      throw new BadRequestException('Ngày học phải nằm trong khoảng 0-6.');
    }
    const course = await this.prisma.course.findFirst({
      where: { isPublished: true },
      include: { phases: { orderBy: { position: 'asc' } } },
    });
    if (!course?.phases.length) throw new NotFoundException('Chưa có lộ trình được phát hành.');

    const plan = calculateRoadmapPlan(input.currentScore, input.targetScore, input.dailyMinutes, studyDays.length);
    const startingPhase = course.phases.find((phase) => phase.position === plan.startingPhasePosition) ?? course.phases[0];
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
        onboardingCompletedAt: new Date(),
      },
      include: { currentPhase: true, course: true },
    });

    return {
      learningGoal,
      plan: {
        ...plan,
        startingPhaseTitle: startingPhase.title,
        suggestedExamDate: learningGoal.examDate,
        phases: course.phases
          .filter((phase) => phase.position >= startingPhase.position)
          .map((phase) => ({ position: phase.position, title: phase.title, durationDays: phase.durationDays })),
      },
    };
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
